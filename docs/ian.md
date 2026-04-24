# HEARTH — Portable Architecture Reference
### Derived from prior scoping work. Use this to inform the build.

---

## The Core Idea (Keep This Sharp)

HEARTH is a dual-facing marketplace for home maintenance goods and services.

**For homeowners:** An operating system for the home. Tracks every asset, predicts when repair and replacement is needed, and handles the contracting automatically.

**For service providers:** Access to bundled demand packets — pre-qualified, geographically clustered groups of homeowners needing the same service in the same window. One-to-one contracts are preserved, so providers still deliver personalized service.

**The business model insight worth protecting:**
> Adequate demand bundles unlock per-unit discounts for homeowners. Because the underlying contract remains 1-to-1, personalization is not sacrificed. The bundle is a procurement mechanism, not a group-buy.

This is the moat. Everything else serves it.

---

## Dual-Facing Architecture Pattern

From ARIA: a manager view and a user view built as distinct experiences on the same data layer. Apply directly here.

```
Same backend. Same data. Two completely different interfaces.

[ Homeowner OS ]         ←→        [ Service Provider Portal ]
- Asset dashboard                  - Demand bundle inbox
- Predictive timelines             - Contract management
- Service requests                 - Pricing + availability
- Contract history                 - Bundle acceptance
- Payment management               - Job completion log
```

**Key principle:** Neither side should feel like a watered-down version of the other. Each is a first-class product designed for its user's mental model.

The homeowner thinks in terms of their home. The service provider thinks in terms of jobs, geography, and revenue.

---

## Agent-as-Orchestrator Pattern

From ARIA: the agent was the core intelligence — it received a trigger, made decisions, and coordinated all downstream actions autonomously.

HEARTH needs the same pattern:

```
[ Trigger ]  →  [ HEARTH Agent ]  →  [ Coordinated Actions ]

Triggers:
- Homeowner logs an asset (new water heater installed)
- Predictive model flags upcoming service window
- Homeowner accepts a service recommendation
- Enough demand accumulates in a category + geography

Agent decisions:
- Is there enough demand to form a bundle?
- Which service providers qualify for this bundle?
- What discount tier does this bundle unlock?
- Is the homeowner's contract ready to execute?

Coordinated actions:
- Notify qualifying service providers of bundle
- Lock in homeowner pricing
- Generate 1-to-1 contracts
- Trigger payment deposit / escrow
- Update homeowner's predictive timeline
```

**This is your autonomy story.** The homeowner doesn't manage the procurement. The agent does.

---

## Synthetic Data Schema (Adapt from ARIA)

ARIA used buildings, users, and emergency types. HEARTH needs:

### homes.json
```json
{
  "id": "home-001",
  "address": "742 Evergreen Terrace, Springfield, IL",
  "type": "single-family",
  "yearBuilt": 1998,
  "squareFootage": 2100,
  "ownerId": "owner-001",
  "assets": [
    {
      "id": "asset-001",
      "category": "hvac",
      "name": "Central Air Unit",
      "brand": "Carrier",
      "modelNumber": "24ACC636A003",
      "installedDate": "2015-06-12",
      "expectedLifespanYears": 15,
      "lastServiceDate": "2023-04-01",
      "serviceIntervalMonths": 12,
      "warrantyExpires": "2025-06-12",
      "replacementEstimate": 4200
    },
    {
      "id": "asset-002",
      "category": "water-heater",
      "name": "Gas Water Heater",
      "brand": "Rheem",
      "installedDate": "2018-03-20",
      "expectedLifespanYears": 12,
      "lastServiceDate": null,
      "serviceIntervalMonths": 12,
      "replacementEstimate": 1100
    }
  ]
}
```

