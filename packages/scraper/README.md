# @hearth-os/scraper — TinyFish pipeline (Person B)

Scrapes contractor pricing from Thumbtack, Angi, Yelp for SF.

## Run

```bash
export TINYFISH_API_KEY=sk-tinyfish-...
npm install
npm run scrape
```

The scraper now calls the TinyFish Agent API directly. If `TINYFISH_API_KEY` is missing or TinyFish does not return usable rows, it falls back to the synthetic neighborhood dataset so the rest of the pipeline still runs.

## Output shape

```ts
{
  service: "gutters" | "hvac" | "roof" | "plumbing",
  neighborhood: string,
  priceLow: number,
  priceHigh: number,
  priceMedian: number,
  source: string,
  scrapedAt: string,
}
```

## Targets

- Thumbtack SF — gutter cleaning, HVAC, roof, plumbing
- Angi / HomeAdvisor — same services for cross-reference
- Fallback: synthetic rates with real neighborhood variance
