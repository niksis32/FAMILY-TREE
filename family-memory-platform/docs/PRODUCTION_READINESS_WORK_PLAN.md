# Family Memory Platform: отчёт готовности и план доведения до production

Дата составления: 19.05.2026

Документ фиксирует текущее состояние проекта по результатам сверки с промтами:

- Промт №2: Docker и окружение
- Промт №3: Backend NestJS
- Промт №4: Prisma schema
- Промт №5: Frontend Next.js

Цель документа: быстро понять, что уже сделано, что не хватает, в каком порядке дорабатывать проект и какие критерии должны быть выполнены перед публикацией на VPS / production.

---

## 1. Краткий executive summary

Проект уже имеет правильное направление: создан monorepo, есть Docker-инфраструктура, базовый NestJS backend, Prisma schema, Next.js frontend, документация для локального запуска и первые заготовки модулей. Но текущий уровень проекта - это в основном **архитектурный skeleton / MVP foundation**, а не production-ready платформа.

Главный вывод: перед активной разработкой UI и бизнес-логики нужно сначала стабилизировать фундамент:

1. Довести Prisma schema до целевой genealogy-модели.
2. После этого реализовать backend CRUD + auth + RBAC.
3. Затем построить frontend поверх реального API.
4. Отдельно усилить Docker prod-конфигурацию, безопасность, backup и deployment.

Если начать с frontend или CRUD поверх текущей неполной схемы, позже придётся делать болезненные миграции и переписывать API.

---

## 2. Общая оценка готовности

| Блок | Оценка готовности | Текущее состояние |
|---|---:|---|
| Docker / окружение | 70-75% для локальной разработки, 40-50% для prod | Инфраструктура есть, но prod-сети и закрытие портов нужно исправить |
| Backend NestJS | 45-50% | Модульный skeleton есть, но нет реального JWT/RBAC/CRUD |
| Prisma schema | 35-40% | Основные таблицы есть, но не хватает UUID, soft delete, enum, privacy, seed |
| Frontend Next.js | 25-30% | App Router и Tailwind есть, но страницы и компоненты в основном отсутствуют |
| Production readiness | 20-30% | Нужны безопасность, deployment, backup, мониторинг, миграции, auth |

---

## 3. Что уже сделано

### 3.1. Репозиторий и архитектура

Сделано:

- Создан проект `family-memory-platform`.
- Используется monorepo-подход.
- Основные зоны разделены:
  - `apps/web` - frontend Next.js.
  - `apps/api` - backend NestJS.
  - `apps/ai-service` - будущий AI/FastAPI сервис.
  - `packages/shared` - общие типы, DTO-интерфейсы, константы.
  - `packages/genealogy-core` - чистая genealogy-логика.
  - `packages/ui` - будущая UI-библиотека.
  - `infra` - Dockerfiles, nginx, scripts.
  - `docs` - документация.
- Есть базовая документация по локальному запуску на Windows/WSL/Docker.

Вывод: структура проекта выбрана правильно для self-hosted платформы, которую позже можно переносить на VPS.

---

## 4. Промт №2: Docker и окружение

### 4.1. Что требовалось

Нужно было создать:

- `docker-compose.yml`
- `docker-compose.dev.yml`
- `docker-compose.prod.yml`
- `.env.example`
- `infra/backup scripts`
- README section: как запускать локально

Сервисы:

- PostgreSQL
- Redis
- MinIO
- Meilisearch
- Neo4j optional profile `graph`

Требования:

- Все пароли в `.env`.
- В local dev открыть порты.
- В prod предусмотреть закрытые внутренние сети.
- Создать MinIO bucket `family-media`.
- PostgreSQL volume.
- Meilisearch master key.
- Neo4j optional через profile `graph`.
- Healthcheck для PostgreSQL, Redis, MinIO.
- Команды запуска/остановки/логов.
- Объяснение сервисов в README.

### 4.2. Что уже сделано

