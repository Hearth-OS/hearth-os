# @hearth-os/api — API Server (Person A)

Express + GraphQL (Yoga) + Redis cache. InsForge Postgres + Ghost (Timescale) for data.

## Dev

```bash
# from repo root — needs .env with DATABASE_URL, GHOST_DATABASE_URL, REDIS_URL
npm run dev   # workspace dev; http://localhost:3001
```

Restart the dev server after pulling so integration tests hit the latest routes.

## Tests

```bash
npm test   # from repo root; API must be running on :3001 (see above)
```

## Endpoints (see `docs/integration.md`)

- REST: `/health`, `/api/properties`, `/api/bundles/open`, `/api/pricing` (with `X-Cache-Key`)
- Agent memory: `GET|PUT|DELETE /api/agent/sessions/:id`
- GraphQL: `POST /graphql`