### service-categories.json
```json
[
  {
    "id": "hvac",
    "label": "HVAC",
    "subcategories": ["tune-up", "repair", "replacement", "duct-cleaning"],
    "averageJobValue": 350,
    "seasonalPeak": ["spring", "fall"],
    "minimumBundleSize": 5,
    "discountTiers": [
      { "minUnits": 5, "discount": 0.08 },
      { "minUnits": 10, "discount": 0.14 },
      { "minUnits": 20, "discount": 0.20 }
    ]
  },
  {
    "id": "roofing",
    "label": "Roofing",
    "subcategories": ["inspection", "repair", "replacement", "gutters"],
    "averageJobValue": 850,
    "seasonalPeak": ["summer"],
    "minimumBundleSize": 3,
    "discountTiers": [
      { "minUnits": 3, "discount": 0.07 },
      { "minUnits": 8, "discount": 0.12 }
    ]
  },
  {
    "id": "plumbing",
    "label": "Plumbing",
    "subcategories": ["inspection", "repair", "water-heater", "drain-cleaning"],
    "averageJobValue": 280,
    "seasonalPeak": ["winter"],
    "minimumBundleSize": 4,
    "discountTiers": [
      { "minUnits": 4, "discount": 0.07 },
      { "minUnits": 10, "discount": 0.13 }
    ]
  },
  {
    "id": "electrical",
    "label": "Electrical",
    "subcategories": ["inspection", "panel-upgrade", "outlet-repair", "ev-charger"],
    "averageJobValue": 420,
    "seasonalPeak": [],
    "minimumBundleSize": 4,
    "discountTiers": [
      { "minUnits": 4, "discount": 0.08 },
      { "minUnits": 12, "discount": 0.15 }
    ]
  }
]
```

### service-providers.json
```json
{
  "id": "provider-001",
  "businessName": "CoolFlow HVAC",
  "category": "hvac",
  "subcategories": ["tune-up", "repair", "replacement"],
  "serviceRadius": 25,
  "baseLocation": { "lat": 39.7817, "lng": -89.6501 },
  "licenseNumber": "IL-HVAC-88234",
  "rating": 4.8,
  "reviewCount": 142,
  "maxBundleCapacity": 15,
  "preferredBundleSize": 8,
  "availabilityWindows": ["weekday-morning", "weekend"],
  "pricingModel": "per-unit-discounted",
  "stripeAccountId": "acct_abc123",
  "bundlesAccepted": 12,
  "bundlesCompleted": 11
}
```

### predictive-timelines.json
Derived data — generated by the agent per home based on asset installed dates, lifespans, and service intervals. Not stored as static JSON; computed and cached.

---

## Tiered User Model

From ARIA: free users got basic guidance, paid users got agent-handled priority service.

Apply to both sides of HEARTH:

### Homeowner Tiers
| Tier | Features |
|---|---|
| **Free** | Asset tracker (up to 5 assets), basic service reminders |
| **Standard** | Unlimited assets, predictive timelines, access to bundles |
| **Premium** | Agent handles all contracting, priority bundle access, warranty tracking, dedicated support |

### Service Provider Tiers
| Tier | Features |
|---|---|
| **Basic** | Access to open bundles, standard matching |
| **Verified** | Background check + license verified badge, higher bundle priority |
| **Partner** | Preferred bundle routing, analytics dashboard, multi-crew capacity |

---

## API-First / Webhook Pattern

From ARIA: any external system could POST to `/api/emergency/trigger` — the app worked with existing infrastructure.

Apply here: HEARTH should accept data from anywhere a homeowner's info might live.

```
POST /api/homes/:id/assets          — Add or update an asset
POST /api/bundles/trigger           — Agent evaluates bundle formation
POST /api/contracts/execute         — Finalize a 1-to-1 contract
POST /api/providers/notify          — Push bundle opportunity to providers
GET  /api/homes/:id/timeline        — Predictive service timeline for a home
GET  /api/bundles/open              — Open bundles by category + geography
```

