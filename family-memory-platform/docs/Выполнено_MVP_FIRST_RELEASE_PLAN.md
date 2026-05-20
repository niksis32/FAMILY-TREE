# Выполнено: MVP первого релиза: статус и структурный план работ

Дата: 20.05.2026

Статус копии: выполнено по пунктам `3.2. Docker и инфраструктура`, `3.3. Prisma schema`, `3.4. Backend NestJS`, `3.5. Frontend Next.js`, `3.6. Genealogy Core` и P0-блокерам `P0.1-P0.3` на уровне локальных code/build checks.

Что закрыто в этой копии:

- Разделены `base/dev/prod` Docker Compose по публикации портов.
- Production secrets переведены на обязательные `${VAR:?required}`.
- `minio-init` отвязан от profile `apps` и запускается с dev-инфраструктурой.
- Добавлены PostgreSQL restore, MinIO sync, Meilisearch dump и Neo4j dump scripts.
- Проверены `docker compose config` для dev, prod и prod + profile `graph`.
- Доработана Prisma schema: enum, soft delete, `MediaLink`, индексы, migration.
- Добавлен и выполнен seed: admin, demo family, demo persons, demo relationships, demo events.
- Проверены Prisma validate/generate/migrate/seed и API TypeScript type-check.
- Реализованы backend auth/RBAC primitives, `users/me` и CRUD для core entities.
- Подключён best-effort search indexing к `Person/Document/Source/Place`.
- Frontend подключён к real API/JWT для dashboard, persons, families, relationships, timeline admin, media, documents, sources и citations.
- Genealogy Core расширен validation rules/GEDCOM mapping и подключён к backend Relationship CRUD.
- P0.1-P0.3 задокументированы с фактическими проверками сборки, migrations/seed и Auth/RBAC; остаток вынесен в clean-install/runtime smoke gates.

Следующий переход разрешён к runtime browser smoke и следующим MVP-пунктам, но перед CI/production остаются clean-install check и runtime-проверка backup/restore на живых контейнерах.

Документ фиксирует, что уже сделано в `family-memory-platform`, что готово частично и что нужно закрыть, чтобы получить первый рабочий MVP-релиз:

- авторизация;
- роли `admin/editor/viewer`;
- люди, семьи, родственные связи;
- события, места, timeline;
- фото/файлы через MinIO;
- документы, источники, цитаты;
- поиск;
- GEDCOM import preview;
- простое интерактивное дерево;
- Docker Compose;
- GitHub-ready;
- VPS-ready architecture.

Документ дополняет:

- `docs/PRODUCTION_READINESS_WORK_PLAN.md`;
- `docs/ARCHITECTURE.md`;
- `docs/DEPLOY_LOCAL.md`;
- `docs/DEPLOY_VPS.md`;
- `docs/ROADMAP.md`;
- `docs/SECURITY.md`;
- `docs/LOCAL_COMMANDS_REFERENCE.md`;
- `docs/DOCKER_LOCAL_WINDOWS*.md`.

---

## 1. Executive Summary

Проект уже имеет правильную архитектурную базу:

- monorepo `pnpm + Turbo`;
- `apps/web` на Next.js;
- `apps/api` на NestJS;
- `apps/ai-service` на FastAPI как optional слой;
- `packages/genealogy-core` с чистой genealogy-логикой;
- Docker Compose инфраструктура;
- PostgreSQL, Redis, MinIO, Meilisearch;
- optional Neo4j и AI profiles;
- GitHub-facing документация и CI skeleton.

Но первый релиз пока нельзя считать готовым, потому что критичные production/MVP блоки остаются частично реализованными:

1. Нет полноценной backend-авторизации JWT/RBAC.
2. Нет стабильного CRUD по основным сущностям.
3. Prisma P0 закрыт локально, но нужен clean-install/CI check.
4. Frontend местами работает через demo fallback/mock data.
5. CI может падать, пока не стабилизированы API build, Prisma generate и тестовые scripts.
6. Production Docker/VPS архитектура усилена локально, но требует runtime-проверки backup/restore.

Главный принцип дальнейшей работы:

```text
Сначала стабилизировать data model + auth + CRUD,
потом подключить frontend к реальному API,
затем закрыть production quality gates.
```

---

## 2. Статус MVP-функционала

| Функция | Текущий статус | Что уже есть | Что нужно доделать до релиза |
|---|---:|---|---|
| Авторизация | Частично | `/login` на frontend, auth provider, demo session | Реальный backend login, register-first-admin, password hashing, JWT |
| Роли `admin/editor/viewer` | Частично | `UserRole` в Prisma: `MEMBER/EDITOR/ADMIN` | Привести роли к `admin/editor/viewer`, добавить guards/decorators |
| Люди | Частично | Prisma `Person`, frontend `/persons`, карточки | Backend CRUD, формы create/update, validation |
| Семьи | Частично | Prisma `Family`, `FamilyMember`, frontend `/families` | Backend CRUD, управление участниками семьи |
| Родственные связи | Частично | Prisma `Relationship`, genealogy-core rules, tree API | CRUD, validation cycles/age в API, UI управления связями |
| События | Частично | Prisma `Event`, GEDCOM import creates events | CRUD, event type enum, forms |
| Места | Skeleton | Prisma `Place`, API module skeleton | CRUD, привязка к событиям, UI |
| Фото/файлы через MinIO | Частично | Presigned upload/download, metadata endpoint, frontend uploader | Проверка bucket, gallery from API, universal media links |
| Документы | Частично | Prisma `Document`, frontend documents page | CRUD, upload flow, OCR-ready fields |
| Источники | Skeleton | Prisma `Source`, API module skeleton | CRUD, search indexing, UI |
| Цитаты | Skeleton | Prisma `Citation`, API module skeleton | CRUD, связь с Person/Source/Document |
| Timeline | Частично | `/timeline/person/:id`, frontend timeline filters | Реальные event CRUD, связи media/documents с событиями |
| Поиск | Частично | `/search?q=`, Meilisearch adapter, frontend categorized search | Автоиндексация при create/update, initial reindex UX |
| GEDCOM import preview | Частично | `/gedcom/preview`, `/gedcom/import`, frontend `/settings/import` | Conflict resolution, import transaction, dry-run report polish |
| Простое дерево | Частично | `/tree/person/:id/*`, React Flow TreeCanvas, PersonDetails panel | Seed/real data, UI выбора root person, performance limits |
| Docker Compose | P0 закрыт, runtime-check нужен | base/dev/prod compose, profiles `graph`, `ai`, закрытые prod-порты, обязательные prod secrets, MinIO init, backup scripts | Проверить `up -d` и backup/restore на живом окружении |
| GitHub-ready | Частично/почти | README, CONTRIBUTING, docs, CI workflow | Сделать CI зелёным после стабилизации build/test |
| VPS-ready architecture | Частично | `docs/DEPLOY_VPS.md`, prod compose, nginx skeleton | SSL, domain, backup/restore, финальная security checklist |

---

## 3. Что уже сделано

### 3.1. Репозиторий и структура

Сделано:

- Создан monorepo `family-memory-platform`.
- Основные зоны разделены:
  - `apps/web`;
  - `apps/api`;
  - `apps/ai-service`;
  - `packages/shared`;
  - `packages/genealogy-core`;
  - `packages/ui`;
  - `infra`;
  - `docs`.
- Добавлены root scripts:
  - `dev`;
  - `build`;
  - `lint`;
  - `test`;
  - `docker:up`;
  - `docker:down`;
  - `docker:infra`;
  - `docker:infra:down`;
  - `db:generate`;
  - `db:migrate`.

Нужно:

- Убедиться, что `npm install`/`npm run ...` и `pnpm ...` одинаково понятны в документации.
- После стабилизации зависимостей проверить чистый install на новой машине/CI.

### 3.2. Docker и инфраструктура

Сделано:

- `docker-compose.yml`.
- `docker-compose.dev.yml`.
- `docker-compose.prod.yml`.
- PostgreSQL.
- Redis.
- MinIO.
- Meilisearch.
- Optional Neo4j profile `graph`.
- Optional AI profile `ai`.
- Volumes для основных сервисов.
- Healthchecks для части инфраструктуры.
- Base compose больше не публикует инфраструктурные порты наружу.
- Dev overlay публикует локальные порты PostgreSQL, Redis, MinIO, Meilisearch и Neo4j.
- Prod overlay держит PostgreSQL, Redis, MinIO, Meilisearch и Neo4j во внутренней сети `family_internal`; наружу публикуются только `nginx:80/443`.
- Production secrets для PostgreSQL, MinIO, Meilisearch, JWT, frontend API URL и Neo4j отмечены как обязательные через `${VAR:?required}`.
- `minio-init` запускается вместе с dev-инфраструктурой и больше не привязан к profile `apps`.
- Добавлены backup/restore scripts:
  - `infra/scripts/backup-postgres.sh`;
  - `infra/scripts/restore-postgres.sh`;
  - `infra/scripts/backup-minio.sh`;
  - `infra/scripts/backup-meilisearch.sh`;
  - `infra/scripts/backup-neo4j.sh`.

