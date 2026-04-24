# @hearth-os/scraper — TinyFish pipeline (Person B)

Scrapes contractor pricing from Thumbtack, Angi, Yelp for SF.

## Run

```bash
npm install -g @tiny-fish/cli
tinyfish auth login
npm run scrape
```

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
