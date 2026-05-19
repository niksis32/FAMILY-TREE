# Family Memory Platform

**AI Family Memory Platform** — self-hosted MVP для семейного древа, медиаархива, документов, timeline, источников, GEDCOM и будущих AI-функций.

Архитектура: **monorepo** (pnpm + Turbo), модульный монолит API, отдельные инфраструктурные сервисы в Docker Compose. Путь разработки: **Cursor → GitHub → VPS** без смены архитектуры.

## Структура репозитория

```
family-memory-platform/
├── apps/
│   ├── web/              # Next.js — UI, дерево, timeline, поиск
│   ├── api/              # NestJS — REST API, Prisma, бизнес-логика
│   └── ai-service/       # FastAPI (optional) — OCR, AI-подсказки
├── packages/
│   ├── shared/           # Типы, DTO, константы (web + api)
│   ├── genealogy-core/   # Чистая логика родства, GEDCOM, дерево
│   └── ui/               # Общие React-компоненты
├── infra/                # Dockerfiles, nginx, backup scripts
├── docs/                 # Документация (итеративно)
├── docker-compose.yml    # Базовая инфраструктура
├── docker-compose.dev.yml
└── docker-compose.prod.yml
```

## Стек

| Слой | Технология |
|------|------------|
| Frontend | Next.js 15, React 19, TypeScript, TailwindCSS |
| Backend | NestJS 10, TypeScript |
| Database | PostgreSQL 16 + Prisma |
| Media | MinIO (S3-compatible) |
| Cache/Queue | Redis 7 |
| Search | Meilisearch |
| Graph (optional) | Neo4j (`--profile graph`) |
| AI (optional) | Python FastAPI (`--profile ai`) |
| Deploy | Docker Compose (+ Nginx на prod) |

## MVP-модули (API)

`auth`, `users`, `persons`, `families`, `relationships`, `events`, `places`, `media`, `documents`, `sources`, `citations`, `timeline`, `search`, `gedcom`, `admin`

Сейчас — **скелет**: модули зарегистрированы, эндпоинты-заглушки, Prisma-схема с сущностями. Реализация — по одному модулю за итерацию.

## Быстрый старт (локально)

### Требования

- Node.js ≥ 20
- pnpm ≥ 9
- Docker Desktop (для инфраструктуры)

### 1. Клонирование и env

```bash
cd family-memory-platform
cp .env.example .env
# Отредактируйте пароли в .env
```

### 2. Инфраструктура (PostgreSQL, Redis, MinIO, Meilisearch)

```bash
pnpm docker:infra
# Опционально Neo4j:
pnpm docker:graph
```

### 3. Зависимости и БД

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
```

### 4. Приложения (без Docker)

```bash
pnpm dev
```

- Web: http://localhost:3000  
- API: http://localhost:4000/api/v1  
- Swagger: http://localhost:4000/docs  
- MinIO Console: http://localhost:9001  
- Meilisearch: http://localhost:7700  

### 5. Всё в Docker (опционально)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile apps up -d
```

## GitHub

```bash
git init
git add .
git commit -m "chore: initial monorepo skeleton for Family Memory Platform"
git remote add origin https://github.com/YOUR_ORG/family-memory-platform.git
git push -u origin main
```

Рекомендуется добавить GitHub Secrets для VPS deploy (`DATABASE_URL`, `JWT_SECRET`, и т.д.) на этапе CI/CD.

## VPS (production)

```bash
cp .env.example .env
# Заполните production-секреты

docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Nginx проксирует `/` → web, `/api/` → api. SSL — Let's Encrypt (certbot) на хосте или в отдельном контейнере.

Бэкап PostgreSQL: `infra/scripts/backup-postgres.sh`

## Итерации разработки (рекомендуемый порядок)

1. **auth + users** — JWT, роли  
2. **persons + relationships** — CRUD, валидация родства  
3. **families + events + places**  
4. **media + documents** — MinIO presigned upload  
5. **timeline** — агрегация событий  
6. **sources + citations**  
7. **search** — индексация Meilisearch  
8. **gedcom** — импорт  
9. **tree UI** — D3/Cytoscape  
10. **admin + audit**  
11. **ai-service** — OCR (optional)  
12. **neo4j** — graph analytics (optional)  

## Лицензия

Укажите лицензию при публикации на GitHub (например MIT или AGPL — по вашему выбору для genealogy data).
