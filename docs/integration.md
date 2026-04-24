# Hearth OS — Integration Map

## How the three tracks connect

```
Person B (Data)                  Person A (Infrastructure)            Person C (Frontend)
────────────────                 ─────────────────────────            ───────────────────
TinyFish scrapes             →   pricing_rates table (InsForge)   →
Nexla pipeline                   REST + GraphQL API (:3001)        →   Mapbox map (Next.js)
                                 Redis cache (:6379)               →   Bundle counter
                                 WunderGraph router (:4000)        →   Agent queries
Ghost DB (TimescaleDB)       →   Property history / raw data
SF Open Data                 →   Parcel coordinates
```

---

## Person A → Person C

Everything Person C needs is served from `http://localhost:3001`.

### Endpoints Person C calls

| Endpoint | Returns | Used for |
|----------|---------|----------|
| `GET /api/properties` | Array of 55 SF properties with `lat`, `lng`, `neighborhood`, `property_type`, `units` | Mapbox polygon layer — one pin/polygon per property |
| `GET /api/properties/:id/timeline` | Array of maintenance items with `service`, `urgency` (`red`/`yellow`/`green`), `predicted_date`, `estimated_cost_low/high` | Single property drill-down view |
| `GET /api/bundles/open?service=gutters` | Bundles with `property_count`, `shapley_discount`, `cost_low/high` | Bundle counter on map toggle |
| `GET /api/pricing?service=hvac&neighborhood=Mission` | Market rate rows from B's scraper; response includes `X-Cache-Key: pricing:hvac:Mission` | "Verified by live pricing" + agent/LangCache dedup |
| `GET /api/agent/sessions/:id` | `{ state: object \| null }` from Redis (24h TTL) | Agent / homeowner session continuity |
| `PUT /api/agent/sessions/:id` | JSON body merged into `state` | Update agent context (e.g. last property, services of interest) |
| `DELETE /api/agent/sessions/:id` | 204 | Clear session |
| `POST /graphql` | Full GraphQL API | Agent / advanced queries |

### Shape of key responses

```json
// GET /api/properties
[{
  "id": "prop-001",
  "address": "742 Market St, San Francisco, CA",
  "neighborhood": "SOMA",
  "lat": 37.7749,
  "lng": -122.4194,
  "property_type": "single_family",
  "units": 1,
  "year_built": 1987
}]

// GET /api/bundles/open?service=gutters
[{
  "service": "gutters",
  "neighborhood": "Noe Valley",
  "property_count": 5,
  "cost_low": 150,
  "cost_high": 400,
  "shapley_discount": 0.08
}]

// GET /api/properties/prop-001/timeline
[{
  "service": "hvac",
  "urgency": "red",
  "predicted_date": "2026-06-24",
  "estimated_cost_low": 200,
  "estimated_cost_high": 600,
  "market_rate_median": null,       ← filled once B's pricing lands
  "shapley_discounted_rate": null   ← filled once bundle forms
}]
```

### GraphQL schema (for agent / advanced queries)

```graphql
query MapProperties {
  properties {
    id lat lng neighborhood property_type units
    maintenanceItems { service urgency predicted_date }
  }
}

query BundlesByService($service: String!) {
  bundles(service: $service) {
    neighborhood property_count shapley_discount cost_low cost_high
  }
}
```

**CORS is enabled** — C can call these from localhost:3000 with no config.

---

## Person B → Person A

B inserts directly into the `pricing_rates` table in InsForge (same `DATABASE_URL`).

### Schema B must match

```sql
INSERT INTO pricing_rates (service, neighborhood, price_low, price_high, price_median, source, scraped_at)
VALUES ('hvac', 'Mission', 180, 420, 290, 'thumbtack', NOW());
```

| Column | Type | Notes |
|--------|------|-------|
| `service` | TEXT | One of: `gutters`, `hvac`, `roof`, `plumbing`, `electrical` |
| `neighborhood` | TEXT | One of: `Mission`, `Castro`, `Richmond`, `Sunset`, `SOMA`, `Noe Valley` |
| `price_low` | FLOAT | Lowest quote found |
| `price_high` | FLOAT | Highest quote found |
| `price_median` | FLOAT | Median — this is what the demo shows |
| `source` | TEXT | `thumbtack`, `angi`, `yelp`, or `synthetic` |
| `scraped_at` | TIMESTAMPTZ | When scraped — defaults to `NOW()` |

B does NOT need to call any API endpoint. Direct Postgres insert is fine.
`DATABASE_URL` = InsForge connection string (share from `.env`).

### What happens after B inserts

- `GET /api/pricing?service=hvac&neighborhood=Mission` immediately returns the new rows
- Redis cache is keyed per service+neighborhood — cache is bypassed on first call after insert
- The demo line "verified by live contractor pricing scraped this morning via TinyFish" uses this data

---

## Ghost DB → Person A (data enrichment)

Ghost (TimescaleDB at `GHOST_DATABASE_URL`) holds:
- `sf_properties` — 25 raw SF property records with `roof_age_years`, `hvac_age_years`
- `property_events` — time-series hypertable of asset events (installed, serviced, replaced)

This data feeds the `ghostProperties` GraphQL type and enriches the InsForge `maintenance_items`
with real asset age data (roof 18 years old → roof urgency escalated to red).

---

## WunderGraph Router (localhost:4000)

The router federates the API's GraphQL endpoint. It is Person A's responsibility to keep running.

```
Agent / Claude  →  localhost:4000/graphql  →  localhost:3001/graphql  →  InsForge DB + Ghost DB
```

Run with Docker:
```bash
docker run --rm -p 4000:4000 \
  -v $(pwd)/packages/graph:/config \
  ghcr.io/wundergraph/cosmo/router:latest \
  --config=/config/router.yaml
```

---

## Demo flow (Person A's data at each step)

| Demo step | Data source |
|-----------|-------------|
| "Here's a SF homeowner's maintenance timeline" | `GET /api/properties/prop-001/timeline` |
| "Every qualifying residential property in the city" | `GET /api/properties` → 55 pins on Mapbox |
| "Toggle: gutters + Q4 2026" → properties light up | `GET /api/bundles/open?service=gutters` |
| "147 properties need gutters this fall" | `property_count` sum across neighborhoods |
| "Shapley-discounted price: $180/unit vs $260 market rate" | `shapley_discount` + `GET /api/pricing?service=gutters` |
| "Verified by live contractor pricing via TinyFish" | `pricing_rates` rows (B's data) |
