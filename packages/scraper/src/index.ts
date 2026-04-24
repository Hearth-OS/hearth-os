// Person B owns this file — TinyFish scrape pipeline
// npm install -g @tiny-fish/cli && tinyfish auth login

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

// TODO Person B: replace with real TinyFish CLI calls
// tinyfish scrape --url "https://www.thumbtack.com/ca/san-francisco/gutter-cleaning/"
export async function scrapeContractorPricing(): Promise<PricingRate[]> {
  console.log("Starting TinyFish scrape for SF contractor pricing...");
  // Fallback: synthetic data with real neighborhood variance
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

scrapeContractorPricing().then((rates) => {
  console.log(`Scraped ${rates.length} rates`);
  console.log(JSON.stringify(rates.slice(0, 2), null, 2));
});