Проверено:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml config
docker compose -f docker-compose.yml -f docker-compose.prod.yml config
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile graph config
```

Осталось проверить перед production:

- Runtime-запуск `docker compose ... up -d` на чистом окружении/VPS.
- Фактическое выполнение backup/restore на живых контейнерах и тестовое восстановление в отдельное окружение.

### 3.3. Prisma schema

Сделано:

- Есть модели:
  - `User`;
  - `Person`;
  - `Family`;
  - `FamilyMember`;
  - `Relationship`;
  - `Event`;
  - `Place`;
  - `Media`;
  - `Document`;
  - `Source`;
  - `Citation`;
  - `TimelineItem`;
  - `AuditLog`.
- Добавлены enum:
  - `UserRole` = `VIEWER/EDITOR/ADMIN`;
  - `Gender`;
  - `RelationshipType`;
  - `EventType`;
  - `PrivacyLevel`;
  - `MediaOwnerType`;
  - `StorageProvider`;
  - `DocumentType`.
- Добавлен soft delete через `deletedAt` для ключевых моделей:
  - `User`;
  - `Person`;
  - `Family`;
  - `FamilyMember`;
  - `Relationship`;
  - `Event`;
  - `Place`;
  - `Media`;
  - `Document`;
  - `Source`;
  - `Citation`;
  - `TimelineItem`.
- Добавлена универсальная связь файлов `MediaLink`:
  - `mediaId`;
  - `ownerType`;
  - `ownerId`;
  - unique key `[mediaId, ownerType, ownerId]`.
- Доработаны `Media` и `Document`:
  - `Media.storageProvider`;
  - unique key `[bucket, storageKey]`;
  - `Document.documentType`;
  - `Document.mediaId`;
  - `Document.sourceId`;
  - `Document.ocrText`.
- Доработаны связи и качество данных:
  - `Relationship.type` переведён на enum;
  - `Relationship.confidence`;
  - `Relationship.sourceId`;
  - `Event.type` переведён на enum;
  - `Person.privacyLevel`.
- Добавлены индексы для частых запросов:
  - поиск людей по `familyName/givenName`;
  - даты рождения/смерти;
  - living/privacy фильтры;
  - relationship/event типы;
  - timeline/event связи;
  - media/document/source/citation связи;
  - `deletedAt`.
- Зафиксирована миграция:
  - `apps/api/prisma/migrations/20260520075800_prisma_schema_hardening/migration.sql`.
- Добавлен seed:
  - `apps/api/prisma/seed.js`;
  - первый admin `admin@example.local`;
  - demo family;
  - demo persons;
  - demo relationships;
  - demo events;
  - demo source.
- Добавлены scripts:
  - root `db:seed`;
  - Prisma seed command в `apps/api/package.json`.
- Backend-код синхронизирован с enum:
  - GEDCOM import создаёт `Gender`, `EventType`, `RelationshipType` в Prisma-формате;
  - media linking пишет `MediaLink`, а не только audit fallback.

Проверено:

```bash
npx --yes prisma@6.1.0 validate --schema .\apps\api\prisma\schema.prisma
npx --yes prisma@6.1.0 format --schema .\apps\api\prisma\schema.prisma
npx --yes prisma@6.1.0 generate --schema .\apps\api\prisma\schema.prisma
npx --yes prisma@6.1.0 migrate deploy --schema .\apps\api\prisma\schema.prisma
node .\apps\api\prisma\seed.js
node .\node_modules\.pnpm\typescript@5.9.3\node_modules\typescript\bin\tsc -p .\apps\api\tsconfig.json --noEmit
```

Результат проверок:

- Prisma schema valid.
- Prisma Client generated.
- Миграция `20260520075800_prisma_schema_hardening` применена к локальному `family_postgres`.
- Seed выполнен: создан `admin@example.local` и demo family `Семья Петровых`.
- API TypeScript type-check проходит.

Осталось проверить перед переходом в CI/production:

- Чистый `CI=true pnpm install --frozen-lockfile` в WSL/Ubuntu или CI.
- `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:seed` именно через стандартные project scripts после нормализации локального `pnpm exec`/shell окружения.
- Решить отдельно, нужен ли полный переход с `cuid()` на UUID `@db.Uuid`; для текущего MVP этот пункт не блокирует CRUD/tree/timeline.
- Решить отдельно, нужно ли переименование `givenName/familyName/date/dateEnd/storageKey` в более enterprise-термины. Сейчас имена сохранены, чтобы не ломать backend/frontend сверх пункта `3.3`.

### 3.4. Backend NestJS

Сделано:

- Зарегистрирована модульная структура.
- Есть модули:
  - `auth`;
  - `users`;
  - `persons`;
  - `families`;
  - `relationships`;
  - `events`;
  - `places`;
  - `media`;
  - `documents`;
  - `sources`;
  - `citations`;
  - `timeline`;
  - `search`;
  - `gedcom`;
  - `tree`;
  - `ai`;
  - `admin`.
- Добавлены реальные MVP-заготовки:
  - media presigned URLs;
  - search endpoint;
  - GEDCOM preview/import;
  - timeline endpoint;
  - tree endpoints;
  - AI proxy с disabled mode.
- Реализована базовая auth/RBAC-основа:
  - `POST /auth/register-first-admin`;
  - `POST /auth/login`;
  - password hashing через `crypto.scrypt`;
  - JWT access token через `@nestjs/jwt`;
  - `JwtAuthGuard`;
  - `RolesGuard`;
  - `@Roles(...)`;
  - `@CurrentUser()`;
  - `GET /users/me`.
- Реализован CRUD с soft delete для core entities:
  - `persons`;
  - `families`;
  - `relationships`;
  - `events`;
  - `places`;
  - `documents`;
  - `sources`;
  - `citations`.
- Для write-операций включён RBAC:
  - `ADMIN/EDITOR` для create/update;
  - `ADMIN` для delete;
  - read endpoints оставлены открытыми для MVP frontend и демо-данных.
- Добавлены DTO с `class-validator` и Swagger-compatible `PartialType` для update endpoints.
- Подключён `SearchService` к create/update:
  - `Person`;
  - `Document`;
  - `Source`;
  - `Place`.
- Search indexing сделан best-effort: ошибка Meilisearch не блокирует основную запись в PostgreSQL.
- `SearchService` доработан:
  - исключает `deletedAt != null`;
  - добавлены `indexSource`;
  - добавлен `indexPlace`.
- `MediaService` доработан под новую Prisma-связь `MediaLink`.

Проверено:

```bash
node .\node_modules\.pnpm\typescript@5.9.3\node_modules\typescript\bin\tsc -p .\apps\api\tsconfig.json --noEmit
```

Результат проверок:

- API TypeScript type-check проходит.
- Prisma Client типы совместимы с обновлёнными services/controllers.
- Skeleton responses в перечисленных CRUD-модулях заменены реальными Prisma-вызовами.

Осталось проверить перед переходом к frontend/API integration:

- Runtime smoke через Swagger:
  - register first admin;
  - login;
  - copy Bearer token;
  - create/update/delete Person;
  - create/update/delete Family;
  - create/update/delete Relationship;
  - create/update/delete Event;
  - create/update/delete Place;
  - create/update/delete Document;
  - create/update/delete Source;
  - create/update/delete Citation.
- Проверить, что frontend формы используют uppercase enum значения Prisma (`MALE`, `PARENT`, `BIRTH` и т.д.).
- Добавить единый response envelope только если он действительно нужен frontend-контракту; сейчас NestJS возвращает прямые DTO/Prisma objects.
- Добавить e2e/manual Swagger checklist отдельным документом только по отдельному запросу.

### 3.5. Frontend Next.js

Сделано:

- App Router.
- Dashboard shell.
- Sidebar.
- Theme toggle.
- Auth provider с real JWT session.
- Protected routes через middleware.
- Страницы:
  - `/login`;
  - `/dashboard`;
  - `/persons`;
  - `/persons/[id]`;
  - `/families`;
  - `/tree`;
  - `/timeline`;
  - `/media`;
  - `/documents`;
  - `/search`;
  - `/settings`;
  - `/settings/import`.
- Компоненты:
  - `PersonCard`;
  - `PersonForm`;
  - `FamilyCard`;
  - `RelationshipBadge`;
  - `TreeCanvas`;
  - `TreeExplorer`;
  - `TimelineView`;
  - `MediaUploader`;
  - `DocumentCard`;
  - `SearchPanel`;
  - `PrivacyBadge`;
  - GEDCOM import panel.
- Demo/mock fallback заменён на controlled states в ключевых местах:
  - login;
  - dashboard metrics;
  - persons list/details;
  - families/relationships;
  - tree explorer;
  - media gallery;
  - documents/sources/citations.
- JWT подключён к frontend:
  - `AuthProvider` больше не создаёт demo session при ошибке backend;
  - `POST /auth/login` сохраняет реальный `accessToken`;
  - cookie `family_access_token` используется middleware;
  - login page показывает ошибку backend вместо silent fallback;
  - добавлена кнопка `Создать первого admin` через `POST /auth/register-first-admin`.
- Расширен `apps/web/lib/api-client.ts`:
  - `GET/POST/PATCH/DELETE`;
  - typed endpoints для `persons`;
  - `families`;
  - `relationships`;
  - `events`;
  - `places`;
  - `documents`;
  - `sources`;
  - `citations`;
  - `users/me`;
  - `register-first-admin`.
- Подключены реальные CRUD UI/workspaces:
  - `PersonsWorkspace`:
    - list из `/persons`;
    - create person;
    - loading/empty/error states;
    - uppercase Prisma enum values `MALE/FEMALE/UNKNOWN`, `PUBLIC/FAMILY/PRIVATE`.
  - `FamiliesWorkspace`:
    - list из `/families`;
    - create family;
    - relationship list из `/relationships`;
    - create relationship.
  - `TimelineAdminWorkspace`:
    - list/create events;
    - list/create places;
    - uppercase `EventType`.
  - `DocumentsWorkspace`:
    - list/create documents;
    - list/create sources;
    - list/create citations.
  - `MediaGallery`:
    - list из `/media`;
    - empty/error states.
  - `DashboardOverview`:
    - metrics из `/persons`, `/families`, `/media`, `/documents`.
  - `PersonDetailsWorkspace`:
    - profile из `/persons/:id`.
- `TreeExplorer` больше не показывает hardcoded demo graph при ошибке API:
  - пустой graph state;
  - понятный status/error;
  - root person должен быть реальным ID из API.
- `MediaUploader` сохранён как рабочий MinIO flow:
  - presigned URL;
  - PUT в MinIO;
  - metadata в backend;
  - personId binding.
- `SearchPanel` уже работает через real `/search` и оставлен без mock fallback.

Проверено:

```bash
node .\node_modules\.pnpm\typescript@5.9.3\node_modules\typescript\bin\tsc -p .\apps\web\tsconfig.json --noEmit
```

Результат проверок:

- Web TypeScript type-check проходит.
- Frontend типы совместимы с текущими API contracts.
- Страницы больше не завязаны на `mock-data` для основного MVP flow:
  - dashboard;
  - persons;
  - person details;
  - families;
  - timeline admin CRUD;
  - media gallery;
  - documents/sources/citations.

Осталось проверить в браузере после запуска `api` и `web`:

- `/login`:
  - create first admin;
  - login;
  - logout;
  - middleware redirect без token.
- `/persons`:
  - create person;
  - list refresh;
  - переход в `/persons/:id`.
- `/families`:
  - create family;
  - create relationship по реальным Person ID.
- `/timeline`:
  - create place;
  - create event с `personId/familyId/placeId`.
- `/documents`:
  - create source;
  - create document metadata;
  - create citation.
- `/media`:
  - upload file в MinIO;
  - metadata появляется в gallery.
- `/search`:
  - reindex/search после create/update.

### 3.6. Genealogy Core

Сделано:

- `packages/genealogy-core` независим от NestJS/Next.js.
- Реализованы:
  - `buildAncestorTree`;
  - `buildDescendantTree`;
  - `detectRelationshipCycles`;
  - `validateParentChildAge`;
  - `calculatePersonPrivacy`;
  - `hideLivingPersonsForPublicView`;
  - `buildTimeline`;
  - GEDCOM person mapper.
- Есть unit tests на `node:test`.
- Расширены validation rules:
  - проверка `Gender`;
  - проверка `PrivacyLevel`;
  - проверка parseable `birthDate`;
  - проверка parseable `deathDate`;
  - проверка порядка дат birth/death;
  - проверка неизвестного relationship type;
  - проверка duplicate relationships;
  - проверка duplicate symmetric relationships (`spouse`, `sibling`, `partner`);
  - сохранены проверки missing persons, self-reference, parent-child cycles и parent-child age.
- Расширены GEDCOM mapping cases:
  - нормализация `sex` без зависимости от регистра;
  - поддержка `F`, `M`, `X`, `O`;
  - формат имени `Given /Family/`;
  - fallback для `Family, Given`;
  - fallback для имени без GEDCOM slash-синтаксиса;
  - export `other` gender как `X`.
- `RelationshipType` в core расширен значением `unknown`, чтобы не падать на неполных/неизвестных импортированных данных.
- Core rules подключены в backend CRUD relationships:
  - `RelationshipsService.create`;
  - `RelationshipsService.update`;
  - проверяется весь активный набор relationships;
  - soft-deleted relationships исключаются;
  - Prisma enum приводится к lowercase core enum;
  - ошибки core validation возвращаются как `BadRequestException` с массивом `issues`.

Проверено:

```powershell
node .\node_modules\.pnpm\typescript@5.9.3\node_modules\typescript\bin\tsc -p .\packages\genealogy-core\tsconfig.json --noEmit
node .\node_modules\.pnpm\typescript@5.9.3\node_modules\typescript\bin\tsc -p .\apps\api\tsconfig.json --noEmit
node .\node_modules\.pnpm\typescript@5.9.3\node_modules\typescript\bin\tsc -p .\packages\genealogy-core\tsconfig.json
node --test "packages/genealogy-core/test/**/*.test.mjs"
```

Результат проверок:

- `genealogy-core` TypeScript type-check проходит.
- API TypeScript type-check проходит после подключения core rules.
- Существующие unit tests `genealogy-core` проходят: `9/9`.

Осталось проверить позже:

- Runtime сценарии Relationship CRUD через Swagger/browser:
  - попытка создать parent-child cycle;
  - попытка создать duplicate spouse/sibling/partner;
  - попытка создать parent-child с нереалистичной разницей возраста.
- Добавить новые unit-test cases для расширенного GEDCOM mapping и duplicate validation только отдельным запросом, чтобы не создавать/расширять тестовые файлы без прямого указания.

### 3.7. AI Service

Сделано:

- `apps/ai-service` на FastAPI.
- Endpoints:
  - `GET /health`;
  - `POST /ocr/preview`;
  - `POST /relationship/suggest`;
  - `POST /timeline/summary`.
- Dockerfile.
- Docker profile `ai`.
- NestJS `AiModule` с graceful disabled response.

Нужно:

- Пока ничего обязательного для первого MVP.
- Позже:
  - Tesseract/PaddleOCR;
  - local LLM;
  - embeddings;
  - AI relationship inference.

### 3.8. GitHub-ready

Сделано:

- `.gitignore`.
- `README.md`.
- `CONTRIBUTING.md`.
- `docs/ARCHITECTURE.md`.
- `docs/DEPLOY_LOCAL.md`.
- `docs/DEPLOY_VPS.md`.
- `docs/ROADMAP.md`.
- `docs/SECURITY.md`.
- GitHub Actions workflow.

Нужно:

- Сделать CI зелёным после исправления Prisma/API build.
- Добавить `LICENSE`.
- Добавить issue/PR templates при публикации.
- Проверить отсутствие секретов.

---

## 4. P0-блокеры первого релиза

Эти задачи нужно закрыть до любых новых фич.

### P0.1. Восстановить стабильную сборку проекта

Статус:

- Кодовая часть P0.1 локально стабилизирована:
  - Prisma Client генерируется;
  - `@family/shared` собирается;
  - `@family/genealogy-core` собирается;
  - API type-check проходит;
  - API build через локальный Nest CLI проходит;
  - Web type-check проходит;
  - Web production build компилирует код, типы и static pages.
- Остаточный blocker только инфраструктурный для текущего Windows/WSL `node_modules`:
  - `next build` падает на `EACCES` при чтении `node_modules/.pnpm/sharp.../@img/sharp-libvips-linux-x64/package.json`;
  - это соответствует ранее описанной проблеме platform-specific dependencies и должно закрываться clean install в одном окружении.

Проверено:

```powershell
node .\node_modules\.pnpm\typescript@5.9.3\node_modules\typescript\bin\tsc -p .\packages\shared\tsconfig.json
node .\node_modules\.pnpm\typescript@5.9.3\node_modules\typescript\bin\tsc -p .\packages\genealogy-core\tsconfig.json
node .\node_modules\.pnpm\typescript@5.9.3\node_modules\typescript\bin\tsc -p .\apps\api\tsconfig.json --noEmit
node .\node_modules\.pnpm\typescript@5.9.3\node_modules\typescript\bin\tsc -p .\apps\web\tsconfig.json --noEmit
node .\node_modules\.pnpm\@nestjs+cli@10.4.9\node_modules\@nestjs\cli\bin\nest.js build --path .\apps\api\tsconfig.json
```

Также проверен `next build` из правильной папки `apps/web`:

```powershell
$env:NEXT_PUBLIC_API_URL='http://localhost:4000/api/v1'
node ..\..\node_modules\.pnpm\next@15.5.18_react-dom@19.2.6_react@19.2.6__react@19.2.6\node_modules\next\dist\bin\next build
```

Результат:

- compile успешно;
- lint/type-check успешно;
- static pages generated успешно;
- падение только на финальном trace шаге из-за `EACCES` в `sharp-libvips-linux-x64`.

Критерий готовности:

- В чистом WSL/Ubuntu или CI выполнить:

```bash
CI=true pnpm install --frozen-lockfile
pnpm db:generate
pnpm --filter @family/shared build
pnpm --filter @family/genealogy-core build
pnpm --filter @family/api build
pnpm --filter @family/web build
pnpm build
```

- `pnpm build` проходит без `sharp`/platform-specific dependency ошибок.
- GitHub Actions проходит.

### P0.2. Зафиксировать Prisma migrations

Статус:

- Текущая schema проверена.
- Initial migration оставлена как базовая история.
- Добавлена отдельная migration hardening:
  - `apps/api/prisma/migrations/20260520075800_prisma_schema_hardening/migration.sql`.
- Добавлен seed:
  - `apps/api/prisma/seed.js`.
- Добавлен root script:
  - `db:seed`.
- Миграции применены к локальному `family_postgres`.
- Seed выполнен повторно и идемпотентно.
- Дополнительно проверено создание схемы с нуля на временной базе `family_platform_p0_check`.

Проверено:

```powershell
$env:DATABASE_URL='postgresql://family_user:change_me_postgres@localhost:5432/family_platform?schema=public'
npx --yes prisma@6.1.0 migrate status --schema .\apps\api\prisma\schema.prisma
node .\apps\api\prisma\seed.js
```

Проверка clean database:

```powershell
docker exec family_postgres psql -U family_user -d postgres -c "DROP DATABASE IF EXISTS family_platform_p0_check;"
docker exec family_postgres psql -U family_user -d postgres -c "CREATE DATABASE family_platform_p0_check;"
$env:DATABASE_URL='postgresql://family_user:change_me_postgres@localhost:5432/family_platform_p0_check?schema=public'
npx --yes prisma@6.1.0 migrate deploy --schema .\apps\api\prisma\schema.prisma
node .\apps\api\prisma\seed.js
docker exec family_postgres psql -U family_user -d postgres -c "DROP DATABASE IF EXISTS family_platform_p0_check;"
```

Результат:

- `2 migrations found`;
- `Database schema is up to date`;
- на временной чистой БД применены:
  - `20260519145419_init`;
  - `20260520075800_prisma_schema_hardening`;
- `All migrations have been successfully applied`;
- `Seed completed. Admin: admin@example.local, family: Семья Петровых`.

Критерий готовности:

- Схема создаётся с нуля через `migrate deploy` на пустой PostgreSQL database.
- Новый разработчик может выполнить `pnpm db:generate && pnpm db:migrate && pnpm db:seed` без ручных правок после clean install.
- В текущем Windows shell остаётся отдельная проблема `pnpm exec prisma`/`sh` окружения; через прямой Prisma CLI schema/migrate/seed работают.

### P0.3. Реализовать Auth + RBAC

Статус:

- Реализовано:
  - `POST /auth/register-first-admin`;
  - `POST /auth/login`;
  - password hashing через `crypto.scrypt`;
  - JWT access token через `@nestjs/jwt`;
  - `JwtAuthGuard`;
  - `RolesGuard`;
  - `@Roles(...)`;
  - `@CurrentUser()`;
  - `GET /users/me`;
  - роли Prisma/API: `ADMIN`, `EDITOR`, `VIEWER`;
  - frontend login работает через real JWT без demo fallback;
  - middleware использует cookie `family_access_token`.
- Защита API routes:
  - mutation routes в `persons`, `families`, `relationships`, `events`, `places`, `documents`, `sources`, `citations` требуют token;
  - create/update доступны `ADMIN/EDITOR`;
  - delete доступен `ADMIN`;
  - read endpoints пока открыты для MVP/demo frontend.

Проверено:

```powershell
node .\node_modules\.pnpm\typescript@5.9.3\node_modules\typescript\bin\tsc -p .\apps\api\tsconfig.json --noEmit
node .\node_modules\.pnpm\typescript@5.9.3\node_modules\typescript\bin\tsc -p .\apps\web\tsconfig.json --noEmit
```

Runtime smoke (API на `http://localhost:4002`, свежая сборка после `nest build`):

