# @hearth-os/pipeline — Nexla Express pipeline (Person B)

Publishes contractor pricing scraped by `@hearth-os/scraper` into Nexla, then optionally forwards the same records to InsForge.

## Run

```bash
npm install
npm run pipeline
```

## Environment

```bash
TINYFISH_API_KEY=sk-tinyfish-...
NEXLA_WEBHOOK_URL=https://<your-nexla-webhook>
NEXLA_API_KEY=<your-nexla-resource-api-key>
INSFORGE_API_URL=https://<your-insforge-api>
```

If the Nexla webhook settings are present, the pipeline posts the scraped pricing array to Nexla. If the InsForge URL is present, it also sends the same payload to `/pricing-rates/bulk`.

If either destination is not configured, the pipeline skips it and keeps running.
