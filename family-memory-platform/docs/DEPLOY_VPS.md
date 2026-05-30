# Deploy to VPS

Production deployment target: single VPS with Docker Compose, reverse proxy, internal network, persistent volumes and backups.

## 1. Server requirements

- Ubuntu 22.04+ / Debian 12+
- Docker Engine + Docker Compose plugin
- Git
- Domain name pointed to VPS IP
- Open ports: `80`, `443`
- Closed infrastructure ports: PostgreSQL, Redis, MinIO, Meilisearch, Neo4j

## 2. Clone repository

```bash
git clone https://github.com/YOUR_ORG/family-memory-platform.git
cd family-memory-platform
```

## 3. Create production env

```bash
cp .env.example .env
```

Change all secrets:

```env
NODE_ENV=production
APP_URL=https://your-domain.example
API_URL=https://your-domain.example/api
POSTGRES_PASSWORD=strong_password
MINIO_ROOT_PASSWORD=strong_password
MEILI_MASTER_KEY=strong_master_key
JWT_SECRET=long_random_secret_minimum_32_chars
NEXT_PUBLIC_API_URL=https://your-domain.example/api/v1
```

Optional (MVP works without these):

```env
AI_SERVICE_ENABLED=false
NEO4J_ENABLED=false
```

> **Photo Intelligence:** Redis (`REDIS_URL`) входит в базовый compose и нужен для очереди BullMQ. Контейнер `ai-service` (MediaPipe) — **отдельно**, только с `--profile ai`. Ручная разметка лиц работает без profile `ai`; см. [E2E_SMOKE_CHECKLIST.md](./E2E_SMOKE_CHECKLIST.md) сценарий 7.

## 4. Build and start

**MVP / production default** (без AI и Neo4j):

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

С optional Neo4j:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile graph up -d --build
```

### 4.1. Optional AI layer (`--profile ai`)

Профиль `ai` поднимает контейнер **`family_ai`** (`apps/ai-service`, FastAPI + MediaPipe) во внутренней сети `family_internal`. API обращается к нему по `AI_SERVICE_URL=http://ai-service:8000` (уже задано в `docker-compose.prod.yml` для сервиса `api`).

| Компонент | Без `--profile ai` | С `--profile ai` |
|---|---|---|
| Загрузка фото, MinIO, metadata | ✅ | ✅ |
| Ручные face-tags (`/media/{id}`, `/media/tagging`) | ✅ | ✅ |
| Очередь `photo-analysis` (BullMQ) | ✅ если `REDIS_URL` задан | ✅ |
| Авто-детекция лиц / AI insights | ❌ | ✅ при `AI_SERVICE_ENABLED=true` |
| Document / story AI proxy | ❌ | ✅ при `AI_SERVICE_ENABLED=true` |

**Запуск production со всем стеком + AI:**

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile ai up -d --build
```

**Обязательные переменные в `.env` на VPS при включении AI:**

```env
# Включить проксирование AI из API (иначе кнопки AI в UI disabled)
AI_SERVICE_ENABLED=true

# Redis уже в prod overlay API: redis://redis:6379 — не удаляйте REDIS_URL у процесса API
# (в docker-compose.prod.yml REDIS_URL зашит в environment api)
```

`REDIS_URL` для API в prod задаётся в compose (`redis://redis:6379`), отдельно в `.env` для host-run не нужен. Без Redis API помечает jobs как `SKIPPED`; в Web показывается graceful degradation (баннер + ручная разметка, см. [E2E сценарий 7](./E2E_SMOKE_CHECKLIST.md)).

**Проверка после старта:**

```bash
docker ps --filter name=family_ai
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec api wget -qO- http://ai-service:8000/health || true
```

Ожидание: контейнер `family_ai` — `Up`; health AI — HTTP 200 (если endpoint доступен из сети `api`).

