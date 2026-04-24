// Person B owns this file — Nexla Express feed into InsForge DB
// Ref: express.dev

import { scrapeContractorPricing } from "@hearth-os/scraper";
import type { PricingRate } from "@hearth-os/db";

export async function runPipeline() {
  console.log("Running Nexla pipeline...");
  const rates = await scrapeContractorPricing();
  await ingestToInsForge(rates);
  console.log(`Pipeline complete: ${rates.length} rates ingested`);
}

async function ingestToInsForge(rates: PricingRate[]) {
  const url = process.env.INSFORGE_API_URL;
  if (!url) {
    console.warn("INSFORGE_API_URL not set — skipping ingest, printing instead");
    console.log(JSON.stringify(rates.slice(0, 3), null, 2));
    return;
  }
  // TODO Person B: wire real Nexla Express connector here
  // POST to InsForge pricing_rates table
  await fetch(`${url}/pricing-rates/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rates),
  });
}

runPipeline();