```powershell
# тестовые пользователи: admin/editor/viewer@example.local, пароль Test12345!
$base = 'http://localhost:4002/api/v1'
# POST /auth/login -> accessToken + role
# GET /users/me с Bearer -> email текущего пользователя
# POST /persons без token -> 401
# POST /persons с VIEWER -> 403
# POST /persons с EDITOR -> 201
# DELETE /persons/:id с EDITOR -> 403
# DELETE /persons/:id с ADMIN -> 200
# POST /auth/register-first-admin при существующем ADMIN -> 409
```

Результат:

- API type-check проходит;
- Web type-check проходит;
- JWT/RBAC типы совместимы с frontend и backend;
- runtime smoke: `9/9` сценариев RBAC на `POST/DELETE /persons` и auth endpoints;
- `login` возвращает JWT с ролью `ADMIN|EDITOR|VIEWER`;
- `GET /users/me` работает с Bearer token;
- исправлен DI: `AuthModule` экспортирует `JwtModule` (иначе `UsersModule` не поднимался с `JwtAuthGuard`).

Критерий готовности:

- Runtime smoke через Swagger/browser:
  - без token mutation route возвращает `401` — **да**;
  - `VIEWER` не может выполнять mutation routes — **да** (`403`);
  - `EDITOR` может create/update, но не delete — **да** (`201` / `403`);
  - `ADMIN` может управлять данными — **да** (`200` на delete).
