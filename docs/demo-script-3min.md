# Hearth OS — 3 minute demo talk

> Based on [ben.md](ben.md) (demo script § lines 65–70). **Vapi** is on the roadmap only — not implemented.

---

## Hackathon stack (quick reference)

Use this so judges hear the **sponsor- and build-related tech**; fold names into the timed beats below.

| Technology | How we use it in Hearth OS |
|------------|----------------------------|
| **InsForge** | App **Postgres** + backend we ship against — properties, pricing rows, bundle logic. |
| **WunderGraph Cosmo** | **Federation / GraphQL** layer: InsForge + **Ghost** + (intent) **SF open parcel** sources as one graph; optional **MCP** path for agents. |
| **Ghost** | Synthetic / scratch **property and maintenance** data in the pipeline. |
| **Redis** | **Homeowner and agent session** state, plus **caching** on market-rate / pricing calls (e.g. cache keys on pricing queries). |
| **TinyFish** | **Web-agent** runs that pull **Thumbtack, Angi, Yelp**-style **SF contractor pricing** into structured rates. |
| **Nexla Express** | **Ingestion pipeline** from scrapes (and feeds) into the same **pricing** table the app reads. |
| **Mapbox GL JS** | **SF** basemap, parcels / pins, **toggles** that show demand by service and time. |
| **Next.js** | **Web UI** in our **Turborepo** monorepo. |
| **Chainguard** | Hardened **base image** for the **Docker**ized API. |
| **Akash** | **Declarative deploy** (SDL) path for running the **API** on decentralized infra. |
| **Vapi** | *Not in this build* — planned for **outbound** contractor calls. |

**Also say once:** data grounded in **SF** scope — **open assessor / parcel** style inputs where we need coordinates and filters; **TypeScript** end to end, **Express** + **GraphQL Yoga** for REST + **GraphQL** in the app API.

---

## 0:00–0:35 — Homeowner OS (data + InsForge + Ghost)

We’re building **Hearth OS** — a home maintenance “operating system” for homeowners, and a **demand side** for pros. On the homeowner side, the idea is simple: your house isn’t random — it has a **maintenance timeline** driven by **property age**, **regional** patterns, and the kind of line items you’d store in a real app backend. We use **InsForge** as our **app database** and we combine that with **Ghost**-backed **synthetic property history** so timelines aren’t a mock — they’re data-shaped like production. The pitch: *evidence-based predictions* for the next few years, so you know **what** needs work and **when** before it becomes an emergency.

---

## 0:35–1:05 — SF map (Mapbox + open data + WunderGraph story)

When you pull back, the story is **density of need** on a **Mapbox** map: **every qualifying residential** SF property we model — **single family and small multifamily**. We draw on **open SF parcel / assessor** thinking so coordinates and filters match the real city. The **WunderGraph Cosmo** layer is how we want to **federate** **InsForge**, **Ghost**, and those **geospatial** sources into **one graph** for the UI and for **agent**-style tools — the “single pane” hackathon bet. It’s not one house; it’s a **market**.

---

## 1:05–1:45 — Toggles: service + time (Next.js + Mapbox + API)

**Next** + **Mapbox** is where you **narrow the world**: pick a service — **gutters** — and a time window — **Q4 2026**. The map should **light up** properties that qualify. The line: *~147 properties need gutters this fall* — a **countable** demand pool. Under the hood that’s our **TypeScript** **API** (REST to start; **GraphQL** available) backed by **InsForge**.

---

## 1:45–2:30 — Clusters, Shapley, market rate (Redis + TinyFish + Nexla)

**Click a cluster** — the **marketplace** story: **bundle** jobs for route efficiency, with **Shapley-style** discounting so the **group rate** (e.g. **~$180/unit**) still respects **individuals**, vs **~$260** **market** for that service and neighborhood. That market number is not made up: we **ingest** live **SF** quotes with **TinyFish** **automation** against real listing **URLs**; **Nexla** **Express** is the path to **pipe** those results into the **InsForge** **pricing** table. **Redis** gives us **fast repeat reads** and **agent session** continuity when we show “same homeowner, same story” on pricing — aligned with a **caching** story for **rate** queries.

---

## 2:30–3:00 — Ship + sponsor wrap (Docker + Chainguard + Akash; no Vapi)

**Ship path:** the **API** is **containerized** with a **Chainguard** **base** for a smaller, more secure default image, and we have an **Akash** **SDL**-style path for **running** the backend outside the usual cloud if we want. **Vapi** was in the “extra credit” plan for a **recorded** or **live** **contractor** moment — we **didn’t** wire it in time. **Honest next step:** that **outbound** call, plus finishing the full **Mapbox** UI on the **Next** app so every beat is **on-screen** — not just **API**-true.

**Optional 15s tech roll call (if a judge says “which sponsors?”):** *InsForge and Ghost for data, Redis for session and cache, WunderGraph for the federated graph story, TinyFish and Nexla for real contractor pricing, Mapbox and Next for the face of the product, Chainguard and Akash for how we ship the API — and we’re not demoing Vapi today.*

---

## Optional closer (~10s)

**Timeline** → **city** → **toggles to a number** → **bundle vs market** backed by **TinyFish** and **Nexla**. That’s the loop.

---

## Demo tips

- If the **Next** map is still a placeholder, show **`/api/properties`**, **`/api/bundles/open`**, **`/api/pricing`** and **narrate** **Mapbox**.
- Point to **`docs/integration.md`** for **endpoint** contracts and **caching** headers.
- If **WunderGraph** isn’t running in the room, still **name** it as the **federation** and **MCP** layer you’re building toward so the **platform** prize story stays intact.