**Локальная отладка AI (dev overlay):**

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile ai up -d ai-service
# API на хосте:
#   AI_SERVICE_ENABLED=true
#   AI_SERVICE_URL=http://localhost:8000
#   REDIS_URL=redis://localhost:6379
```

**Ресурсы и эксплуатация:**

- `ai-service` увеличивает RAM/CPU (MediaPipe); на малом VPS (≤2 GB) оставляйте профиль выключенным.
- Профиль **не входит** в MVP production gate — включайте осознанно после smoke [сценария 7](./E2E_SMOKE_CHECKLIST.md).
- Обновление только AI:  
  `docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile ai up -d --build ai-service`
- Отключение AI без простоя API/Web:  
  `docker compose -f docker-compose.yml -f docker-compose.prod.yml stop ai-service`  
  и `AI_SERVICE_ENABLED=false` + `docker compose … up -d api` (пересоздать env API).

**Связанные документы:** [apps/ai-service/README.md](../apps/ai-service/README.md), [DEPLOY_LOCAL.md](./DEPLOY_LOCAL.md), [PRODUCTION_READINESS_STATUS_REPORT.md](./PRODUCTION_READINESS_STATUS_REPORT.md) §8.

## 5. Run migrations

Preferred approach: run migrations from an app/API context after containers are built.

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec api pnpm db:generate
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec api pnpm db:migrate
```

If the production image does not include pnpm dev tooling, run migrations during a controlled release job or from a temporary admin container.

## 6. Reverse proxy and SSL

Production compose includes `nginx`. Final Nginx config should route:

- `/` to `web:3000`
- `/api/` to `api:4000`
- `/docs` to Swagger if you intentionally expose it

Use Let's Encrypt / Certbot or another ACME flow. Do not expose infrastructure services directly to the internet.

## 7. Health checks

```bash
docker ps --filter "name=family_"
curl http://localhost:4000/api/v1/health
curl http://localhost:7700/health
```

From outside:

```bash
curl https://your-domain.example
curl https://your-domain.example/api/v1/health
```

## 8. Backups

Minimum backup plan:

- PostgreSQL dump
- MinIO bucket sync
- Meilisearch dump/snapshot
- Neo4j dump if profile `graph` is used
- `.env` stored securely outside the repository

Backup is not complete until restore is tested.

## 9. Release checklist

- [ ] `.env` contains no default `change_me_*` values.
- [ ] Only `80/443` are public.
- [ ] `docker compose config` reviewed.
- [ ] Database migrations applied.
- [ ] Admin account created.
- [ ] Backup job configured.
- [ ] Restore tested.
- [ ] Logs reviewed after first start.
- [ ] Swagger exposure decision made.
- [ ] If `--profile ai`: `AI_SERVICE_ENABLED=true`, `family_ai` healthy, smoke [E2E scenario 7](./E2E_SMOKE_CHECKLIST.md) (manual tag minimum).

## 10. Rollback

Keep previous image/tag or previous git revision available:

```bash
git checkout <previous-release>
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### 10.1. Database migration rollback

Prisma does not auto-generate down migrations. Use one of these strategies:

**A. Restore from backup (recommended for production)**

If a migration is not backward compatible (for example mandatory `workspaceId` columns), restore PostgreSQL from the last known-good dump **before** redeploying the previous app version:

```bash
# stop API to prevent writes
docker compose -f docker-compose.yml -f docker-compose.prod.yml stop api web

# restore dump (example)
cat backups/postgres-YYYYMMDD.sql | docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

# redeploy previous release
git checkout <previous-release>
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

**B. Mark failed migration as rolled back (dev/staging only)**

When `prisma migrate deploy` failed mid-way and you manually reverted SQL:

```bash
docker compose exec api pnpm --filter @family/api prisma migrate resolve --rolled-back <migration_name>
```

**C. Baseline after manual fix (last resort)**

If schema was repaired manually and history must be reconciled:

```bash
docker compose exec api pnpm --filter @family/api prisma migrate resolve --applied <migration_name>
```

### 10.2. Rollback checklist

- [ ] Identify last good git tag / image digest.
- [ ] Confirm whether migrations are backward compatible.
- [ ] If not compatible: restore PostgreSQL backup first.
- [ ] Redeploy previous containers.
- [ ] Run smoke checks: `/api/v1/health`, login, tree view.
- [ ] Review `AuditLog` and application logs for errors during rollback window.

If migrations are not backward compatible, restore PostgreSQL from backup before rollback.