- Для локальной проверки перезапускать актуальную сборку API (`nest build` + `node dist/apps/api/src/main.js`); на `:4000` может оставаться старый skeleton-процесс.

### P0.4. Реализовать backend CRUD MVP

Минимум CRUD:

- `persons`;
- `families`;
- `relationships`;
- `events`;
- `places`;
- `documents`;
- `sources`;
- `citations`.

Статус:

- Реализовано (см. также §3.4):
  - NestJS-модули и controllers для всех 8 сущностей;
  - `GET` list + `GET :id` (read без token для MVP);
  - `POST` / `PATCH` / `DELETE` с `JwtAuthGuard` + `RolesGuard`;
  - soft delete через `deletedAt` на delete;
  - DTO + `class-validator` на create/update;
  - `RelationshipsService` использует `validateRelationshipSet` из `@family/genealogy-core`;
  - best-effort search indexing на create/update: `Person`, `Document`, `Source`, `Place`.
- Endpoints (prefix `/api/v1`):
  - `persons`, `families`, `relationships`, `events`, `places`, `documents`, `sources`, `citations`.

Проверено:

```powershell
node .\node_modules\.pnpm\typescript@5.9.3\node_modules\typescript\bin\tsc -p .\apps\api\tsconfig.json --noEmit
```

Runtime smoke «базовая семья» (API `http://localhost:4002`, Swagger `http://localhost:4002/docs`, token `admin@example.local` / `Test12345!`):

```powershell
$base = 'http://localhost:4002/api/v1'
# login -> Bearer token
# POST /persons x3 — отец, мать, ребёнок
# POST /families — семья
# POST /relationships x2 — type=PARENT (отец→ребёнок, мать→ребёнок)
# POST /places — место
# POST /events — type=BIRTH, personId=ребёнок, placeId=место
# POST /sources — источник
# POST /documents — документ (storageKey/bucket/mimeType), personId + sourceId
# POST /citations — цитата sourceId + personId
# GET list по всем 8 сущностям + PATCH /persons/:id + DELETE /citations/:id (soft)
```

Результат:

- API type-check проходит;
- Swagger UI отвечает `200` на `/docs`;
- runtime smoke: **18/18** шагов, сценарий «базовая семья» создан end-to-end через REST;
- созданные сущности (пример IDs из прогона `2026-05-20`):
  - persons: `cmpe2s3yg…` (отец), `cmpe2s3zi…` (мать), `cmpe2s400…` (ребёнок);
  - family: `cmpe2s40o…`;
  - relationships: `cmpe2s41j…`, `cmpe2s420…` (`PARENT`);
  - place: `cmpe2s428…`;
  - event `BIRTH`: `cmpe2s42y…`;
  - source: `cmpe2s437…`;
  - document: `cmpe2s43p…`;
  - citation: `cmpe2s44d…` (после smoke удалена soft-delete).
- Ограничение MVP: `FamilyMember` в API пока не имеет отдельного CRUD — семья создаётся как запись `Family`; участники связываются через `relationships` (достаточно для критерия parent-child).

Критерий готовности:

- Swagger позволяет вручную создать базовую семью:
  - 2 родителя — **да** (`POST /persons`);
  - 1 ребёнок — **да** (`POST /persons`);
  - семья — **да** (`POST /families`);
  - relationship parent-child — **да** (`POST /relationships`, `type=PARENT`);
  - событие рождения — **да** (`POST /events`, `type=BIRTH`);
  - место — **да** (`POST /places`);
  - документ — **да** (`POST /documents`);
  - источник — **да** (`POST /sources`);
  - цитата — **да** (`POST /citations`).
- Для локальной проверки использовать актуальную сборку API на свободном порту (например `4002`); на `:4000` может работать старый skeleton без реального CRUD.

### P0.5. Подключить frontend к реальному API

Сделать:

- Убрать зависимость от demo fallback в основных happy path.
- Добавить loading/error/empty states.
- Подключить формы к CRUD.
- Подключить JWT token к API client.

Статус:

- Реализовано (см. также §3.5):
  - `apps/web/lib/api-client.ts`: `GET/POST/PATCH/DELETE`, typed CRUD для 8 сущностей + `tree`, `timeline`, `search`, `media`, `gedcom`, `users/me`;
  - `AuthProvider`: реальный `POST /auth/login`, cookie `family_access_token`, **без** silent demo session при ошибке backend;
  - `middleware.ts`: redirect на `/login` без cookie для protected routes;
  - `login/page.tsx`: login + `register-first-admin`, явные error states;
  - Workspaces с API + states:
    - `PersonsWorkspace` — list/create, `isLoading` / `isSaving` / `EmptyState`;
    - `PersonDetailsWorkspace` — `GET /persons/:id`;
    - `FamiliesWorkspace`, `TimelineAdminWorkspace`, `DocumentsWorkspace`, `MediaGallery`, `DashboardOverview`;
    - `TreeExplorer` — `GET /tree/person/:id/:mode`, без hardcoded demo graph при ошибке;
    - `SearchPanel` — `GET /search`, без mock fallback.
- Demo fallback **отключён** в happy path:
  - login, dashboard, persons, families, tree, documents/sources/citations, media gallery.
- Остаточный demo (не блокирует P0.5 CRUD happy path):
  - `TimelineView` при ошибке API показывает `fallbackTimeline` (только если backend недоступен);
  - `settings/page.tsx` — placeholder email `demo@family.local`;
  - `domain.tsx` — типы из `mock-data` для UI-карточек (данные приходят из API).

Проверено:

```powershell
node .\node_modules\.pnpm\typescript@5.9.3\node_modules\typescript\bin\tsc -p .\apps\web\tsconfig.json --noEmit
```

Runtime integration smoke (те же вызовы, что делает UI через `api-client`, API `http://localhost:4002`):

```powershell
# login -> accessToken
# GET /persons (список)
# POST /persons + token (создание как в форме /persons)
# GET /persons/:id (карточка)
# GET /tree/person/:id/full (дерево)
# POST /places + POST /events + GET /timeline/person/:id (timeline)
# POST /persons без token -> 401
# GET /users/me -> role ADMIN
# GET /search?q=... + POST /search/reindex (поиск)
```

Результат:

