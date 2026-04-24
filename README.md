# Hearth OS — HomeOS Hackathon

A dual-sided marketplace for home maintenance.

## Team

| Person | Area | Packages |
|--------|------|---------|
| A | Infrastructure | `apps/api`, `packages/db`, `packages/graph`, `infra/` |
| B | Data + TinyFish | `packages/scraper`, `packages/pipeline` |
| C | Frontend | `apps/web` |

## Getting started (full monorepo)

```bash
cp .env.example .env
# fill DATABASE_URL, GHOST_DATABASE_URL, REDIS_URL, and any other keys your track needs
npm install
npm run dev
```

`npm run dev` runs Turbo and may start multiple apps; for day-to-day work you can start **only** the packages you need (see **Person C** below).

For live contractor pricing, set `TINYFISH_API_KEY` in your env file, then run `npm run scrape`. To feed the results into Nexla Express, also set `NEXLA_WEBHOOK_URL` and `NEXLA_API_KEY`, then run `npm run pipeline`.

---

## Person C — run the frontend and hook up the API

Person C works in **`apps/web`** (Next.js 14, App Router). The browser talks to the **backend on port 3001**, not to Postgres directly. You can either run the API locally (same machine as the UI) or point the UI at an API URL your team already has running.

### 1. Install once (repo root)

```bash
cp .env.example .env
npm install
```

### 2. Configure env for the web app (repo root `.env` or `.env.local`)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Base URL for all `fetch` calls to the Hearth API. **Default in code is `http://localhost:3001`**. Set this if the API is on another host or port. |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Required when you add Mapbox GL; get a token at [Mapbox](https://account.mapbox.com/). `next.config.js` already exposes it to the client. |

CORS is enabled on the API, so the Next dev server on **`http://localhost:3000`** can call **`http://localhost:3001`** with no extra proxy.

### 3. Start the API (Person C, local integration)

The UI needs a running API. From the **repository root** (with a team-provided or full `.env` that includes at least `DATABASE_URL`, `GHOST_DATABASE_URL`, and `REDIS_URL` if you start the real server):

```bash
npm run dev --workspace @hearth-os/api
# API: http://localhost:3001  — try: curl http://localhost:3001/health
```

If someone else is hosting the API, skip this and only set `NEXT_PUBLIC_API_URL` to that base URL (must allow browser CORS from your Next origin).

### 4. Start the web app (second terminal, repo root)

```bash
npm run dev --workspace @hearth-os/web
# App: http://localhost:3000
```

In React/Next client code, call the contract documented in **`docs/integration.md`**, e.g.:

```ts
const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const res = await fetch(`${base}/api/properties`);
const properties = await res.json();
```

Use the same pattern for `GET /api/properties/:id/timeline`, `GET /api/bundles/open?service=...`, `GET /api/pricing?...`, or `POST /graphql` for GraphQL. Full table, response shapes, and the optional WunderGraph router on **:4000** are in **`docs/integration.md`**.

### 5. Optional: federated GraphQL (agent / advanced)

If the demo needs queries through the WunderGraph router, start the router (Docker) as in `docs/integration.md` — the **REST** endpoints on `:3001` are enough for a typical map + timeline UI.

### 6. Build before you ship

```bash
npm run build --workspace @hearth-os/web
# or from root: npm run build
```

## API in Docker (Chainguard)

From the repository root, with a populated `.env` (InsForge + Ghost connection strings; Redis is provided by compose):

```bash
docker build -f infra/Dockerfile -t hearth-os-api .
# For a one-off run you must set REDIS_URL (e.g. cloud Redis or host.docker.internal:6379 if Redis runs on the host). Prefer compose below.
```

**Compose (API + local Redis, overrides `REDIS_URL` to the `redis` service):**

```bash
docker compose -f infra/docker-compose.yml --env-file .env up --build
# health: curl http://localhost:3001/health
```

WunderGraph Cosmo **router** is not part of this image; it still runs as documented in `docs/integration.md` and `docs/phase6-cursor.md`.

## Check quality

**Fast (CI-style, no live DB):** `npm run verify:build` or `scripts/verify-build.cmd` (Windows) / `scripts/verify-build.sh` (Git Bash, macOS, Linux) / `pwsh -File scripts/verify-build.ps1`.

**Make (Git Bash / WSL / macOS / Linux):** `make help` — `make check`, `make start-all` (API + WunderGraph router in Docker), `make test`, `make stop`. PIDs and logs under `.make/` (gitignored). On Windows without `make`, use the scripts above and start the API/router manually.

```bash
npm test       # @hearth-os/db + @hearth-os/api (requires .env and live services)
```

For **API** tests, run the server with current code, then in another shell `npm test` (or restart the API after `git pull` so port 3001 serves the new routes). Then:

```bash
npm run build
```

## Demo / integration order (Person A + team)

1. Databases reachable (`DATABASE_URL`, `GHOST_DATABASE_URL` as in `.env`).
2. **API** on port **3001** (local or Docker) — CORS is open for browser calls from the Next dev server.
3. **WunderGraph router** on **4000** (optional for REST-only UI; required for the federated GraphQL + agent path).
4. **Web** on **3000** (calls `NEXT_PUBLIC_API_URL`).

**Phase 7 (agent + pricing key):** `docs/phase7-cursor.md` — Redis agent sessions and `X-Cache-Key` on `/api/pricing`.

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
