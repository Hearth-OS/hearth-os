// Person B owns this file — TinyFish scrape pipeline

import type { PricingRate, ServiceCategory } from "@hearth-os/db";

const SF_NEIGHBORHOODS = [
  "mission",
  "noe-valley",
  "sunset",
  "richmond",
  "soma",
  "castro",
];

const SERVICES: ServiceCategory[] = [
  "gutters",
  "hvac",
  "roof",
  "plumbing",
];

const TINYFISH_RUN_URL = "https://agent.tinyfish.ai/v1/automation/run";

type ScrapeTarget = {
  service: ServiceCategory;
  source: string;
  url: string;
};

type TinyFishRunResponse = {
  status?: string;
  result?: unknown;
  error?: {
    message?: string;
  };
};

const SCRAPE_TARGETS: ScrapeTarget[] = [
  {
    service: "gutters",
    source: "thumbtack",
    url: "https://www.thumbtack.com/ca/san-francisco/gutter-cleaning/",
  },
  {
    service: "hvac",
    source: "thumbtack",
    url: "https://www.thumbtack.com/ca/san-francisco/hvac-professionals/",
  },
  {
    service: "roof",
    source: "angi",
    url: "https://www.angi.com/companylist/san-francisco/roofing.htm",
  },
  {
    service: "plumbing",
    source: "yelp",
    url: "https://www.yelp.com/search?find_desc=Plumbers&find_loc=San+Francisco%2C+CA",
  },
];

export async function scrapeContractorPricing(): Promise<PricingRate[]> {
  console.log("Starting TinyFish scrape for SF contractor pricing...");

  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    console.warn("TINYFISH_API_KEY not set; using synthetic fallback rates.");
    return syntheticFallbackRates();
  }

  const liveRates = (
    await Promise.all(
      SCRAPE_TARGETS.map(async (target) => {
        try {
          const result = await runTinyFish(target, apiKey);
          return normalizeTinyFishRates(result, target);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.warn(
            `TinyFish scrape failed for ${target.service} (${target.source}): ${message}`
          );
          return [];
        }
      })
    )
  ).flat();

  if (liveRates.length > 0) {
    return liveRates;
  }

  console.warn("TinyFish returned no usable pricing data; using synthetic fallback rates.");
  return syntheticFallbackRates();
}

async function runTinyFish(target: ScrapeTarget, apiKey: string): Promise<unknown> {
  const response = await fetch(TINYFISH_RUN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({
      url: target.url,
      goal: [
        `Extract San Francisco ${target.service} pricing from this page.`,
        "Return JSON only.",
        "Use this exact shape:",
        '{ "rates": [{ "neighborhood": "mission", "priceLow": 120, "priceHigh": 300, "priceMedian": 210, "source": "thumbtack" }] }',
        "If the page does not provide neighborhood-level pricing, return one citywide row with neighborhood set to san-francisco.",
        "Only include rows where priceLow, priceHigh, and priceMedian are numeric values.",
      ].join(" "),
    }),
  });

  if (!response.ok) {
    throw new Error(`TinyFish HTTP ${response.status}`);
  }

  const data = (await response.json()) as TinyFishRunResponse;
  if (data.status !== "COMPLETED") {
    throw new Error(data.error?.message || `TinyFish run ended with status ${data.status}`);
  }

  return data.result;
}

function normalizeTinyFishRates(result: unknown, target: ScrapeTarget): PricingRate[] {
  const rates = extractRatesArray(result);
  return rates
    .map((candidate) => toPricingRate(candidate, target))
    .filter((rate): rate is PricingRate => rate !== null);
}

function extractRatesArray(result: unknown): unknown[] {
  if (Array.isArray(result)) {
    return result;
  }

  if (isRecord(result) && Array.isArray(result.rates)) {
    return result.rates;
  }

  return [];
}

function toPricingRate(candidate: unknown, target: ScrapeTarget): PricingRate | null {
  if (!isRecord(candidate)) {
    return null;
  }

  const priceLow = toNumber(candidate.priceLow);
  const priceHigh = toNumber(candidate.priceHigh);
  const computedMedian = Math.round((priceLow + priceHigh) / 2);
  const priceMedian = toNumber(candidate.priceMedian, computedMedian);

  if (priceLow <= 0 || priceHigh <= 0 || priceHigh < priceLow) {
    return null;
  }

  const neighborhood = toStringValue(candidate.neighborhood) || "san-francisco";
  const source = toStringValue(candidate.source) || target.source;

  return {
    service: target.service,
    neighborhood,
    priceLow,
    priceHigh,
    priceMedian,
    source,
    scrapedAt: new Date().toISOString(),
  };
}

function syntheticFallbackRates(): PricingRate[] {
  return SF_NEIGHBORHOODS.flatMap((neighborhood) =>
    SERVICES.map((service) => syntheticRate(service, neighborhood))
  );
}

function syntheticRate(service: ServiceCategory, neighborhood: string): PricingRate {
  const base: Record<ServiceCategory, [number, number]> = {
    gutters:    [140, 320],
    hvac:       [180, 450],
    roof:       [400, 1200],
    plumbing:   [200, 600],
    electrical: [250, 700],
    painting:   [800, 3000],
  };
  const [low, high] = base[service];
  return {
    service,
    neighborhood,
    priceLow: low,
    priceHigh: high,
    priceMedian: Math.round((low + high) / 2),
    source: "synthetic-fallback",
    scrapedAt: new Date().toISOString(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = Number(value.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(normalized)) {
      return normalized;
    }
  }

  return fallback;
}

function toStringValue(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

scrapeContractorPricing().then((rates) => {
  console.log(`Scraped ${rates.length} rates`);
  console.log(JSON.stringify(rates.slice(0, 2), null, 2));
});