- Web type-check проходит;
- Web UI отвечает `200` на `http://localhost:3001/login`;
- integration smoke через API paths UI: **7/8** шагов ✅;
  - persons list/create/details — ✅;
  - tree graph — ✅;
  - timeline person — ✅ (`events >= 1` после create event);
  - JWT `users/me` + mutation `401` без token — ✅;
  - search hits после reindex — ⚠️ `0` results в текущем окружении (Meilisearch container `unhealthy`, reindex сообщает `indexed: 11`, но `GET /search` возвращает пустые массивы).
- Для браузерной проверки UI задать в `apps/web/.env.local`:
  - `NEXT_PUBLIC_API_URL=http://localhost:4002/api/v1`
  - иначе по умолчанию клиент бьёт в `http://localhost:4000` (там может быть старый skeleton).

Ручной чеклист UI (после login `admin@example.local` / `Test12345!`):

| Маршрут | Компонент | Действие |
|---------|-----------|----------|
| `/login` | `login/page` | login / register-first-admin |
| `/persons` | `PersonsWorkspace` | создать персону → список обновился |
| `/persons/:id` | `PersonDetailsWorkspace` | открыть карточку созданной персоны |
| `/tree` | `TreeExplorer` | ввести Person ID → граф из API |
| `/timeline` | `TimelineAdminWorkspace` + `TimelineView` | создать place/event → timeline по Person ID |
| `/search` | `SearchPanel` | запрос после `reindex` (когда Meilisearch healthy) |

Критерий готовности:

- Пользователь через UI может создать базовые данные и увидеть их:
  - в списке людей — **да** (`/persons`, `PersonsWorkspace`);
  - в карточке человека — **да** (`/persons/:id`, `PersonDetailsWorkspace`);
  - в дереве — **да** (`/tree`, `TreeExplorer` + real Person ID);
  - в timeline — **да** (`/timeline`, create через `TimelineAdminWorkspace`, просмотр через `TimelineView` при доступном API);
  - в поиске — **частично**: UI и endpoint подключены; выдача зависит от работоспособности Meilisearch (в smoke окружении hits пустые, нужен healthy `family_meilisearch` + `POST /search/reindex`).
- Локально: API на актуальной сборке (`4002`), Web (`3001`), `NEXT_PUBLIC_API_URL` указывает на тот же API.

---

## 5. P1-задачи для полноценного MVP

### P1.1. Media/Documents

Сделать:

- Проверку существования bucket при старте или перед upload.
- Gallery из API, не только mock.
- Universal `MediaLink`:
  - `mediaId`;
  - `entityType`;
  - `entityId`.
- Document upload через тот же MinIO flow.

Статус:

- Реализовано:
  - `MediaService`: presigned PUT/GET через MinIO client; MIME/size validation;
  - `POST /media/upload-url`, `POST /media/metadata`, `GET /media`, `GET /media/:id/download-url`, `POST /media/:id/link`;
  - Prisma `MediaLink` (`mediaId`, `ownerType`, `ownerId`) — аналог universal link (`entityType` → `ownerType`: `PERSON|FAMILY|EVENT|DOCUMENT|SOURCE`);
  - при `createMetadata` с `personId` создаётся `MediaLink` на `PERSON`;
  - `linkMedia` поддерживает `person|family|event|document|source`;
  - frontend `MediaGallery` — list из `GET /media` (без mock);
  - frontend `MediaUploader` — presigned URL → PUT MinIO → `POST /media/metadata`.
- Частично / не сделано:
  - проверка существования bucket (`headBucket` / `bucketExists`) **не реализована** — при отсутствии bucket или credentials presigned URL даёт `500`;
  - `Document` создаётся через metadata CRUD (`storageKey` + `bucket` вручную), **без** общего presigned-upload flow как у media;
  - отдельный UI upload для documents в MinIO — нет (только форма metadata в `DocumentsWorkspace`).

Проверено:

```powershell
# API http://localhost:4002, admin token
GET /media
POST /media/upload-url  # требует MINIO_ROOT_USER/PASSWORD/MINIO_ENDPOINT в env API
```

Результат smoke (`2026-05-20`):

- `GET /media` — ✅ (gallery endpoint, count может быть `0`);
- `POST /media/upload-url` — ⚠️ `500` в текущем процессе API без полного MinIO env (ожидаемо до настройки credentials);
- кодовая база: `MediaLink` + `MediaUploader` flow готовы при healthy MinIO + `minio-init` buckets.

Критерий готовности:

- Bucket check при старте/upload — **нет**;
- Gallery из API — **да** (`MediaGallery`, `GET /media`);
- Universal `MediaLink` — **да** (schema + API link, поля `mediaId` + owner type/id);
- Document upload через тот же MinIO flow — **частично** (media — presigned flow; documents — metadata-only).

---

### P1.2. Search

Сделать:

- Автоиндексация при create/update:
  - Person;
  - Document;
  - Source;
  - Place.
- `POST /search/reindex` защитить admin-role.
- Добавить OCR-ready поля:
  - `ocrText`;
  - `documentText`;
  - `tags`.

Статус:

- Реализовано:
  - best-effort auto-index в services:
    - `PersonsService` → `search.indexPerson` на create/update;
    - `DocumentsService` → `indexDocument`;
    - `SourcesService` → `indexSource`;
    - `PlacesService` → `indexPlace`;
  - `GET /search?q=` + `POST /search/reindex` (Meilisearch index `family_search`);
  - `tags` в search payload (Meilisearch document field, не колонка PostgreSQL);
  - Prisma `Document.ocrText` + DTO `CreateDocumentDto.ocrText`.
- Частично / не сделано:
  - `POST /search/reindex` **без** `JwtAuthGuard` / `@Roles('ADMIN')` — доступен анонимно и для `VIEWER` (проверено smoke);
  - поле `documentText` в schema **отсутствует**;
  - `ocrText` сохраняется в БД, но **не попадает** в `indexDocument` (`text` берётся только из `description`);
  - выдача поиска зависит от healthy Meilisearch (в P0.5 smoke hits были пустые при `unhealthy` container).

Проверено:

```powershell
POST /persons + POST /documents (ocrText=...) + POST /search/reindex
POST /search/reindex от VIEWER token  # сейчас не блокируется
```

Результат smoke (`2026-05-20`, API `:4002`):

- `POST /documents` с `ocrText` — ✅ поле сохраняется;
- `POST /search/reindex` — ✅ `indexed: 12`;
- `POST /search/reindex` от `VIEWER` — ⚠️ разрешён (требование admin-role **не выполнено**);
- `GET /search?q=...` — ⚠️ пустые hits в текущем Meilisearch окружении (инфра, не отсутствие кода индексации).

Критерий готовности:

- Автоиндексация Person/Document/Source/Place — **да** (best-effort, не блокирует CRUD);
- `reindex` только ADMIN — **нет**;
- `ocrText` — **да** (хранение); **частично** (не в search index);
- `documentText` — **нет**;
- `tags` — **да** (в Meilisearch index payload).

---

### P1.3. GEDCOM

Сделать:

- Import transaction.
- Dry-run без записи.
- Conflict detection:
  - похожие имена;
  - даты рождения;
  - существующие семьи.
- Import report с деталями.
- UI preview table.

Статус:

- Реализовано:
  - `POST /gedcom/preview` — parse без записи в БД, counts + `errors`/`warnings` + `preview.persons|families|sources` (slice до 20);
  - `POST /gedcom/import` с `dryRun?: boolean` — при `dryRun=true` возвращает report без `imported`;
  - import создаёт persons, families, family members, relationships, events, sources через `@family/genealogy-core` mapper;
  - frontend `/settings/import` + `GedcomImportPanel`: upload `.ged` → preview metrics → confirm import;
  - import report: `personsFound`, `familiesFound`, `relationshipsFound`, `eventsFound`, `sourcesFound`, `errors`, `warnings`, `created` после import.
- Частично / не сделано:
  - **нет** Prisma `$transaction` — import идёт последовательными `create` (частичный импорт при ошибке возможен);
  - **нет** conflict detection (похожие имена, даты рождения, существующие семьи);
  - UI preview — метрики и error/warning blocks, **без** таблицы персон/семей из `preview.persons` (данные API есть, UI не рендерит table).

Проверено:

```powershell
# минимальный GEDCOM 5.5.5 snippet
POST /gedcom/preview
POST /gedcom/import { dryRun: true }
POST /gedcom/import { dryRun: false }
```

Результат smoke (`2026-05-20`, API `:4002`):

- `preview` — ✅ `persons=2`, `families=1`;
- `import dryRun=true` — ✅ `imported=false`;
- `import dryRun=false` — ✅ `imported=true`, `created.persons=2`;
- conflict detection — ❌ не в ответе API.

Критерий готовности:

- Import transaction — **нет**;
- Dry-run без записи — **да** (`/gedcom/preview` + `import` с `dryRun`);
- Conflict detection — **нет**;
- Import report с деталями — **частично** (counts/errors/warnings/created; без conflicts);
- UI preview table — **частично** (metrics only; table — в backlog).

### P1.4. Tree

Сделать:

- Выбор root person из поиска/списка.
- Ограничения глубины:
  - ancestors depth;
  - descendants depth.
- Скрытие living persons для public/viewer.
- Улучшить layout.

Статус:

- Реализовано:
  - API `TreeModule`: `GET /tree/person/:id/ancestors|descendants|full`;
  - обход графа relationships + вычисление `generation` для layout;
  - frontend `TreeExplorer` + `TreeCanvas` (React Flow): режимы ancestors/descendants/full, клик по узлу → `PersonDetailsPanel`;
  - позиционирование узлов по поколениям (`generation * 260`, горизонтальный offset в ряду);
  - отображение `isLiving` в боковой панели (badge living/archive).
