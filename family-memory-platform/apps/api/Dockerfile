# API production image with Chromium for PDF export (BLOCK 5 / PROMPT 5-F)

FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROMIUM_PATH=/usr/bin/chromium
ENV NODE_ENV=production

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY packages/genealogy-core/package.json packages/genealogy-core/
COPY packages/dna-core/package.json packages/dna-core/
COPY packages/map-engine/package.json packages/map-engine/

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
RUN pnpm install --frozen-lockfile --filter @family/api...

COPY . .
RUN pnpm --filter @family/shared build \
 && pnpm --filter @family/genealogy-core build \
 && pnpm --filter @family/dna-core build \
 && pnpm --filter @family/map-engine build \
 && pnpm --filter @family/api build

EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
