# Hearth OS — HomeOS Hackathon

A dual-sided marketplace for home maintenance.

## Team

| Person | Area | Packages |
|--------|------|---------|
| A | Infrastructure | `apps/api`, `packages/db`, `packages/graph`, `infra/` |
| B | Data + TinyFish | `packages/scraper`, `packages/pipeline` |
| C | Frontend | `apps/web` |

## Getting started

```bash
cp .env.example .env.local
npm install
npm run dev
```

For live contractor pricing, set `TINYFISH_API_KEY` in your shell or local env file, then run `npm run scrape`. To feed the results into Nexla Express, also set `NEXLA_WEBHOOK_URL` and `NEXLA_API_KEY`, then run `npm run pipeline`.

## Structure

```
apps/
  web/        Next.js + Mapbox frontend (Person C)
  api/        API server, InsForge-backed (Person A)
packages/
  db/         Database schema + migrations (Person A)
  graph/      WunderGraph federation config (Person A)
  scraper/    TinyFish scrape pipeline (Person B)
  pipeline/   Nexla Express pricing feed (Person B)
infra/        Docker, Chainguard image, Akash SDL (Person A)
```
