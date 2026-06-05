# NestJS API — multi-stage build for dev (hot reload) and prod
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/genealogy-core/package.json ./packages/genealogy-core/
COPY packages/matching-core/package.json ./packages/matching-core/
COPY packages/map-engine/package.json ./packages/map-engine/
RUN pnpm install --frozen-lockfile || pnpm install

FROM deps AS development
COPY . .
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["pnpm", "run", "dev"]

FROM deps AS builder
COPY . .
# Match root `pnpm api:build`: workspace libs → prisma generate → API tsc
RUN pnpm --filter @family/shared run build \
 && pnpm --filter @family/map-engine run build \
 && pnpm --filter @family/genealogy-core run build \
 && pnpm --filter @family/matching-core run build \
 && pnpm --filter @family/api exec prisma generate \
 && pnpm --filter @family/api run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
# Keep pnpm monorepo layout — flat /app/dist + root node_modules breaks module resolution.
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["node", "dist/main.js"]