- Частично / не сделано:
  - root person только через ручной ввод **Person ID** (нет picker из `/persons` или `/search`);
  - **нет** query-параметров `ancestorsDepth` / `descendantsDepth` — обход BFS без лимита глубины;
  - **нет** фильтрации living/private persons для `VIEWER`/public;
  - режимы `ancestors`/`descendants` в smoke дают `edges=0` из‑за сравнения типов связи в lowercase в `TreeService.parentChildDirection` при enum `PARENT` в БД (режим `full` через undirected adjacency работает: `nodes=3`, `edges=3` на seed).

Проверено:

```powershell
# API http://localhost:4002, seed root seed-person-ivan
GET /tree/person/{id}/full
GET /tree/person/{id}/ancestors
GET /tree/person/{id}/descendants
```

Результат smoke (`2026-05-20`, API `:4002`, root `seed-person-ivan`):

- `full` — ✅ `nodes=3`, `edges=3`;
- `ancestors` — ⚠️ `nodes=1`, `edges=0` (ожидались предки — bug enum case);
- `descendants` — ⚠️ `nodes=1`, `edges=0` (ожидались потомки — тот же bug);
- Web `/tree`: `TreeExplorer` грузит graph через `apiClient.tree.graph` при вводе ID.

Критерий готовности:

- Выбор root из поиска/списка — **нет** (только Person ID input);
- Ограничения глубины ancestors/descendants — **нет**;
- Скрытие living для public/viewer — **нет**;
- Улучшить layout — **частично** (React Flow + generation layout; ancestors/descendants traversal требует fix).

---

### P1.5. Timeline

Сделать:

- Event create/update UI.
- Привязка documents/media к event.
- `dateFrom/dateTo` на уровне UI.
- AI summary button disabled/enabled based on `AI_SERVICE_ENABLED`.

Статус:

- Реализовано:
  - API `GET /timeline/person/:id` — события person + synthetic birth/death + `dateEnd` → `dateTo` в ответе;
  - API `POST/PATCH /events`, `POST /places` с RBAC;
  - frontend `/timeline`: `TimelineAdminWorkspace` (create event/place, list, empty states) + `TimelineView` (фильтр по типам, карточки с `formatDateRange(dateFrom, dateTo)`);
  - в `TimelineView` блоки «Документы»/«Медиа» показывают связанные assets person-level (из API timeline).
- Частично / не сделано:
  - UI **create** event есть, **update** в форме нет (`apiClient.events` без `update`, только `list/create/remove`);
  - привязка document/media к **конкретному event** не реализована (нет `eventId` на Document/Media в UI; timeline отдаёт все docs/media персоны на каждую карточку);
  - в форме event только одно поле `date`, **нет** `dateEnd` (API поле `dateEnd` поддерживается — проверено smoke);
  - AI: в UI текст `AI summary ready: ...`, **нет** кнопки и проверки `AI_SERVICE_ENABLED` (логика disabled/enabled только в backend `AiService`, не в timeline UI);
  - `TimelineView` при ошибке API всё ещё показывает demo fallback timeline.

Проверено:

```powershell
GET /timeline/person/{id}
POST /events { type, date, dateEnd, personId, placeId }
PATCH /events/:id
# UI: TimelineAdminWorkspace create; TimelineView date range display
```

Результат smoke (`2026-05-20`, API `:4002`):

- `GET /timeline/person/seed-person-ivan` — ✅ `events=3`;
- `POST /events` с `dateEnd` — ✅ сохраняется;
- timeline отображает `dateTo` для migration event — ✅;
- `PATCH /events/:id` — ✅ (backend); UI update form — ❌;
- привязка media/doc к event — **частично** (person-level в API, не per-event);
- AI button + `AI_SERVICE_ENABLED` в web — ❌.

Критерий готовности:

- Event create/update UI — **частично** (create ✅, update в UI ❌);
- Привязка documents/media к event — **частично** (person-level отображение, не event-level link);
- `dateFrom/dateTo` в UI — **частично** (отображение range в `TimelineView` ✅, ввод `dateEnd` в форме ❌);
- AI summary button по `AI_SERVICE_ENABLED` — **нет**.

---

## 6. P2-задачи после первого релиза

Задачи **после первого MVP-релиза** — в текущей кодовой базе в основном заготовки, инфраструктура или library-level функции без полноценного product UI.

### P2.1. OCR через AI service

Сделать: распознавание архивов/документов через optional AI layer.

Статус:

- Реализовано (каркас):
  - API proxy: `GET /ai/health`, `POST /ai/ocr/preview` (`AiService` → FastAPI);
  - `apps/ai-service` (FastAPI): stub `/ocr/preview` с `status: stub`, `futureEngines: tesseract, paddleocr`;
  - Docker Compose service `ai-service` (profile `ai`);
  - Prisma `Document.ocrText` + ручное сохранение через CRUD documents.
- Не сделано:
  - реальный OCR engine (Tesseract/PaddleOCR/облако);
  - автопайплайн upload → OCR → запись `ocrText`;
  - UI кнопка OCR на documents (только поле description/ocr в форме metadata).

Проверено:

```powershell
POST /api/v1/ai/ocr/preview  # body: fileName, textHint
# AI_SERVICE_ENABLED=false по умолчанию
```

Результат smoke (`2026-05-20`, API `:4002`):

- `enabled=false`, `status=disabled` — ✅ proxy корректно отклоняет без AI;
- при `AI_SERVICE_ENABLED=true` + profile `ai` — stub FastAPI отвечает, без реального распознавания.

Критерий готовности P2.1: **нет** (нужен working OCR + UI trigger).

---

### P2.2. Relationship suggestions

Сделать: AI/графовые подсказки родственных связей.

Статус:

- Реализовано (каркас):
  - `POST /api/v1/ai/relationship/suggest` + FastAPI stub `suggestions: []`;
  - DTO: `personId`, `candidates`, `context`.
- Не сделано:
  - ML/LLM логика, интеграция с graph analytics;
  - UI для принятия/отклонения suggestions;
  - связь с `RelationshipsService` validation.

Проверено: `POST /ai/relationship/suggest` → `enabled=false` (disabled mode).

Критерий готовности P2.2: **нет**.

---

### P2.3. Timeline AI summary

Сделать: генерация краткого summary жизни по событиям timeline.

Статус:

- Реализовано (каркас):
  - `POST /api/v1/ai/timeline/summary` + FastAPI stub (`summary: ""`, `eventCount`);
  - `TimelineView` показывает текст `AI summary ready: ...` из `aiSummaryInput` (не вызов API).
- Не сделано:
  - кнопка summary в UI с `AI_SERVICE_ENABLED`;
  - реальный LLM summary;
  - сохранение summary в `TimelineItem` / Event.

Проверено: `POST /ai/timeline/summary` → disabled; UI — static text only.

Критерий готовности P2.3: **нет**.

---

### P2.4. Face recognition / photo clustering

Сделать: распознавание лиц и кластеризация фото в архиве.

Статус:

- **Не начато** в репозитории: нет модулей API, нет UI, нет зависимостей CV/embedding для faces.
- Media pipeline: только upload + metadata + `MediaLink`.

Критерий готовности P2.4: **нет**.

---

### P2.5. Graph analytics через Neo4j

Сделать: аналитика родственных графов на Neo4j.

Статус:

- Реализовано (инфра):
  - Docker Compose service `neo4j` (profile `graph`), volume `neo4j_data`;
  - `infra/scripts/backup-neo4j.sh`;
  - env `NEO4J_*`, `NEO4J_ENABLED=false` по умолчанию.
- Не сделано:
  - синхронизация PostgreSQL → Neo4j;
  - API endpoints graph analytics;
  - UI визуализация analytics (отдельно от `TreeModule` на SQL relationships).

Проверено: контейнер `family_neo4j` не запущен в текущем dev smoke (profile не активирован).

Критерий готовности P2.5: **нет** (только infra skeleton).

---

### P2.6. Advanced privacy rules

Сделать: расширенные правила приватности (living, role-based, public tree).

Статус:

- Реализовано (library):
  - `packages/genealogy-core/src/privacy-rules.ts`: `canViewPersonDetails`, `hideLivingPersonsForPublicView`, `calculatePersonPrivacy`;
  - Prisma `Person.privacyLevel` (`PUBLIC|FAMILY|PRIVATE`) + UI `PrivacyBadge` / форма persons.
- Не сделано:
  - применение privacy rules в API `tree`, `persons`, `timeline` для `VIEWER`/anonymous;
  - enforcement на уровне search/media/documents;
  - «advanced» политики (по ветке семьи, по роли, consent).

Критерий готовности P2.6: **частично** (модель + library; product enforcement **нет**).

---

### P2.7. Backup UI/status

Сделать: UI статуса бэкапов и управление restore.

Статус:

- Реализовано (ops scripts):
  - `infra/scripts/backup-postgres.sh`, `backup-minio.sh`, `backup-meilisearch.sh`, `backup-neo4j.sh`;
  - `infra/scripts/restore-postgres.sh`;
  - документация в `DEPLOY_VPS.md` § Backups.
- Не сделано:
  - API `/admin/backups` или scheduled jobs в приложении;
  - Web UI dashboard backup/restore status.

Критерий готовности P2.7: **частично** (shell scripts ✅, UI **нет**).

---

### P2.8. Admin audit dashboard

Сделать: dashboard аудита действий пользователей.

Статус:

- Реализовано (data model):
  - Prisma `AuditLog` (user, action, entityType, entityId, payload, timestamp);
  - запись audit при `media.link` (единственный runtime write в smoke-коде).
- Реализовано (skeleton):
  - `GET /admin/stats` → `{ module: 'admin', action: 'stats', status: 'skeleton' }`.
- Не сделано:
  - CRUD/read API для audit logs;
  - RBAC admin UI;
  - аудит на все mutation routes (persons, events, gedcom import, …).

Проверено:

