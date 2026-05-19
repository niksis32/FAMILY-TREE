# NestJS API — multi-stage build for dev (hot reload) and prod
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/genealogy-core/package.json ./packages/genealogy-core/
RUN pnpm install --frozen-lockfile || pnpm install

FROM deps AS development
COPY . .
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["pnpm", "run", "dev"]

FROM deps AS builder
COPY . .
RUN pnpm --filter @family/api run build

FROM node:20-alpine AS production
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 4000
CMD ["node", "dist/main.js"]