| Требование | Статус | Где |
|---|---:|---|
| `docker-compose.yml` | Сделано | `docker-compose.yml` |
| PostgreSQL | Сделано | `postgres:16-alpine` |
| Redis | Сделано | `redis:7-alpine` |
| MinIO | Сделано | `minio/minio` |
| Meilisearch | Сделано | `getmeili/meilisearch` |
| Neo4j optional profile `graph` | Сделано | service `neo4j`, profile `graph` |
| `docker-compose.dev.yml` | Сделано | local overlay |
| `docker-compose.prod.yml` | Сделано частично | prod overlay есть, но требует исправлений |
| `.env.example` | Сделано | `.env.example` |
| PostgreSQL volume | Сделано | `postgres_data` |
| Redis volume | Сделано | `redis_data` |
| MinIO volume | Сделано | `minio_data` |
| Meilisearch volume | Сделано | `meili_data` |
| Healthcheck PostgreSQL | Сделано | `pg_isready` |
| Healthcheck Redis | Сделано | `redis-cli ping` |
| Healthcheck MinIO | Сделано | `mc ready local` |
| Meilisearch master key | Сделано | `MEILI_MASTER_KEY` |
| Backup script | Частично | есть только `backup-postgres.sh` |
| README local run | Частично | есть кратко в README, подробно в docs |

### 4.3. Что не хватает / что нужно исправить

#### 4.3.1. Prod-сети и закрытие портов

Проблема: в текущей prod-конфигурации попытка закрыть порты через `ports: []` не даёт нужного результата при merge compose-файлов. После сборки итоговой конфигурации инфраструктурные сервисы всё ещё могут публиковать порты наружу.

Нужно:

- Перенести публикацию портов из базового `docker-compose.yml` в `docker-compose.dev.yml`.
- Базовый compose оставить без внешних портов или сделать его безопасным.
- В `docker-compose.prod.yml` подключить `postgres`, `redis`, `minio`, `meilisearch`, `neo4j` к `family_internal`.
- Наружу в prod должен смотреть только reverse proxy:
  - `nginx:80`
  - `nginx:443`

Целевой принцип:

```text
Internet
  |
  v
Nginx / Traefik
  |
  v
family_internal network
  |-- web
  |-- api
  |-- postgres
  |-- redis
  |-- minio
  |-- meilisearch
  |-- neo4j optional
```

#### 4.3.2. MinIO bucket creation

Сейчас bucket `family-media` создаётся через `minio-init`, но этот сервис включён в profile `apps`. Если запускать только инфраструктуру, bucket может не создаться.

Нужно:

- Сделать `minio-init` частью dev-инфраструктуры без profile `apps`, либо
- Выделить отдельный profile `init`, либо
- Создать явную команду `pnpm docker:minio:init`.

Рекомендуемый вариант для MVP: `minio-init` должен запускаться вместе с dev-инфраструктурой.

#### 4.3.3. Production secrets

Сейчас в compose есть fallback-пароли вроде `family_password`. Для production это опасно.

Нужно:

- Для prod использовать обязательные переменные:

```yaml
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}
MEILI_MASTER_KEY: ${MEILI_MASTER_KEY:?MEILI_MASTER_KEY is required}
MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:?MINIO_ROOT_PASSWORD is required}
JWT_SECRET: ${JWT_SECRET:?JWT_SECRET is required}
```

- Не оставлять production fallback-секреты.

#### 4.3.4. Backup scripts

Сейчас есть только PostgreSQL backup.

Нужно добавить:

- PostgreSQL backup.
- PostgreSQL restore.
- MinIO backup/sync.
- Meilisearch dump или snapshot.
- Neo4j dump для profile `graph`.

Важно: backup-скрипты должны быть безопасны и не удалять данные без явного подтверждения.

### 4.4. Что делать по Docker

Приоритет P0:

1. Переписать compose-структуру:
   - base без портов;
   - dev открывает порты;
   - prod закрывает инфраструктуру во внутренней сети.
