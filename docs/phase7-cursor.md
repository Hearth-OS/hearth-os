# Phase 7 — Agent memory (Redis) + pricing cache key

Implements the **Person A** track from `docs/ben.md` (1:45–2:30): agent-side state in Redis and a **stable cache key** for contractor pricing so agents/tools can deduplicate work (same idea as LangCache-style routing, without a separate LangCache server).

## What shipped

| Area | Detail |
|------|--------|
| **Agent sessions** | `GET/PUT/DELETE /api/agent/sessions/:id` — JSON merge into Redis under `agent:session:{id}`, TTL 24h. Session id: `^[a-zA-Z0-9_-]{1,64}$`. |
| **Pricing** | `GET /api/pricing` sets `X-Cache-Key: pricing:{service}:{neighborhood}` on every response (matches the internal Redis key). |
| **Tests** | Four new integration checks in `apps/api/src/test.ts` (Phase 7 block). **Requires API on :3001 with this code** — restart `npm run dev` (or the container) after pulling. |

## Optional next (not Phase 7)

- **Vapi** — voice layer; see `VAPI_API_KEY` in `.env.example` and `docs/ben.md` 3:30–4:00.
- **Real LangCache** — if you add a managed LangCache, point it at the same logical keys as `X-Cache-Key` / Redis `pricing:*`.
