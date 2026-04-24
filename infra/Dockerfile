# Chainguard secure base (bounty) — dev image includes shell + toolchains for npm ci and tsx runtime
FROM cgr.dev/chainguard/node:latest-dev AS deps
USER root
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/
COPY packages/graph/package.json ./packages/graph/
COPY packages/scraper/package.json ./packages/scraper/
COPY packages/pipeline/package.json ./packages/pipeline/

# Run as root so npm can create per-workspace node_modules (npm 9+)
RUN npm ci

FROM cgr.dev/chainguard/node:latest-dev AS runner
USER root
WORKDIR /app

# Full install tree (root + hoisted + nested workspace node_modules)
COPY --from=deps /app/ /app/
# Application source (host node_modules is dockerignored; does not clobber /app/node_modules)
COPY . .

ENV NODE_ENV=production
EXPOSE 3001

# Default nonroot user in Chainguard Node image
USER node
CMD ["node", "--require=tsx/cjs", "apps/api/src/index.ts"]