2. Проверить:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml config
docker compose -f docker-compose.yml -f docker-compose.prod.yml config
```

3. Убедиться, что в prod наружу опубликованы только `80/443`.

Приоритет P1:

1. Исправить MinIO init.
2. Добавить backup/restore.
3. Добавить README section с командами:

```bash
docker compose up -d
docker compose down
docker compose logs -f
docker compose --profile graph up -d
```

---

## 5. Промт №3: Backend NestJS

### 5.1. Что требовалось

Создать backend `apps/api` на NestJS:

- TypeScript strict mode.
- Prisma ORM.
- PostgreSQL connection.
- Swagger/OpenAPI.
- Global validation pipe.
- ConfigModule для `.env`.
- JWT auth.
- RBAC roles: `admin`, `editor`, `viewer`.
- Modular architecture.

Модули:

- `auth`
- `users`
- `persons`
- `families`
- `relationships`
- `events`
- `places`
- `media`
- `documents`
- `sources`
- `citations`
- `timeline`
- `search`
- `gedcom`
- `admin`

Для каждого модуля:

- controller
- service
- dto
- entity/model types
- basic CRUD structure
- комментарий, что модуль делает

MVP:

- регистрация первого администратора;
- login;
- CRUD Person;
- CRUD Family;
- CRUD Relationship;
- CRUD Event;
- загрузка Media metadata;
- Document entity;
- Timeline generation endpoint;
- Basic search endpoint.

### 5.2. Что уже сделано

| Требование | Статус | Где |
|---|---:|---|
| NestJS app | Сделано | `apps/api` |
| TypeScript strict | Сделано | `tsconfig.base.json` |
| Prisma ORM | Сделано | `apps/api/prisma`, `src/prisma` |
| PostgreSQL connection | Частично | Prisma через `DATABASE_URL` |
| Swagger/OpenAPI | Сделано | `src/main.ts` |
| Global validation pipe | Сделано | `src/main.ts` |
| ConfigModule | Сделано | `src/app.module.ts` |
| Modular architecture | Сделано | `src/modules/*` |
| Все модули из промта | Сделано | модули созданы |
| Health endpoint | Дополнительно сделано | `common/health` |

### 5.3. Что сделано как skeleton

Почти все доменные модули сейчас возвращают заглушки вида `status: skeleton`.

Примеры:

- `auth/login` есть, но login не реализован.
- `auth/register` есть, но регистрация не реализована.
- `persons` имеет только `GET`, без настоящего CRUD.
- `families`, `relationships`, `events`, `media`, `documents` - skeleton.
- `timeline` имеет endpoint, но не генерирует timeline.
- `search` имеет endpoint, но не ходит в Meilisearch.

### 5.4. Чего не хватает

#### 5.4.1. Auth

Нужно добавить:

- `RegisterFirstAdminDto`.
- `LoginDto`.
- password hashing: `argon2` или `bcrypt`.
- `JwtModule`.
- `JwtStrategy`.
- `JwtAuthGuard`.
- `CurrentUser` decorator.
- refresh token - можно позже, но access token нужен сразу.

Минимальная логика:

```text
POST /api/v1/auth/register-first-admin
  - разрешён только если в базе нет пользователей с ролью ADMIN
  - создаёт первого ADMIN

POST /api/v1/auth/login
  - проверяет email/password
  - возвращает accessToken и user profile
```

#### 5.4.2. RBAC

Нужно добавить:

- enum ролей в Prisma: `ADMIN`, `EDITOR`, `VIEWER`.
- decorator `@Roles(...)`.
- `RolesGuard`.
- защиту маршрутов:
  - viewer: read-only;
  - editor: create/update domain data;
  - admin: users/settings/admin operations.

#### 5.4.3. DTO

Сейчас в `packages/shared` есть TypeScript-интерфейсы, но для NestJS ValidationPipe нужны классы с `class-validator`.

Нужно создать в каждом модуле:

```text
src/modules/persons/dto/create-person.dto.ts
src/modules/persons/dto/update-person.dto.ts
src/modules/persons/dto/person-query.dto.ts
```

И аналогично для:

- families
- relationships
- events
- media
- documents
- sources
- citations

#### 5.4.4. CRUD

Нужно реализовать базовую структуру:

```text
GET    /entities
GET    /entities/:id
POST   /entities
PATCH  /entities/:id
DELETE /entities/:id
```

Для MVP DELETE лучше делать soft delete, если Prisma schema будет доработана через `deletedAt`.

#### 5.4.5. Search

Нужно:

- создать Meilisearch client service;
- сделать `GET /search?q=...`;
- на MVP искать хотя бы по:
  - persons;
  - documents;
  - media metadata.

#### 5.4.6. Timeline

Нужно:

- `GET /timeline/person/:personId`;
- собрать события Person из `Event`;
- отсортировать по `dateFrom`;
- вернуть unified DTO для frontend.

### 5.5. Что делать по Backend

Правильный порядок:

1. Сначала доработать Prisma schema.
2. Затем выполнить миграцию.
3. Затем сгенерировать Prisma Client:

```bash
pnpm db:generate
```

4. Реализовать auth.
5. Реализовать RBAC.
6. Реализовать CRUD по основным сущностям.
7. Подключить timeline/search/media.
8. Обновить Swagger decorators.

---

## 6. Промт №4: Prisma schema

### 6.1. Что требовалось

Сущности:

- `User`
- `Person`
- `Family`
- `Relationship`
- `Event`
- `Place`
- `Media`
- `Document`
- `Source`
- `Citation`
- `TimelineItem`
- `AuditLog`

Требования:

- UUID primary keys.
- `createdAt` / `updatedAt` везде.
- soft delete через `deletedAt`.
- расширенная модель Person.
- enum для ролей, пола, типов связей, событий, приватности, владельцев медиа, типов документов.
- seed:
  - admin user;
  - несколько персон;
  - тестовая семья;
  - тестовые связи.

### 6.2. Что уже сделано

| Сущность | Статус |
|---|---:|
| User | Есть |
| Person | Есть частично |
| Family | Есть |
| Relationship | Есть частично |
| Event | Есть частично |
| Place | Есть |
| Media | Есть частично |
| Document | Есть частично |
| Source | Есть |
| Citation | Есть |
| TimelineItem | Есть |
| AuditLog | Есть частично |
| FamilyMember | Дополнительно есть |

### 6.3. Главные несоответствия

| Требование промта | Сейчас | Нужно |
|---|---|---|
| UUID primary keys | `cuid()` | `uuid()` + желательно `@db.Uuid` |
| `deletedAt` | отсутствует | добавить в основные модели |
| `Person.firstName` | `givenName` | привести к `firstName` или осознанно оставить alias |
| `Person.lastName` | `familyName` | привести к `lastName` |
| `Person.middleName` | нет | добавить |
| `Person.birthPlaceId` | нет | добавить связь на `Place` |
| `Person.privacyLevel` | нет | enum `PrivacyLevel` |
| `Person.avatarMediaId` | нет | связь на `Media` |
| `Gender` | `gender String?` | enum `Gender` |
| `Relationship.type` | `String` | enum `RelationshipType` |
| `Relationship.confidence` | нет | добавить |
| `Relationship.sourceId` | нет | связь на `Source` |
| `Event.type` | `String` | enum `EventType` |
| `Event.dateFrom/dateTo` | `date/dateEnd` | переименовать |
| `Media.storageProvider` | нет | добавить |
| `Media.objectKey` | `storageKey` | переименовать |
| `Media.ownerType/ownerId` | нет | добавить |
| `Document.documentType` | нет | enum `DocumentType` |
| `Document.mediaId` | нет | связь на `Media` |
| `Document.ocrText` | нет | добавить |
| `Document.sourceId` | нет | связь на `Source` |
| Seed | нет | создать |

### 6.4. Целевая модель enum

Нужно добавить:

```prisma
enum UserRole {
  ADMIN
  EDITOR
  VIEWER
}

enum Gender {
  MALE
  FEMALE
  OTHER
  UNKNOWN
}

enum RelationshipType {
  PARENT
  CHILD
  SPOUSE
  SIBLING
  ADOPTIVE_PARENT
  UNKNOWN
}

enum EventType {
  BIRTH
  DEATH
  MARRIAGE
  DIVORCE
  BURIAL
  RESIDENCE
  OCCUPATION
  IMMIGRATION
  CUSTOM
}

enum PrivacyLevel {
  PUBLIC
  FAMILY
  PRIVATE
}

enum MediaOwnerType {
  PERSON
  FAMILY
  EVENT
  DOCUMENT
  SOURCE
}

enum DocumentType {
  BIRTH_CERTIFICATE
  DEATH_CERTIFICATE
  MARRIAGE_CERTIFICATE
  PHOTO
  ARCHIVE_RECORD
  PASSPORT
  MILITARY_RECORD
  OTHER
}
```

### 6.5. Целевой порядок доработки Prisma

1. Решить: проект ещё без реальных production-данных?
   - Если да: можно переписать initial schema и миграции проще.
   - Если нет: делать аккуратные миграции без потери данных.

2. Доработать `schema.prisma`.

3. Создать новую миграцию:

```bash
pnpm db:migrate
```

4. Сгенерировать client:

```bash
pnpm db:generate
```

5. Создать seed:

```text
apps/api/prisma/seed.ts
```

6. Добавить scripts:

```json
{
  "db:seed": "pnpm --filter @family/api exec prisma db seed"
}
```

7. Проверить seed:

```bash
pnpm db:seed
```

---

## 7. Промт №5: Frontend Next.js

### 7.1. Что требовалось

Создать frontend `apps/web` на:

- Next.js
- TypeScript
- TailwindCSS
- App Router
- современный интерфейс
- dashboard layout
- sidebar navigation
- shadcn/ui style components
- API client
- auth pages
- protected routes

Страницы MVP:

- `/login`
- `/dashboard`
- `/persons`
- `/persons/[id]`
- `/families`
- `/tree`
- `/timeline`
- `/media`
- `/documents`
- `/search`
- `/settings`

Компоненты:

- `PersonCard`
- `PersonForm`
- `FamilyCard`
- `RelationshipBadge`
- `TreeCanvas`
- `TimelineView`
- `MediaUploader`
- `DocumentCard`
- `SearchBox`
- `PrivacyBadge`

### 7.2. Что уже сделано

| Требование | Статус | Где |
|---|---:|---|
| Next.js app | Сделано | `apps/web` |
| TypeScript | Сделано | `tsconfig.json` |
| TailwindCSS | Сделано | `tailwind.config.ts`, `globals.css` |
| App Router | Сделано | `apps/web/app` |
| Root layout | Частично | `app/layout.tsx` |
| API client | Частично | `lib/api-client.ts` |
| `/persons` | Skeleton | `app/persons/page.tsx` |
| `/tree` | Skeleton | `app/tree/page.tsx` |
| `/search` | Skeleton | `app/search/page.tsx` |
| `@family/ui` package | Частично | только `PlaceholderCard` |
| `/documentation` | Дополнительно сделано | страница документации |

### 7.3. Что отсутствует

Страницы:

| Страница | Статус |
|---|---:|
| `/login` | Нет |
| `/dashboard` | Нет |
| `/persons/[id]` | Нет |
| `/families` | Нет |
| `/timeline` | Нет |
| `/media` | Нет |
| `/documents` | Нет |
| `/settings` | Нет |

Компоненты:

| Компонент | Статус |
|---|---:|
| `PersonCard` | Нет |
| `PersonForm` | Нет |
| `FamilyCard` | Нет |
| `RelationshipBadge` | Нет |
| `TreeCanvas` | Нет |
| `TimelineView` | Нет |
| `MediaUploader` | Нет |
| `DocumentCard` | Нет |
| `SearchBox` | Нет |
| `PrivacyBadge` | Нет |

Архитектурно не хватает:

- auth provider;
- protected routes;
- dashboard shell;
- sidebar;
- theme toggle;
- form system;
- API error handling;
- React Query или аналог для server state;
- real TreeCanvas.

### 7.4. Что делать по Frontend

Правильный порядок:

1. Дождаться стабилизации backend API contracts.
2. Создать UI primitives:
   - `Button`
   - `Card`
   - `Input`
   - `Textarea`
   - `Badge`
   - `Select`
   - `Dialog`
   - `PageHeader`
   - `EmptyState`

3. Создать app shell:
   - `DashboardLayout`
   - `Sidebar`
   - `Topbar`
   - active navigation
   - responsive mobile menu

4. Добавить auth:
   - `/login`
   - хранение token/cookie
   - redirect unauthenticated users
   - logout

5. Добавить страницы:
   - `/dashboard`
   - `/persons`
   - `/persons/[id]`
   - `/families`
   - `/tree`
   - `/timeline`
   - `/media`
   - `/documents`
   - `/search`
   - `/settings`

6. Добавить компоненты из промта.

7. Для TreeCanvas на MVP использовать `@xyflow/react`:
   - быстрее получить pan/zoom/drag;
   - позже можно заменить renderer на Cytoscape.js или D3.js;
   - архитектуру держать через adapter:

```text
TreeCanvas
  |
  |-- TreeRendererAdapter
        |-- ReactFlowRenderer
        |-- FutureCytoscapeRenderer
        |-- FutureD3Renderer
```

---

## 8. Рекомендуемый порядок работ до production

### Phase 0. Зафиксировать базу и правила разработки

Цель: не строить новые модули поверх нестабильной схемы.

Сделать:

1. Проверить git status.
2. Зафиксировать текущую ветку.
3. Решить стратегию Prisma:
   - если данных нет, можно заменить initial migration;
   - если данные важны, делать последовательные миграции.
4. Уточнить production target:
   - VPS provider;
   - domain;
   - SSL;
   - backup storage;
   - single-node или multi-service deployment.

Критерий готовности:

- Понятно, какие данные можно удалять при миграциях, а какие нельзя.

---

### Phase 1. Prisma schema hardening

Цель: создать правильную data model до реализации CRUD.

Сделать:

1. Перевести primary keys на UUID.
2. Добавить `deletedAt`.
3. Добавить enum:
   - `UserRole`
   - `Gender`
   - `RelationshipType`
   - `EventType`
   - `PrivacyLevel`
   - `MediaOwnerType`
   - `DocumentType`
4. Доработать `Person`.
5. Доработать `Relationship`.
6. Доработать `Event`.
7. Доработать `Media`.
8. Доработать `Document`.
9. Расширить `Source/Citation`.
10. Добавить индексы.
11. Создать seed.

Критерий готовности:

- `pnpm db:migrate` проходит.
- `pnpm db:generate` проходит.
- `pnpm db:seed` создаёт admin, персон, семью и связи.

---

### Phase 2. Backend auth + RBAC

Цель: сделать backend защищённым и пригодным для frontend.

Сделать:

1. `POST /auth/register-first-admin`.
2. `POST /auth/login`.
3. Password hashing.
4. JWT access token.
5. `JwtAuthGuard`.
6. `RolesGuard`.
7. `@Roles()` decorator.
8. `@CurrentUser()` decorator.
9. Защитить admin routes.
10. Swagger auth examples.

Критерий готовности:

- Первый admin создаётся только один раз.
- Login возвращает JWT.
- Защищённые routes без token возвращают `401`.
- Routes с недостаточной ролью возвращают `403`.

---

### Phase 3. Backend CRUD MVP

Цель: дать frontend реальные API.

Сделать CRUD для:

1. Persons.
2. Families.
3. Relationships.
4. Events.
5. Places.
6. Media metadata.
7. Documents.
8. Sources.
9. Citations.

Минимальный шаблон endpoint:

```text
GET    /api/v1/persons
GET    /api/v1/persons/:id
POST   /api/v1/persons
PATCH  /api/v1/persons/:id
DELETE /api/v1/persons/:id
```

Критерий готовности:

- CRUD работает через Swagger.
- ValidationPipe отклоняет лишние/невалидные поля.
- Soft delete работает через `deletedAt`.
- Списки не возвращают удалённые записи по умолчанию.

---

### Phase 4. Timeline, Search, Media

Цель: закрыть ключевые пользовательские сценарии MVP.

Сделать:

1. Timeline:
   - собрать события человека;
   - отсортировать;
   - вернуть unified timeline DTO.

2. Search:
   - подключить Meilisearch client;
   - индексировать persons/documents;
   - реализовать `GET /search?q=...`.

3. Media:
   - metadata CRUD;
   - MinIO bucket check;
   - позже presigned upload.

Критерий готовности:

- Поиск возвращает результаты.
- Timeline показывает события.
- Media metadata сохраняется в PostgreSQL.

---

### Phase 5. Frontend app shell + auth

Цель: превратить frontend из skeleton в приложение.

Сделать:

1. `/login`.
2. Auth client.
3. Protected routes.
4. Dashboard layout.
5. Sidebar navigation.
6. Theme toggle.
7. Error/empty/loading states.

Критерий готовности:

- Неавторизованный пользователь попадает на `/login`.
- Авторизованный пользователь видит `/dashboard`.
- Sidebar работает.
- UI адаптивен.

---

### Phase 6. Frontend MVP pages

Цель: закрыть основные страницы пользователя.

Сделать:

1. `/dashboard`.
2. `/persons`.
3. `/persons/[id]`.
4. `/families`.
5. `/tree`.
6. `/timeline`.
7. `/media`.
8. `/documents`.
9. `/search`.
10. `/settings`.

Критерий готовности:

- Каждая страница использует реальный API или явно показывает controlled empty state.
- Формы создают/обновляют данные.
- Ошибки API отображаются пользователю.

---

### Phase 7. Tree visualization MVP

Цель: получить первую рабочую визуализацию семейного дерева.

Сделать:

1. Добавить `@xyflow/react` или D3.js.
2. Создать `TreeCanvas`.
3. Создать adapter для renderer.
4. Получать persons + relationships из API.
5. Строить nodes/edges.
6. Добавить zoom/pan.
7. Добавить click на Person node.

Критерий готовности:

- `/tree` показывает базовое дерево.
- Можно открыть карточку персоны.
- Архитектура не привязана жёстко к одному graph engine.

---

### Phase 8. Production Docker + VPS

Цель: подготовить безопасную публикацию.

Сделать:

1. Исправить prod compose networks.
2. Закрыть инфраструктурные порты.
3. Настроить Nginx.
4. Настроить SSL.
5. Настроить `.env.production`.
6. Настроить backup.
7. Добавить deploy checklist.
8. Проверить restart policy.

Критерий готовности:

- Снаружи доступны только `80/443`.
- API доступен через `/api`.
- Web доступен по domain.
- Базы не торчат наружу.
- Backup создаётся и проверяется restore.

---

### Phase 9. Production quality gates

Цель: перед публикацией убедиться, что проект не развалится при первом использовании.

Минимальные проверки:

```bash
pnpm install
pnpm build
pnpm lint
pnpm db:generate
pnpm db:migrate
```

Дополнительно:

- Проверить Swagger.
- Проверить login.
- Проверить CRUD.
- Проверить frontend routes.
- Проверить Docker dev.
- Проверить Docker prod config.
- Проверить backup.
- Проверить `.env.example`.
- Проверить отсутствие секретов в git.

Критерий готовности:

- Сборка проходит.
- Миграции проходят.
- Основные сценарии вручную проверены.
- Нет секретов в репозитории.
- Есть инструкция запуска и восстановления.

---

## 9. Production readiness checklist

### 9.1. Security

- [ ] Нет production fallback-паролей в compose.
- [ ] `.env` не коммитится.
- [ ] `.env.example` не содержит реальных секретов.
- [ ] JWT secret длинный и уникальный.
- [ ] Password hashing включён.
- [ ] Admin создаётся безопасно.
- [ ] RBAC работает.
- [ ] Infrastructure ports закрыты в prod.
- [ ] CORS настроен.
- [ ] Rate limiting добавлен хотя бы на auth routes.

### 9.2. Database

- [ ] UUID primary keys.
- [ ] Soft delete.
- [ ] Индексы на FK и поисковые поля.
- [ ] Миграции воспроизводимы.
- [ ] Seed работает.
- [ ] Backup работает.
- [ ] Restore проверен.

### 9.3. Backend

- [ ] Auth работает.
- [ ] RBAC работает.
- [ ] CRUD работает.
- [ ] DTO validation работает.
- [ ] Swagger актуален.
- [ ] Ошибки возвращаются в едином формате.
- [ ] Health endpoint есть.
- [ ] Логи не содержат секретов.

### 9.4. Frontend

- [ ] Login page.
- [ ] Protected routes.
- [ ] Dashboard layout.
- [ ] Sidebar.
- [ ] MVP pages.
- [ ] TreeCanvas.
- [ ] Loading states.
- [ ] Empty states.
- [ ] Error states.
- [ ] Светлая/тёмная тема.
- [ ] Адаптивность.

### 9.5. Infrastructure

- [ ] Docker dev работает.
- [ ] Docker prod config безопасен.
- [ ] Nginx проксирует web/api.
- [ ] SSL настроен.
- [ ] Volumes настроены.
- [ ] Backups настроены.
- [ ] Логи можно смотреть.
- [ ] Есть инструкция запуска после перезагрузки VPS.

---

## 10. Рекомендуемый ближайший план на 10 рабочих шагов

### Шаг 1. Доработать Prisma schema

Почему первым: Prisma задаёт контракт данных для backend и frontend. Если её поменять позже, придётся переписывать CRUD, DTO и UI.

Результат:

- новая schema;
- новая migration;
- Prisma client generated.

### Шаг 2. Добавить seed

Почему: без seed неудобно проверять backend/frontend.

Результат:

- admin user;
- тестовые persons;
- family;
- relationships;
- events.

### Шаг 3. Реализовать auth

Почему: protected frontend и RBAC зависят от этого.

Результат:

- register first admin;
- login;
- JWT.

### Шаг 4. Реализовать RBAC

Почему: production без ролей опасен.

Результат:

- roles decorator;
- roles guard;
- protected admin routes.

### Шаг 5. Реализовать CRUD Person/Family/Relationship/Event

Почему: это ядро семейного древа.

Результат:

- Swagger позволяет создать дерево вручную.

### Шаг 6. Реализовать Timeline/Search/Media metadata

Почему: это ключевые фичи MVP.

Результат:

- timeline endpoint;
- search endpoint;
- media metadata endpoint.

### Шаг 7. Сделать frontend auth + dashboard shell

Почему: без shell приложение выглядит как набор страниц.

Результат:

- login;
- dashboard;
- sidebar;
- protected routes.

### Шаг 8. Сделать MVP pages и components

Почему: пользователь должен управлять данными через UI.

Результат:

- persons/families/tree/timeline/media/documents/search/settings.

### Шаг 9. Исправить Docker prod

Почему: перед VPS нельзя публиковать базы наружу.

Результат:

- безопасный production compose.

### Шаг 10. Финальная проверка и публикация

Почему: production - это не только запуск, но и восстановление после сбоя.

Результат:

- build ok;
- migrations ok;
- backup ok;
- domain/SSL ok.

---

## 11. Что не нужно делать прямо сейчас

Не стоит делать на этом этапе:

- сложную AI-логику;
- VR/3D режим;
- продвинутую graph analytics;
- полноценный GEDCOM importer;
- сложную систему документов с OCR pipeline;
- микросервисную архитектуру;
- Kubernetes;
- premature optimization.

Почему: сначала нужна стабильная MVP-платформа с правильной схемой, auth, CRUD, tree, media и search. Остальное можно добавлять после публикации базовой версии.

---

## 12. Финальный verdict

Проект находится на правильной архитектурной траектории, но сейчас это ещё не production-ready продукт. Уже сделаны важные основы:

- monorepo;
- Docker-инфраструктура;
- NestJS skeleton;
- Prisma initial schema;
- Next.js skeleton;
- документация локального запуска.

Главные недостающие части:

- полноценная Prisma schema;
- seed;
- JWT auth;
- RBAC;
- CRUD;
- frontend pages/components;
- TreeCanvas;
- безопасный Docker prod;
- backup/restore;
- production deployment checklist.

Самый правильный следующий шаг: **доработать Prisma schema и seed**, затем реализовать backend auth/RBAC/CRUD, и только после этого активно строить frontend. Это даст устойчивую основу, на которой можно довести проект до публикации и дальнейшего production-уровня.