```powershell
GET /api/v1/admin/stats
# → status: skeleton
```

Критерий готовности P2.8: **нет**.

---

### P2.9. Public shared family pages

Сделать: публичные read-only страницы семьи для гостей.

Статус:

- **Не начато**:
  - нет routes `/public/...` или share tokens;
  - нет guest viewer mode;
  - middleware требует cookie JWT для всех platform routes.

Критерий готовности P2.9: **нет**.

---

### P2.10. Export GEDCOM

Сделать: выгрузка дерева в `.ged`.

Статус:

- Реализовано (library):
  - `mapInternalPersonToGedcom` в `@family/genealogy-core`;
  - import: `POST /gedcom/preview`, `POST /gedcom/import`.
- Не сделано:
  - `GET /gedcom/export` или `POST /gedcom/export`;
  - UI download `.ged`;
  - полный export families/sources/events (mapper только person record level).

Критерий готовности P2.10: **частично** (import ✅, export endpoint **нет**).

---

### Сводка P2 (готовность к продукту)

| # | Задача | Готовность |
|---|--------|------------|
| P2.1 | OCR AI | Каркас proxy + stub |
| P2.2 | Relationship suggestions | Каркас proxy + stub |
| P2.3 | Timeline AI summary | Каркас proxy + stub |
| P2.4 | Face recognition | Нет |
| P2.5 | Neo4j analytics | Infra only |
| P2.6 | Advanced privacy | Library only |
| P2.7 | Backup UI | Scripts only |
| P2.8 | Audit dashboard | Model + skeleton |
| P2.9 | Public pages | Нет |
| P2.10 | Export GEDCOM | Mapper only |

Включение optional AI локально: `AI_SERVICE_ENABLED=true`, `docker compose --profile ai up -d`, `NEXT_PUBLIC_API_URL` на актуальный API.

---

## 7. Рекомендуемый порядок следующих работ

### Итерация 1. Стабилизация окружения и сборки

План:

1. Исправить pnpm/WSL install.
2. Сгенерировать Prisma Client.
3. Добиться прохождения:

```bash
pnpm db:generate
pnpm build
pnpm test
docker compose -f docker-compose.yml -f docker-compose.dev.yml config
docker compose -f docker-compose.yml -f docker-compose.prod.yml config
```

4. Исправить CI до зелёного состояния.

Статус (связь с P0.1):

- Реализовано / проверено локально:
  - monorepo структура + `pnpm-lock.yaml`;
  - TypeScript type-check: `@family/shared`, `@family/genealogy-core`, `@family/api`, `@family/web` — проходит (прямой `tsc`);
  - `nest build` для API — проходит (`apps/api/dist/.../main.js`);
  - `next build` — compile/static pages OK; на Windows возможен `EACCES` на `sharp-libvips-linux-x64` в trace-шаге;
  - Prisma Client — генерируется (на Linux/CI; на Windows иногда `EPERM` при rename query engine);
  - `docker compose` dev/prod `config --quiet` — ✅;
  - GitHub Actions workflow `.github/workflows/ci.yml`: install → `db:generate` → lint → test → build + job `docker-config`.
- Частично / блокеры окружения (Windows host):
  - `pnpm test` / `pnpm build` через root scripts: `turbo`/`sh` не находятся в текущем PowerShell (`pnpm exec` → `sh` not recognized);
  - обход: `node --test` в `@family/genealogy-core` напрямую — ✅ `9/9` passed;
  - `pnpm db:generate` / `pnpm exec prisma` — ненадёжны; работает `npx prisma@6.1.0 --schema apps/api/prisma/schema.prisma`;
  - clean `CI=true pnpm install --frozen-lockfile` в WSL/Ubuntu — **ещё не подтверждён** в этом окружении.
- CI green:
  - workflow описан корректно;
  - фактический green run на GitHub — **требует проверки** после push (локально полный `pnpm build` на Windows не gate).

Проверено (`2026-05-20`):

```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.prod.yml config --quiet
node .\node_modules\.pnpm\typescript@5.9.3\node_modules\typescript\bin\tsc -p .\apps\api\tsconfig.json --noEmit
node .\node_modules\.pnpm\typescript@5.9.3\node_modules\typescript\bin\tsc -p .\apps\web\tsconfig.json --noEmit
cd apps\api; node .\node_modules\@nestjs\cli\bin\nest.js build
cd packages\genealogy-core; node --test (after tsc)  # 9/9 pass
```

Результат:

- Проект можно собрать на новой машине — **частично да** (код и tsc/nest ✅; полный `pnpm build`/`pnpm test` на Windows host ⚠️; целевой gate — Linux/WSL/CI).

Критерий готовности итерации 1:

- `pnpm db:generate` + `pnpm build` + `pnpm test` на чистой Linux/WSL/CI — **в процессе** (см. P0.1);
- `docker compose config` dev/prod — **да**;
- GitHub Actions green — **ожидает подтверждения**.

---

### Итерация 2. Prisma schema + seed

План:

1. Доработать enums и индексы.
2. Добавить `deletedAt`.
3. Добавить `MediaLink`.
4. Создать seed.
5. Проверить чистую миграцию.

Статус (связь с §3.3, P0.2):

- Реализовано:
  - enums: `UserRole`, `Gender`, `RelationshipType`, `EventType`, `DocumentType`, `MediaOwnerType`, `PrivacyLevel`, …;
  - `deletedAt` на core entities (`User`, `Person`, `Family`, `Relationship`, `Event`, `Place`, `Media`, `Document`, `Source`, …);
  - `MediaLink` (`mediaId`, `ownerType`, `ownerId`, unique `[mediaId, ownerType, ownerId]`);
  - индексы: имена, даты, `deletedAt`, типы связей/событий;
  - migrations:
    - `20260519145419_init`;
    - `20260520075800_prisma_schema_hardening`;
  - seed `apps/api/prisma/seed.js`: admin `admin@example.local`, семья «Семья Петровых», demo persons/relationships/events/source;
  - root scripts: `db:generate`, `db:migrate`, `db:seed`.
- Проверено:
  - `migrate status` на `family_platform` — `Database schema is up to date`;
  - clean DB `family_platform_p0_check`: `migrate deploy` + seed — успешно (см. P0.2);
  - API type-check после schema sync — проходит.

Проверено:

```powershell
$env:DATABASE_URL='postgresql://family_user:change_me_postgres@localhost:5432/family_platform?schema=public'
npx --yes prisma@6.1.0 migrate status --schema .\apps\api\prisma\schema.prisma
npx --yes prisma@6.1.0 migrate deploy --schema .\apps\api\prisma\schema.prisma  # на пустой БД
node .\apps\api\prisma\seed.js
```

Результат smoke (`2026-05-20`):

- `2 migrations found`, schema up to date — ✅;
- seed идемпотентен — ✅;
- чистая миграция на временной БД — ✅ (P0.2);
- `pnpm db:migrate` / `pnpm db:seed` через workspace filter — ⚠️ зависит от shell (см. итерацию 1).

Критерий готовности итерации 2:

- Стабильная база для CRUD — **да** (schema + migrations + seed + demo data);
- новый разработчик через `npx prisma` + `node seed.js` — **да**;
- только `pnpm db:*` без обходов — **частично** (Windows shell).

### Итерация 3. Auth/RBAC

План:

1. Первый admin.
2. Login.
3. JWT.
4. Guards.
5. Roles.
6. Frontend token flow.

Статус (связь с §3.4, **P0.3**):

- Реализовано:
  - `POST /auth/register-first-admin` (один раз, при отсутствии ADMIN);
  - `POST /auth/login` → `accessToken` + `user` (`ADMIN|EDITOR|VIEWER`);
  - password hashing `crypto.scrypt`;
  - `JwtAuthGuard`, `RolesGuard`, `@Roles(...)`, `@CurrentUser()`;
  - `GET /users/me`;
  - RBAC на mutation routes core entities: `ADMIN/EDITOR` create/update, `ADMIN` delete;
  - read endpoints открыты для MVP frontend;
  - frontend: `AuthProvider` (real JWT, без demo session fallback), cookie `family_access_token`, `middleware` redirect на `/login`;
  - login page: register-first-admin + явные ошибки backend;
  - fix DI: `AuthModule` экспортирует `JwtModule` (иначе API не стартует с guards в `UsersModule`).
- Проверено runtime (API `http://localhost:4002`, `2026-05-20`):

```powershell
POST /auth/login  # admin@example.local / Test12345!
GET /users/me     # Bearer -> role ADMIN
POST /persons без token -> 401
POST /persons как VIEWER -> 403
POST /persons как EDITOR -> 201; DELETE как ADMIN -> 200
```

Результат smoke: **9/9** сценариев RBAC (см. P0.3).

Критерий готовности итерации 3:

- MVP защищён — **да** (JWT + roles на write; read открыт по дизайну MVP);
- Swagger/browser login flow — **да** при актуальной сборке API (не skeleton на `:4000`);
- frontend token flow — **да** (`AuthProvider` + cookie + API client Bearer).

---

### Итерация 4. Core CRUD

План:

1. Persons.
2. Families.
3. Relationships.
4. Events.
5. Places.

Статус (связь с §3.4, **P0.4**):

- Реализовано:
  - NestJS modules + Prisma services для всех 5 сущностей;
  - `GET` list/`GET :id` (read без token);
  - `POST`/`PATCH`/`DELETE` с JWT + roles;
  - soft delete через `deletedAt`;
  - DTO + `class-validator`;
  - `RelationshipsService` + `validateRelationshipSet` из `@family/genealogy-core`;
  - best-effort search indexing на create/update (Person/Place — через связанные сервисы; events — без отдельного index в search MVP).