**Integration targets for v2:**
- Smart home platforms (Google Home, SmartThings) — asset data auto-imported
- Home inspection report APIs — populate asset list at onboarding
- Permit databases — detect major work done, update asset records
- Utility APIs — detect unusual consumption, flag potential equipment failure

---

## Payment Rails Thinking

From ARIA: CDP wallet + x402 for micropayments between agent and services.

HEARTH has more complex payment needs — apply the same thinking:

```
Homeowner pays:     deposit to escrow on contract execution
                    remainder released on job completion confirmation
                    subscription fee for premium tier

Service provider:   receives bundled payment minus platform fee
                    early payment option (platform advances, charges fee)
                    stripe connect for payout management

Bundle mechanics:   discount locked at bundle formation
                    each homeowner sees their individual contract price
                    provider sees aggregate bundle value
```

**Escrow is the trust mechanism.** Neither side should pay or receive until the trigger condition is met. The agent holds and releases.

---

## Audit Trail Pattern (cited.md → contract.log)

From ARIA: the agent wrote every action to `cited.md` — sources, decisions, outcomes, timestamps.

HEARTH needs the same for every contract lifecycle event:

```markdown
## Contract Event Log — Home 742 Evergreen / HVAC Tune-Up

**Bundle ID:** bundle-hvac-springfield-apr26
**Contract ID:** contract-001-owner-provider
**Formed:** 2026-04-10T09:00:00Z

### Agent Actions
- 2026-04-10 09:00 — Asset flag: HVAC last serviced 13 months ago (threshold: 12)
- 2026-04-10 09:01 — Service recommendation generated for homeowner
- 2026-04-15 14:22 — Homeowner accepted recommendation
- 2026-04-15 14:23 — Added to bundle pool: hvac / springfield / spring-2026
- 2026-04-18 08:00 — Bundle threshold reached (8 units). Bundle formed.
- 2026-04-18 08:01 — Discount locked: 14% (tier 2)
- 2026-04-18 08:02 — CoolFlow HVAC notified of bundle opportunity
- 2026-04-19 10:15 — Provider accepted bundle
- 2026-04-19 10:16 — 1-to-1 contracts generated for all 8 homeowners
- 2026-04-19 10:17 — Escrow deposits initiated for all homeowners
- 2026-05-03 14:30 — Job completed (homeowner confirmed)
- 2026-05-03 14:31 — Escrow released to provider
```

Every action logged. Every decision traceable. This is your compliance and dispute resolution layer.

---

## Observability Layer

From ARIA: WunderGraph Cosmo provided a live view of every API call the agent made.

HEARTH needs observability for:
- Bundle formation events (how long do bundles take to fill?)
- Contract execution rates (what % of recommendations convert?)
- Provider acceptance rates (which categories have supply gaps?)
- Predictive model accuracy (how often does the agent flag correctly?)
- Payment flow health (escrow deposits, releases, failures)

Use this data to tune the bundle algorithm and pricing tiers over time. This is your product analytics layer, not just infrastructure.

---

## The Portable Mental Model

The deepest thing that transfers from ARIA is the architecture philosophy:

> **Build the agent as the core. The UI surfaces what the agent knows. The API accepts what the agent needs. The audit log proves what the agent did.**

In ARIA, the agent coordinated evacuations.
In HEARTH, the agent coordinates home maintenance procurement.

Same pattern. Different domain. The agent is the product.

---

## What HEARTH Is Not

Keep the team aligned on scope:

- Not a contractor directory (Angi, HomeAdvisor) — no lead selling, no open bidding
- Not a group-buy (no loss of personalization, no shared service dates forced)
- Not a warranty product — tracks warranties, doesn't replace them
- Not a smart home platform — ingests data from them, doesn't compete

HEARTH is a **procurement agent for home maintenance** that happens to present as a homeowner OS and a service provider marketplace.

---

*Derived from ARIA — Autonomous Response & Intelligence Agent scoping*
*Portable architecture patterns for HEARTH*
