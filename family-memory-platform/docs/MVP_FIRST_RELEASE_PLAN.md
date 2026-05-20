# MVP первого релиза: статус и структурный план работ

Дата: 20.05.2026

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
3. Prisma Client/миграции нужно привести в рабочее состояние и зафиксировать.
4. Frontend местами работает через demo fallback/mock data.
5. CI может падать, пока не стабилизированы API build, Prisma generate и тестовые scripts.
6. Production Docker/VPS архитектура описана, но требует финальной проверки сетей, секретов, backup/restore.

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
| Docker Compose | Частично | base/dev/prod compose, profiles `graph`, `ai` | Prod network hardening, MinIO init profile, secrets required in prod |
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

Нужно:

- Убрать публикацию инфраструктурных портов из base compose или финально разделить base/dev/prod.
- Сделать production secrets обязательными через `${VAR:?required}`.
- Сделать MinIO bucket init доступным не только через profile `apps`.
- Добавить/проверить backup scripts:
  - PostgreSQL backup/restore;
  - MinIO backup/sync;
  - Meilisearch dump/snapshot;
  - Neo4j dump для profile `graph`.
- Проверить:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml config
docker compose -f docker-compose.yml -f docker-compose.prod.yml config
```

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

Проблема:

- В текущем окружении API type-check падает из-за несгенерированного/некорректного Prisma Client.
- До релиза это P0-блокер.

Нужно:

1. В чистом WSL/Ubuntu окружении выполнить:

```bash
CI=true pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:migrate
```

2. Зафиксировать миграции.
3. Добавить seed:
   - первый admin;
   - demo family;
   - demo persons;
   - demo relationships;
   - demo events.
4. Доработать schema:
   - `deletedAt`;
   - enum `Gender`;
   - enum `RelationshipType`;
   - enum `EventType`;
   - enum `PrivacyLevel`;
   - `MediaLink` или универсальная связь файлов с Person/Event/Document;
   - индексы для частых запросов.

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

Нужно:

- Реализовать auth/RBAC.
- Реализовать CRUD для всех core entities.
- Подключить SearchService к create/update Person/Document/Source/Place.
- Сделать API responses стабильными и документированными.
- Добавить error handling convention.
- Добавить e2e/manual Swagger checklist.

### 3.5. Frontend Next.js

Сделано:

- App Router.
- Dashboard shell.
- Sidebar.
- Theme toggle.
- Auth provider с demo session.
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

Нужно:

- Перевести demo/mock fallback в controlled empty/loading/error states.
- Подключить реальные CRUD forms.
- Добавить нормальную работу с JWT.
- Добавить UI для:
  - создания/редактирования Person;
  - создания Family;
  - управления Relationship;
  - Event/Place CRUD;
  - Document upload;
  - Source/Citation management.

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

Нужно:

- Расширить validation rules.
- Добавить больше GEDCOM mapping cases.
- Подключить core rules в backend CRUD relationships.

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

Проблема:

- API type-check/build падает из-за Prisma Client.
- В Windows/WSL были проблемы с pnpm store и platform-specific dependencies.

Сделать:

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
CI=true pnpm install --frozen-lockfile
pnpm db:generate
pnpm --filter @family/shared build
pnpm --filter @family/genealogy-core build
pnpm --filter @family/api build
pnpm --filter @family/web build
```

Критерий готовности:

- Все команды проходят в чистом окружении.
- `pnpm build` проходит.
- GitHub Actions проходит.

### P0.2. Зафиксировать Prisma migrations

Сделать:

- Проверить текущую schema.
- Решить, можно ли пересоздать initial migration.
- Выполнить `pnpm db:migrate`.
- Убедиться, что таблицы создаются с нуля.
- Добавить seed.

Критерий готовности:

- Новый разработчик может выполнить `pnpm db:generate && pnpm db:migrate` без ручных правок.

### P0.3. Реализовать Auth + RBAC

Минимум:

- `POST /auth/register-first-admin`;
- `POST /auth/login`;
- password hashing;
- JWT access token;
- `JwtAuthGuard`;
- `RolesGuard`;
- роли:
  - `admin`;
  - `editor`;
  - `viewer`;
- защита API routes.

Критерий готовности:

- Без token protected route возвращает `401`.
- Viewer не может выполнять mutation routes.
- Admin может управлять данными.

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
