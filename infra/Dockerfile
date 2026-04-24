# Chainguard secure base (bounty) — dev image includes shell + toolchains for npm ci and tsx runtime
FROM cgr.dev/chainguard/node:latest-dev AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/
COPY packages/graph/package.json ./packages/graph/
COPY packages/scraper/package.json ./packages/scraper/
COPY packages/pipeline/package.json ./packages/pipeline/

# tsx (workspace devDep) is required to run the API without a separate tsc stage
RUN npm ci

FROM cgr.dev/chainguard/node:latest-dev AS runner
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "--require=tsx/cjs", "apps/api/src/index.ts"]
