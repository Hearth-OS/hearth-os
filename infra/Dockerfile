# Chainguard secure base image (satisfies Chainguard bounty)
FROM cgr.dev/chainguard/node:latest AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/db/package*.json ./packages/db/
COPY packages/graph/package*.json ./packages/graph/
RUN npm ci

FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "apps/api/dist/index.js"]
