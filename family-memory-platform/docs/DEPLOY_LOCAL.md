# Local Deploy

Короткая инструкция локального запуска. Подробные Windows/WSL инструкции находятся в:

- `docs/DOCKER_LOCAL_WINDOWS.md`
- `docs/DOCKER_LOCAL_WINDOWS_AFTER_REBOOT.md`
- `docs/DOCKER_LOCAL_WINDOWS_SESSION_RUNBOOK.md`

## Requirements

- Node.js `>=20`
- pnpm `>=9`
- Docker Desktop / Docker Engine
- Git

## 1. Install dependencies

```bash
npm install
```

Recommended:

```bash
pnpm install
```

## 2. Create `.env`

```bash
cp .env.example .env
```

Edit at least:

```env
POSTGRES_PASSWORD=...
MINIO_ROOT_PASSWORD=...
MEILI_MASTER_KEY=...
JWT_SECRET=...
```

`JWT_SECRET` should be long and random.

## 3. Start infrastructure

Simple:

```bash
docker compose up -d
```

Recommended dev overlay:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

Stop:

```bash
docker compose down
```

Dev overlay stop:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

## 4. Prisma

```bash
pnpm db:generate
pnpm db:migrate
```

Npm equivalent:

```bash
npm run db:generate
npm run db:migrate
```

## 5. Run apps

```bash
npm run dev
```

Recommended:

```bash
pnpm dev
```

## 6. URLs

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000/api/v1 |
| Swagger | http://localhost:4000/docs |
| MinIO Console | http://localhost:9001 |
| Meilisearch | http://localhost:7700 |

## 7. Optional profiles

Neo4j:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile graph up -d
```

AI service:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile ai up -d ai-service
```

Full apps in Docker:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile apps up -d --build
```

## 8. Common Windows/WSL note

If dependencies were installed from Windows but apps run from WSL, Next.js/SWC or pnpm store issues may appear. Reinstall from Ubuntu/WSL:

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
CI=true pnpm install --frozen-lockfile
```
