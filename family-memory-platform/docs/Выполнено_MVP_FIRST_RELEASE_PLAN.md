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

Проверено:

```powershell
$env:DATABASE_URL='postgresql://family_user:change_me_postgres@localhost:5432/family_platform?schema=public'
npx --yes prisma@6.1.0 migrate status --schema .\apps\api\prisma\schema.prisma
node .\apps\api\prisma\seed.js
```

Результат:

- `2 migrations found`;
- `Database schema is up to date`;
- `Seed completed. Admin: admin@example.local, family: Семья Петровых`.

Критерий готовности:

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

Результат:

- API type-check проходит;
- Web type-check проходит;
- JWT/RBAC типы совместимы с frontend и backend.

Критерий готовности:

- Runtime smoke через Swagger/browser:
  - без token mutation route возвращает `401`;
  - `VIEWER` не может выполнять mutation routes;
  - `EDITOR` может create/update, но не delete;
  - `ADMIN` может управлять данными.
- Эти runtime-проверки ещё нужно выполнить после запуска `api` и `web`.

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

Критерий готовности:

- Swagger позволяет вручную создать базовую семью:
  - 2 родителя;
  - 1 ребёнок;
  - семья;
  - relationship parent-child;
  - событие рождения;
  - место;
  - документ;
  - источник;
  - цитата.

### P0.5. Подключить frontend к реальному API

Сделать:

- Убрать зависимость от demo fallback в основных happy path.
- Добавить loading/error/empty states.
- Подключить формы к CRUD.
- Подключить JWT token к API client.

Критерий готовности:

- Пользователь через UI может создать базовые данные и увидеть их:
  - в списке людей;
  - в карточке человека;
  - в дереве;
  - в timeline;
  - в поиске.

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

### P1.4. Tree

Сделать:

- Выбор root person из поиска/списка.
- Ограничения глубины:
  - ancestors depth;
  - descendants depth.
- Скрытие living persons для public/viewer.
- Улучшить layout.

### P1.5. Timeline

Сделать:

- Event create/update UI.
- Привязка documents/media к event.
- `dateFrom/dateTo` на уровне UI.
- AI summary button disabled/enabled based on `AI_SERVICE_ENABLED`.

---

## 6. P2-задачи после первого релиза

- OCR через AI service.
- Relationship suggestions.
- Timeline AI summary.
- Face recognition / photo clustering.
- Graph analytics через Neo4j.
- Advanced privacy rules.
- Backup UI/status.
- Admin audit dashboard.
- Public shared family pages.
- Export GEDCOM.

---

## 7. Рекомендуемый порядок следующих работ

### Итерация 1. Стабилизация окружения и сборки

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

Результат:

- Проект можно собрать на новой машине.

### Итерация 2. Prisma schema + seed

1. Доработать enums и индексы.
2. Добавить `deletedAt`.
3. Добавить `MediaLink`.
4. Создать seed.
5. Проверить чистую миграцию.

Результат:

- Есть стабильная база для CRUD.

### Итерация 3. Auth/RBAC

1. Первый admin.
2. Login.
3. JWT.
4. Guards.
5. Roles.
6. Frontend token flow.

Результат:

- MVP защищён.

### Итерация 4. Core CRUD

1. Persons.
2. Families.
3. Relationships.
4. Events.
5. Places.

Результат:

- Можно создать семейное древо через API.

### Итерация 5. Archive CRUD

1. Media metadata.
2. Documents.
3. Sources.
4. Citations.
5. Upload flows.

Результат:

- Семейная память подкрепляется файлами и источниками.

### Итерация 6. UI integration

1. Forms.
2. API lists.
3. Detail pages.
4. Error/loading states.
5. Remove mock happy paths.

Результат:

- Пользователь работает через frontend, не через Swagger.

### Итерация 7. Search/Timeline/Tree polishing

1. Search autoindex.
2. Timeline event links.
3. Tree root selector.
4. Privacy masking.

Результат:

- MVP сценарии выглядят цельно.

### Итерация 8. VPS readiness

1. Prod compose hardening.
2. Nginx/SSL.
3. Backups.
4. Restore test.
5. Security checklist.

Результат:

- Проект можно переносить на VPS.

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
