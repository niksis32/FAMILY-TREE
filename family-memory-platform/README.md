# Family Memory Platform

Self-hosted платформа семейной памяти: семейное древо, персоны, семьи, события, timeline, медиаархив, документы, источники, GEDCOM, поиск и optional AI-сервис.

Проект построен как monorepo для локальной разработки, GitHub CI и последующего deploy на VPS без смены архитектуры.

## Возможности MVP

- Next.js frontend с dashboard layout, protected routes, tree, timeline, media, documents, search и settings.
- NestJS backend с модулями genealogy, media, search, GEDCOM, timeline, tree и optional AI proxy.
- PostgreSQL + Prisma для metadata и genealogy data.
- MinIO для физических файлов: фото, видео, аудио, PDF.
- Meilisearch для локального полнотекстового поиска.
- FastAPI `ai-service` под profile `ai`, без обязательных внешних API.
- Neo4j optional под profile `graph` для будущей graph analytics.

## Архитектура репозитория

```text
family-memory-platform/
  apps/
    web/              Next.js UI
    api/              NestJS REST API
    ai-service/       optional FastAPI AI layer
  packages/
    shared/           shared TypeScript contracts
    genealogy-core/   pure genealogy business logic
    ui/               shared React UI primitives
  infra/              docker, nginx, backup scripts
  docs/               architecture, local deploy, VPS deploy, roadmap
```

Подробно: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Требования

- Node.js `>=20`
- pnpm `>=9`
- Docker Desktop / Docker Engine
- PostgreSQL, Redis, MinIO, Meilisearch через Docker Compose

Проект использует `pnpm`, но базовые команды `npm run dev`, `npm run build`, `npm run lint`, `npm run test` также доступны как стандартные npm scripts.

## Локальный запуск

### 1. Установить зависимости

```bash
npm install
```

Рекомендуемый вариант для monorepo:

```bash
pnpm install
```

### 2. Настроить `.env`

```bash
cp .env.example .env
```

Минимально замените:

- `POSTGRES_PASSWORD`
- `MINIO_ROOT_PASSWORD`
- `MEILI_MASTER_KEY`
- `JWT_SECRET`

Для локальной разработки хосты можно оставить как в `.env.example`: `localhost`.

### 3. Запустить инфраструктуру

Короткая команда Docker Compose:

```bash
docker compose up -d
```

Рекомендуемый dev-вариант с overlay:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

Или через package script:

```bash
pnpm docker:infra
```

Остановка:

```bash
docker compose down
```

Dev overlay:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

### 4. Prisma

Сгенерировать Prisma Client:

```bash
pnpm db:generate
```

Применить миграции:

```bash
pnpm db:migrate
```

Если запускаете через npm:

```bash
npm run db:generate
npm run db:migrate
```

### 5. Запустить приложения

```bash
npm run dev
```

Или:

```bash
pnpm dev
```

Открыть:

| Сервис | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000/api/v1 |
| Backend Swagger | http://localhost:4000/docs |
| MinIO Console | http://localhost:9001 |
| Meilisearch | http://localhost:7700 |

Логин MinIO берётся из `.env`: `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`.

## Команды качества

```bash
npm run build
npm run lint
npm run test
```

Эквивалент:

```bash
pnpm build
pnpm lint
pnpm test
```

CI workflow находится в [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Optional сервисы

Neo4j:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile graph up -d
```

AI service:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile ai up -d ai-service
```

## Подготовка к deploy на VPS

1. Подготовить домен и DNS.
2. Создать production `.env`.
3. Сгенерировать сильные секреты.
4. Проверить `docker-compose.prod.yml`.
5. Настроить Nginx и SSL.
6. Закрыть наружные порты инфраструктуры.
7. Настроить backup PostgreSQL, MinIO и Meilisearch.
8. Проверить restore.

Подробно: [`docs/DEPLOY_VPS.md`](docs/DEPLOY_VPS.md).

## Документация

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/DEPLOY_LOCAL.md`](docs/DEPLOY_LOCAL.md)
- [`docs/DEPLOY_VPS.md`](docs/DEPLOY_VPS.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`docs/SECURITY.md`](docs/SECURITY.md)
- [`docs/PRODUCTION_READINESS_WORK_PLAN.md`](docs/PRODUCTION_READINESS_WORK_PLAN.md)
- [`docs/LOCAL_COMMANDS_REFERENCE.md`](docs/LOCAL_COMMANDS_REFERENCE.md)

## Contributing

См. [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

Лицензия пока не выбрана. Перед публичной публикацией на GitHub нужно явно добавить `LICENSE`.
