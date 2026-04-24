# Ship to Prod — HomeOS Hackathon Build Plan
**Team: 3 people | Time: 4 hours | Stack: WunderGraph + InsForge + Redis + TinyFish + Ghost + Chainguard**

---

## The Product
A dual-sided marketplace for home maintenance.

- **Homeowners** get an OS: a predictive maintenance timeline for their property, with evidence-based estimates of when each service will be needed
- **Service providers** get demand bundles: clusters of 1:1 contracts aggregated for geographic/schedule efficiency, with Shapley value discounting that preserves each homeowner's individual contract terms

**Demo centerpiece:** A Mapbox interface showing all qualifying SF residential properties (single family, ≤4 units), with toggles by service type and time period showing which properties have demand — and how bundles form in real time.

---

## Parallel Tracks — Start Simultaneously

### Person A — Infrastructure
| Time | Task |
|------|------|
| 0:00–0:30 | InsForge: `npx @insforge/cli link`, scaffold project, get DB + auth + deployment live. Paste starter prompt into Claude Code. |
| 0:30–1:00 | Ghost: spin up at `ghost.build`, load synthetic SF property data (homeowners, property type, maintenance line items with predicted need dates) |
| 1:00–1:45 | WunderGraph: `cosmo.wundergraph.com`, sign in with GitHub, create graph. Federate InsForge DB + Ghost + SF open parcel API into one unified MCP graph. Install `graphql-federation` and `cosmo-connect` Claude Code skills first. |
| 1:45–2:30 | Redis: add Agent Memory Server for homeowner session state + LangCache semantic caching on pricing queries |
| 2:30–3:30 | Integration + debugging across all layers |
| 3:30–4:00 | Vapi if ahead of schedule — otherwise support demo prep |

**Quick wins to not skip:**
- Swap base Docker image to Chainguard during InsForge setup (~15 min, satisfies their bounty)
- If InsForge deployment has friction, use Akash Console instead — Claude Code writes the SDL

---

### Person B — Data + TinyFish
| Time | Task |
|------|------|
| 0:00–0:30 | `npm install -g @tiny-fish/cli`, auth, test scrape on Thumbtack/Angi/Yelp for SF contractor pricing (gutters, HVAC, roof, plumbing) |
| 0:30–1:30 | Build pricing scrape pipeline: 3–5 service categories × SF neighborhoods → structured JSON of market rates per service per area |
| 1:30–2:30 | Nexla Express: pipe scraped pricing into a clean feed, wire to InsForge DB as the market rate baseline for Shapley discount calculations |
| 2:30–3:00 | Synthetic data generation for any gaps in SF property maintenance timeline data |
| 3:00–4:00 | Support Mapbox layer with data; help debug integrations |

**TinyFish scrape targets:**
- Thumbtack SF — gutter cleaning, HVAC service, roof inspection, plumbing
- Angi / HomeAdvisor — same services, cross-reference for pricing confidence
- Output: `{ service, neighborhood, price_low, price_high, price_median, source, scraped_at }`

---

### Person C — Frontend + Demo
| Time | Task |
|------|------|
| 0:00–0:30 | Scaffold frontend (Next.js via InsForge or standalone). Get Mapbox GL JS running with SF basemap. |
| 0:30–1:30 | SF parcel layer: load SF Assessor open dataset, filter to qualifying properties (residential, ≤4 units), render as highlighted polygons on map |
| 1:30–2:30 | Build toggles: service type selector + time slider (3-month increments into future) + bundle formation counter that updates as properties qualify |
| 2:30–3:30 | Homeowner OS view: single property drill-down showing maintenance timeline with urgency color coding (green/yellow/red by time horizon) |
| 3:30–4:00 | Polish + demo flow rehearsal |

**Fallback if SF parcel data takes too long:** Use synthetic property pins at real SF coordinates — visually identical for demo purposes, ships in 20 minutes.

---

## The Demo Script (2 minutes)

1. **Homeowner OS** → "Here's a SF homeowner's maintenance timeline — evidence-based predictions for the next 3 years, pulling from property age, manufacturer specs, and regional data"
2. **Zoom to SF map** → "Every qualifying residential property in the city — single family and small multifamily only"
3. **Toggle: gutters + Q4 2026** → properties light up → "147 properties need gutters this fall"
4. **Click cluster** → "Shapley-discounted price: $180/unit vs $260 market rate — verified by live contractor pricing scraped this morning via TinyFish"
5. ***(If Vapi)*** Play recorded call → "We called a real SF contractor this afternoon"

---

## Prize Stack

| Sponsor | Prize | What Satisfies It |
|---------|-------|-------------------|
| WunderGraph — Best Platform Use | $2,000 | Federated graph across InsForge + Ghost + parcel API as MCP backbone |
| WunderGraph — Best AI App/UX | $500 | Mapbox interface + clean demo quality |
| InsForge — 1st Place | $1,000 cash + $5k credits | Full-stack shipped app, provisioned via their platform |
| Redis — Best Agent | AirPods Pro + ~$10k credits | Memory server for homeowner state + semantic cache on pricing |
| Ghost — Top 5 | $500/person | Agent-isolated scratch DBs for pricing scrape data |
| TinyFish — Mac Mini | Mac Mini × 3 | Web agent scraping contractor quotes — showcase use case |
| Nexla | Cash + $5k credits | Express pipeline ingesting scraped pricing into structured feed |
| Akash | $500 credits | Deploy container there vs AWS |
| Chainguard | Swag/credits | Swap base image, mention in demo |

**Realistic cash floor: ~$5,000+ plus AirPods Pro, Mac Mini, and ~$30k in credits**

---

## Architecture Overview

```
SF Open Parcel Data ──┐
Ghost (synthetic DB) ──┼──► WunderGraph MCP Gateway ──► Agent / Claude
InsForge (app DB) ─────┘         │
                                  └──► Redis (cache + memory)
TinyFish (web scrape) ──► Nexla Express ──► InsForge DB
                                                │
                                           Mapbox UI (Next.js)
                                                │
                                          Vapi (outbound call)
```

---

## Key Resources

| Tool | URL / Command |
|------|---------------|
| WunderGraph docs | `cosmo-docs.wundergraph.com/router/mcp` |
| WunderGraph studio | `cosmo.wundergraph.com` |
| WunderGraph Claude skills | `github.com/wundergraph/graphql-federation-skill` |
| InsForge CLI | `npx @insforge/cli link --project-id <id>` |
| Ghost | `ghost.build` |
| TinyFish CLI | `npm install -g @tiny-fish/cli` then `tinyfish auth login` |
| TinyFish cookbook | `github.com/tinyfish-ai/tinyfish-cookbook` |
| Redis Memory Server | Redis Cloud — Agent Memory Server docs |
| Nexla Express | `express.dev` |
| SF Parcel Data | SF Open Data — Assessor dataset |
| Chainguard skill | `github.com/chainguardianbb/cgstart` |
| Akash Console | `console.akash.network` |
| Guild | `app.guild.ai` — code: `GUILD-EARLY-ACCESS` |

---

## Risk Register

| Risk | Mitigation |
|------|------------|
| SF parcel data loading slow | Switch to synthetic pins at real SF coordinates |
| WunderGraph + InsForge integration friction | InsForge owns app layer, WunderGraph federates above it — keep roles clean |
| TinyFish scrape blocked by anti-bot | Try Angi → Thumbtack → fall back to synthetic pricing with real neighborhood variance |
| Vapi call fails live | Pre-record earlier in the day, play back during demo |
| Not enough time for Mapbox polish | Prioritize data correctness over visual polish — functional toggles beat pretty non-functional ones |
