// Person B owns this file — Nexla Express feed into InsForge DB

import { scrapeContractorPricing } from "@hearth-os/scraper";
import type { PricingRate } from "@hearth-os/db";

export async function runPipeline() {
  console.log("Running Nexla pipeline...");
  const rates = await scrapeContractorPricing();
  const nexlaResult = await publishToNexla(rates);
  const insforgeResult = await ingestToInsForge(rates);
  console.log(
    `Pipeline complete: ${rates.length} rates processed` +
      formatOutcome("Nexla", nexlaResult) +
      formatOutcome("InsForge", insforgeResult)
  );
}

async function publishToNexla(rates: PricingRate[]): Promise<boolean> {
  const webhookUrl = process.env.NEXLA_WEBHOOK_URL;
  const apiKey = process.env.NEXLA_API_KEY;

  if (!webhookUrl || !apiKey) {
    console.warn("NEXLA_WEBHOOK_URL or NEXLA_API_KEY not set — skipping Nexla publish");
    return false;
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${apiKey}`,
    },
    body: JSON.stringify(rates),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Nexla publish failed (${response.status}): ${body}`);
  }

  console.log(`Published ${rates.length} rates to Nexla`);
  return true;
}

async function ingestToInsForge(rates: PricingRate[]): Promise<boolean> {
  const url = process.env.INSFORGE_API_URL;
  if (!url) {
    console.warn("INSFORGE_API_URL not set — skipping ingest, printing instead");
    console.log(JSON.stringify(rates.slice(0, 3), null, 2));
    return false;
  }

  const response = await fetch(`${url}/pricing-rates/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rates),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`InsForge ingest failed (${response.status}): ${body}`);
  }

  return true;
}

function formatOutcome(target: string, completed: boolean): string {
  return completed ? `, ${target}: ok` : `, ${target}: skipped`;
}

runPipeline();
