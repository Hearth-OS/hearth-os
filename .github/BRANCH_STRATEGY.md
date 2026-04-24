# Branch strategy

| Branch | Owner | Purpose |
|--------|-------|---------|
| `main` | Everyone | Stable, demo-ready |
| `dev` | Everyone | Integration branch — merge here first |
| `feat/infra-*` | Person A | Infrastructure work |
| `feat/data-*` | Person B | Scraper + pipeline work |
| `feat/frontend-*` | Person C | UI + map work |

## Workflow

1. Branch off `dev`
2. Open PR → `dev` when your piece is ready
3. Person A reviews + merges into `dev`
4. When demo-ready: `dev` → `main`