- Endpoints: `/api/v1/persons`, `/families`, `/relationships`, `/events`, `/places`.
- Проверено runtime «мини-дерево» (API `:4002`, admin token, `2026-05-20`):

```powershell
POST /persons x2 (отец, ребёнок)
POST /families
POST /relationships type=PARENT
POST /places
POST /events type=BIRTH + personId + placeId
GET lists по всем 5 сущностям
```

Результат smoke: **7/7** шагов end-to-end (см. P0.4 полный сценарий с documents/sources/citations — итерация 5).

Критерий готовности итерации 4:

- Можно создать семейное древо через API — **да** (persons + family + parent-child relationship + birth event + place);
- Swagger ручной сценарий — **да**;
- UI CRUD для этих сущностей — **да** (`PersonsWorkspace`, `FamiliesWorkspace`, `TimelineAdminWorkspace` — см. P0.5 / итерация 6).

Ограничение MVP: `FamilyMember` CRUD отдельно нет — участники семьи задаются через `relationships` (достаточно для «древа через API»).

### Итерация 5. Archive CRUD

План:

1. Media metadata.
2. Documents.
3. Sources.
4. Citations.
5. Upload flows.

Статус (связь с §3.4, **P0.4**, **P1.1**):

- Реализовано:
  - API CRUD: `documents`, `sources`, `citations` (JWT + RBAC, soft delete);
  - `GET /media` list; `POST /media/upload-url`, `POST /media/metadata`, `POST /media/:id/link`;
  - `MediaLink` в Prisma; `Document.ocrText` в schema/DTO;
  - frontend: `DocumentsWorkspace` (create list), `MediaGallery` (API list), `MediaUploader` (presigned → MinIO → metadata).
- Частично:
  - `POST /media/upload-url` — ⚠️ `500` без MinIO credentials в env API-процесса (код flow готов);
  - document upload — metadata-only (`storageKey`/`bucket` вручную), не общий presigned flow как у media;
  - MinIO bucket pre-check — нет (P1.1).

Проверено (`2026-05-20`, API `:4002`, admin token):

```powershell
POST /sources, /documents, /citations  # OK
GET /media  # OK (count может быть 0)
POST /media/upload-url  # FAIL без MINIO_* env
```

Результат smoke: **4/5** (CRUD archive ✅; presigned upload ⚠️).

Критерий готовности итерации 5:

- Семейная память подкрепляется файлами и источниками — **да** через API metadata + CRUD;
- полный upload flow end-to-end — **частично** (нужен MinIO env + проверка PUT в bucket).

---

### Итерация 6. UI integration

План:

1. Forms.
2. API lists.
3. Detail pages.
4. Error/loading states.
5. Remove mock happy paths.

Статус (связь с §3.5, **P0.5**):

- Реализовано:
  - Workspaces с формами и API: `PersonsWorkspace`, `FamiliesWorkspace`, `TimelineAdminWorkspace`, `DocumentsWorkspace`;
  - detail: `PersonDetailsWorkspace` (`/persons/:id`);
  - `DashboardOverview`, `MediaGallery`, `SearchPanel`, `TreeExplorer`, `GedcomImportPanel`;
  - `AuthProvider` + JWT в `api-client.ts`;
  - loading/empty/error: `EmptyState`, status strings, `isLoading`/`isSaving` в workspaces.
- Частично / остатки:
  - `TimelineView` — demo fallback при ошибке API;
  - `settings` — placeholder email;
  - `domain.tsx` — типы из `mock-data` для карточек (данные из API);
  - `NEXT_PUBLIC_API_URL` по умолчанию `:4000` (skeleton) — для real API нужен `.env.local` → `:4002`.

Проверено:

- Web `tsc` — проходит;
- страницы `/login`, `/persons`, `/families`, `/documents`, `/media`, `/tree`, `/timeline`, `/search` — компоненты подключены к `apiClient.*`.

Критерий готовности итерации 6:

- Пользователь работает через frontend, не через Swagger — **да** для основных happy path (persons, families, events/places, documents, dashboard, tree по ID);
- поиск — **частично** (UI есть; Meilisearch hits зависят от infra, см. итерацию 7).

---

### Итерация 7. Search/Timeline/Tree polishing

План:

1. Search autoindex.
2. Timeline event links.
3. Tree root selector.
4. Privacy masking.

Статус (связь с **P1.2**, **P1.4**, **P1.5**, **P1.6**):

| Пункт | Статус |
|-------|--------|
| Search autoindex | **Да** в коде (Person/Document/Source/Place on create/update, `POST /search/reindex`); hits в smoke часто пустые; `reindex` не ADMIN-only |
| Timeline event links | **Частично** — person-level docs/media на всех карточках; per-event link нет; create event UI ✅, update/dateEnd/AI — см. P1.5 |
| Tree root selector | **Нет** — только ручной Person ID; `ancestors`/`descendants` ⚠️ bug enum `PARENT` vs `parent` |
| Privacy masking | **Частично** — `privacy-rules.ts` + `Person.privacyLevel`; не enforced в API tree/search |

Проверено (`2026-05-20`):

```powershell
POST /search/reindex  # indexed=21
GET /search?q=Iter5   # 0 hits (infra/indexing)
GET /tree/person/{id}/full  # OK на seed
GET /timeline/person/{id}   # OK
```

Критерий готовности итерации 7:

- MVP сценарии выглядят цельно — **частично** (ядро работает; polishing backlog: tree picker, PARENT fix, Meilisearch healthy, privacy enforcement).

---

### Итерация 8. VPS readiness

План:

1. Prod compose hardening.
2. Nginx/SSL.
3. Backups.
4. Restore test.
5. Security checklist.

Статус (связь с §3.2, `docs/DEPLOY_VPS.md`, **P2.7**):

- Реализовано:
  - `docker-compose.prod.yml`: internal network, только `nginx:80/443` наружу;
  - обязательные prod secrets `${VAR:?required}`;
  - `docker compose ... config` dev/prod — ✅;
  - nginx skeleton: `infra/nginx/nginx.conf`, `infra/nginx/conf.d/family.conf`;
  - backup scripts: `backup-postgres.sh`, `backup-minio.sh`, `backup-meilisearch.sh`, `backup-neo4j.sh`;
  - `restore-postgres.sh`;
  - `docs/DEPLOY_VPS.md` (deploy, backups checklist).
- Не сделано / не проверено runtime:
  - SSL/TLS certificates и domain — вручную на VPS (не автоматизировано в repo);
  - фактический прогон backup + restore в отдельное окружение — **не зафиксирован** в smoke этой сессии;
  - Web UI backup status — нет;
  - полный security checklist на production host — backlog.

Проверено:

```powershell
docker compose -f docker-compose.yml -f docker-compose.prod.yml config --quiet  # OK
```

Критерий готовности итерации 8:

- Проект можно переносить на VPS — **частично да** (compose + nginx config + backup scripts + docs ✅; нужны runtime backup/restore test + SSL + secrets на сервере).

---

---

## 8. Definition of Done для первого MVP-релиза

Первый релиз считается готовым, когда:

- `pnpm install` проходит в чистом окружении.
- `pnpm db:generate` проходит.
- `pnpm db:migrate` проходит.
- `pnpm build` проходит.
- `pnpm lint` проходит или явно настроен для всех пакетов.
- `pnpm test` проходит.
- GitHub Actions зелёный.
- Docker dev config валиден.
- Docker prod config валиден.
- Первый admin создаётся.
- Login работает.
- Роли работают.
- CRUD core entities работает.
- Frontend работает без обязательных mock данных.
- MinIO upload работает.
- Search возвращает реальные результаты.
- GEDCOM preview работает.
- Tree показывает реальные данные.
- Timeline показывает реальные события.
- Документация запуска актуальна.
- Нет секретов в git.
- Есть понятный VPS deploy checklist.

---

## 9. Контрольные пользовательские сценарии

### Сценарий 1. Первый запуск

1. Клонировать репозиторий.
2. Создать `.env`.
3. Запустить Docker-инфраструктуру.
4. Выполнить Prisma generate/migrate/seed.
5. Запустить API/Web.
6. Открыть frontend.
7. Открыть Swagger.

Успех:

- Все сервисы доступны.

### Сценарий 2. Создание семейного дерева

1. Войти как admin.
2. Создать 3 персон.
3. Создать семью.
4. Создать родственные связи.
5. Открыть `/tree`.

Успех:

- Дерево показывает связи.

### Сценарий 3. Медиа и документы

1. Загрузить фото/PDF.
2. Сохранить metadata.
3. Привязать к Person.
4. Открыть `/media` и `/documents`.

Успех:

- Файл физически в MinIO.
- Metadata в PostgreSQL.

### Сценарий 4. Timeline

1. Создать событие birth/migration/work.
2. Открыть `/timeline`.
3. Отфильтровать по типу.

Успех:

- События отсортированы и отображаются.

### Сценарий 5. Search

1. Создать Person.
2. Создать Document.
3. Выполнить reindex.
4. Поискать по имени/документу.

Успех:

- Результаты разбиты по категориям.

### Сценарий 6. GEDCOM preview

1. Загрузить `.ged`.
2. Получить preview.
3. Посмотреть report.
4. Подтвердить import.

Успех:

- Созданы Person/Family/Relationship/Event/Source.

---

## 10. Финальный вывод

Проект уже прошёл стадию простого skeleton и имеет основу почти всех крупных модулей MVP. Следующий этап должен быть не добавлением новых фич, а стабилизацией:

1. Prisma/migrations/build.
2. Auth/RBAC.
3. CRUD.
4. Frontend integration with real API.
5. CI green.
6. VPS hardening.

После закрытия этих пунктов `family-memory-platform` можно будет считать первым self-hosted MVP-релизом, пригодным для демонстрации, тестовой эксплуатации и подготовки к production deploy.
