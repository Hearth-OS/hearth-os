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
cp .env.example .env
# fill DATABASE_URL, GHOST_DATABASE_URL, REDIS_URL, and any other keys your track needs
npm install
npm run dev
```

- **API** is served at `http://localhost:3001` (and GraphQL at `/graphql`). Integration contracts for the web app and other tracks live in `docs/integration.md`.
- **Frontend (Person C):** set `NEXT_PUBLIC_API_URL` if the API is not on `http://localhost:3001` (default is that URL). `NEXT_PUBLIC_MAPBOX_TOKEN` is required once the Mapbox map is wired up.

For live contractor pricing, set `TINYFISH_API_KEY` in your env file, then run `npm run scrape`. To feed the results into Nexla Express, also set `NEXLA_WEBHOOK_URL` and `NEXLA_API_KEY`, then run `npm run pipeline`.

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
