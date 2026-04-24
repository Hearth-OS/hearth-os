# Phase 6 — Integration, Docker, demo order

Phase 5 (Chainguard + runnable container) is implemented in `infra/Dockerfile` using `tsx` at runtime so no `dist/` stage is required. This phase wires **compose**, **docs**, and **frontend env** for the full team path.

## Done in this phase

- **Dockerfile** — `cgr.dev/chainguard/node:latest-dev`, `npm ci`, `CMD` runs `apps/api/src/index.ts` via `tsx/cjs`.
- **docker-compose** — API + Redis; `REDIS_URL` is forced to `redis://redis:6379` so the API uses the bundled Redis. `DATABASE_URL` and `GHOST_DATABASE_URL` come from `--env-file .env` (run from repo root).
- **`.dockerignore`** — smaller/faster image builds; keeps secrets out via normal `.env` gitignore.
- **README** — Docker commands, `npm test` / `npm run build`, demo order (DB → API :3001 → router :4000 → web :3000).
- **Next.js** — `NEXT_PUBLIC_API_URL` defaults to `http://localhost:3001` for Person C.
- **`.env.example`** — documents `GHOST_DATABASE_URL`.

## WunderGraph (router on :4000)

The API’s own GraphQL is on **:3001/graphql**. The **Cosmo router** federates that endpoint and Ghost; it is started separately (see `docs/integration.md`). The placeholder in `packages/graph` is still a stub for a full Cosmo **client** library — the **router process** is what demos and tests use today.

## Person B — `pricing_rates`

B inserts into InsForge `pricing_rates` (same `DATABASE_URL` as A). `GET /api/pricing?service=...&neighborhood=...` and the GraphQL `pricing` query read that table with Redis caching (see `docs/integration.md`).

## Verify

```bash
# from repo root, with .env
npm test
npm run build
docker compose -f infra/docker-compose.yml --env-file .env up --build
curl -s http://localhost:3001/health
```

CI runs **lint + build** only; `npm test` needs live DB/Redis/router and stays local (or add GitHub Actions secrets if you want it in CI).
