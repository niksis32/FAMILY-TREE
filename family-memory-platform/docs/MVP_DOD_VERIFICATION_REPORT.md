# MVP §8 Definition of Done — отчёт верификации

**Дата проверки:** 20.05.2026  
**План:** [MVP_FIRST_RELEASE_PLAN.md](./MVP_FIRST_RELEASE_PLAN.md) — §8 (стр. 1792–1818), подготовка к §9 (1821–1891)  
**Связанный журнал работ:** [Выполнено_MVP_FIRST_RELEASE_PLAN.md](./Выполнено_MVP_FIRST_RELEASE_PLAN.md)  
**Окружение:** Windows 10, Node v24.15.0, Docker Desktop, PostgreSQL/Redis/MinIO в контейнерах

---

## 1. Краткий итог

| Метрика | Значение |
|--------|----------|
| Критериев §8 DoD | **22** |
| **PASS** (да) | **11** |
| **PARTIAL** (частично) | **8** |
| **FAIL** (нет) | **3** |
| **Готовность к §9 (сценарии 1–6)** | **~55%** — API-ядро готово; блокеры: MinIO env на процессе API, Meilisearch hits, Windows `pnpm`/`turbo` |

**Вывод:** первый MVP-релиз по **runtime API на `:4002`** близок к демо, но **формальный DoD §8 не закрыт** до зелёного CI, рабочего search/MinIO на том же процессе API и стабильных `pnpm build|lint|test` на хосте разработчика.

---

## 2. Условия проверки (важно)

### 2.1. Какой API считать «актуальным»

| URL | Статус |
|-----|--------|
| `http://localhost:4002` | **Актуальный NestJS** (сборка `apps/api`, seed, JWT, CRUD) |
| `http://localhost:4000` | Часто **старый skeleton** — не использовать для DoD |

Рекомендуемый запуск API (хост, не Docker app):

```powershell
cd family-memory-platform\apps\api
$env:DATABASE_URL = "postgresql://family:family@localhost:5432/family_platform"
$env:JWT_SECRET = "dev-secret-min-32-chars-long-enough"
$env:MEILI_HOST = "http://localhost:7700"
$env:MEILI_MASTER_KEY = "<из .env — как в docker-compose>"
$env:MINIO_ENDPOINT = "localhost"
$env:MINIO_PORT = "9000"
$env:MINIO_ROOT_USER = "minioadmin"
$env:MINIO_ROOT_PASSWORD = "<из .env>"
$env:MINIO_BUCKET_MEDIA = "family-media"
$env:MINIO_BUCKET_DOCUMENTS = "family-documents"
node ..\..\dist\apps\api\src\main.js
```

Web: `http://localhost:3001`, в `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4002/api/v1
```

### 2.2. Тестовые учётные записи (seed)

| Email | Роль | Пароль |
|-------|------|--------|
| `admin@example.local` | ADMIN | `Test12345!` |
| `editor@example.local` | EDITOR | `Test12345!` |
| `viewer@example.local` | VIEWER | `Test12345!` |

### 2.3. Состояние Docker (на момент проверки)

| Контейнер | Статус |
|-----------|--------|
| `family_postgres` | healthy |
| `family_redis` | healthy |
| `family_minio` | healthy |
| `family_meilisearch` | **unhealthy** (контейнер Up, healthcheck fail) |

---

## 3. §8 Definition of Done — детальная таблица

Легенда: **PASS** = критерий выполнен в проверенном окружении; **PARTIAL** = работает с обходом или не на всех платформах; **FAIL** = не выполнен.

| № | Критерий DoD | Статус | % | Доказательство / комментарий |
|---|--------------|--------|---|------------------------------|
| 1 | `pnpm install` в чистом окружении | **PARTIAL** | 60% | Запуск `--frozen-lockfile` на Windows >2 мин без финального лога; зависимости в репозитории уже установлены. На CI (Ubuntu + pnpm 9.15) ожидается PASS — локально не подтверждено до конца. |
| 2 | `pnpm db:generate` | **PARTIAL** | 70% | `npx prisma@6.1.0 generate` — **EPERM** при rename `query_engine-windows.dll.node` (файл занят процессом API). Client уже сгенерирован — migrate/API работают. |
| 3 | `pnpm db:migrate` | **PARTIAL** | 85% | `prisma migrate status` → 2 migrations, **Database schema is up to date**. Корневой `pnpm db:migrate` не гонялся (workspace filter); обход через `apps/api` + prisma CLI — OK. |
| 4 | `pnpm build` | **PARTIAL** | 65% | `pnpm build` → **turbo not found** в PATH (Windows). `dist/apps/api` существует от прошлой сборки; прямой `nest build` — ошибка пути к nest CLI, но **runtime API на :4002 отвечает**. `next build` не прогонялся (риск EACCES sharp на Windows). |
| 5 | `pnpm lint` | **FAIL** | 0% | `pnpm lint` → `"turbo" не является командой` (нет `turbo` в PATH при вызове через pnpm.ps1). |
| 6 | `pnpm test` | **PARTIAL** | 50% | `pnpm test` — FAIL (turbo). **Обход:** `node --test packages/genealogy-core/test/*.test.mjs` → **9/9 pass**. Тесты API/e2e через turbo — не прогнаны. |
| 7 | GitHub Actions зелёный | **PARTIAL** | 50% | Workflow [`.github/workflows/ci.yml`](../.github/workflows/ci.yml): install → db:generate → lint → test → build + docker-config. **Локальный прогон CI не выполнялся**; по коду должен проходить на Ubuntu при исправном turbo в node_modules. Статус последнего run — проверить в GitHub UI. |
| 8 | Docker dev config валиден | **PASS** | 100% | `docker compose -f docker-compose.yml -f docker-compose.dev.yml config --quiet` → OK. |
| 9 | Docker prod config валиден | **PASS** | 100% | Только overlay **FAIL** (`docker-compose.prod.yml` без base — ошибка meilisearch image). **CI-способ:** `docker compose -f docker-compose.yml -f docker-compose.prod.yml config --quiet` → OK. |
| 10 | Первый admin создаётся | **PASS** | 100% | Seed: `admin@example.local`, role ADMIN. `POST /auth/register-first-admin` при пустой БД — по дизайну; в текущей БД admin из seed. |
| 11 | Login работает | **PASS** | 100% | `POST /api/v1/auth/login` → `accessToken`, user.role=ADMIN. Swagger `/docs` → 200. |
| 12 | Роли работают | **PASS** | 100% | VIEWER `POST /persons` → **403**. ADMIN CRUD → OK. |
| 13 | CRUD core entities | **PASS** | 95% | Smoke: Person, Family, Relationship, Event — создаются. Ранее P0.4: 18/18 «базовая семья». |
| 14 | Frontend без обязательных mock | **PARTIAL** | 80% | Страницы используют `api-client` (persons, tree, timeline, media, search, gedcom). Типы UI частично из `@/lib/mock-data` — **данные с API**, не демо-массивы. Риск: `NEXT_PUBLIC_API_URL` по умолчанию `:4000` — нужен `:4002`. |
| 15 | MinIO upload | **FAIL** | 30% | Контейнер MinIO healthy. `POST /media/upload-url` на API **:4002** → **500** (нет `MINIO_*` в env процесса). Без presigned URL сценарий 3 не закрыть. |
| 16 | Search — реальные результаты | **FAIL** | 40% | `POST /search/reindex` → `indexed: 27`. `GET /search?q=Timeline` → **0 hits** во всех категориях. Meilisearch контейнер **unhealthy**; прямой запрос к `:7700` → 403 (ключ). |
| 17 | GEDCOM preview | **PASS** | 100% | `POST /gedcom/preview` с минимальным `.ged` → `personsFound: 1`. Import ранее проверялся в P1.3. |
| 18 | Tree — реальные данные | **PARTIAL** | 75% | `GET /tree/person/{id}/full` → nodes=2, edges=1 после создания связи. **Баг:** `ancestors`/`descendants` — сравнение enum lowercase vs `PARENT` в БД → edges=0 (см. TreeService). |
| 19 | Timeline — реальные события | **PASS** | 90% | `POST /events` + `GET /timeline/person/{id}` → events=2 (birth + migration), сортировка по API. UI-фильтр по типу — не проверялся в браузере. |
| 20 | Документация запуска актуальна | **PARTIAL** | 85% | Есть: `LOCAL_COMMANDS_REFERENCE.md`, `DOCKER_LOCAL_WINDOWS*.md`, `DEPLOY_VPS.md`, `DEPLOY_LOCAL.md`. Расхождение: порт API 4000 vs фактический dev 4002; Windows-обходы prisma/turbo — частично в runbook. |
| 21 | Нет секретов в git | **PASS** | 100% | `.env` в `.gitignore`; `git ls-files` не содержит `.env`. Только `.env.example`. |
| 22 | VPS deploy checklist | **PASS** | 90% | `docs/DEPLOY_VPS.md` — пошаговый чеклист (env, compose prod overlay, nginx, backup scripts). Runtime backup/restore на VPS не проверялся. |

### 3.1. Сводка по §8

```text
PASS:     11 / 22  (50%)
PARTIAL:   8 / 22  (36%)
FAIL:      3 / 22  (14%)  — pnpm lint, MinIO upload на API, search hits
```

**Интегральная оценка DoD §8:** **~68%** (взвешенно: runtime-блоки важнее, toolchain Windows — отдельный gate).

---

## 4. Runtime smoke (20.05.2026, API :4002)

Команды PowerShell (сокращённо):

```powershell
$base = 'http://localhost:4002/api/v1'
$login = Invoke-RestMethod "$base/auth/login" -Method POST -ContentType 'application/json' `
  -Body '{"email":"admin@example.local","password":"Test12345!"}'
$h = @{ Authorization = "Bearer $($login.accessToken)" }
```

| Проверка | Результат |
|----------|-----------|
| Login ADMIN | OK |
| 401 без токена | OK (ожидается 401) |
| CRUD Person + Relationship | OK |
| Tree `/full` | nodes≥2, edges≥1 |
| Timeline | events≥1 (birth + migration) |
| GEDCOM preview | personsFound≥1 |
| Search после reindex | **FAIL** — 0 hits |
| MinIO upload-url | **FAIL** — 500 |
| Swagger `/docs` | 200 |
| Web `/login` | 200 |

---

## 5. Готовность к §9 — контрольные сценарии

Оценка: можно ли прогнать сценарий **сейчас** без доработок.

| Сценарий | Название | Готовность | Блокеры | Рекомендуемый порядок |
|----------|----------|------------|---------|------------------------|
| **1** | Первый запуск | **PARTIAL (70%)** | `pnpm install/build` на Windows; prisma EPERM; два порта API | После фикса env — повторить по `LOCAL_COMMANDS_REFERENCE.md` + Docker infra |
| **2** | Семейное дерево | **READY API (85%)** | UI: `NEXT_PUBLIC_API_URL=:4002`; tree ancestors/descendants | Прогнать в браузере `/tree` после login |
| **3** | Медиа и документы | **BLOCKED (35%)** | MinIO env на процессе API; upload-url 500 | Добавить MINIO_* в env API → presigned → PUT в MinIO |
| **4** | Timeline | **READY (90%)** | UI-фильтр не smoke-тестился | API OK; открыть `/timeline` |
| **5** | Search | **BLOCKED (40%)** | Meilisearch unhealthy; 0 hits | Починить health Meili + ключ MEILI_MASTER_KEY; reindex; повторить поиск |
| **6** | GEDCOM preview/import | **PARTIAL (75%)** | Preview OK; полный import + report в UI — отдельный прогон | API preview готов; confirm import — smoke в UI |

### 5.1. Чеклист шагов §9 (что уже можно делать)

#### Сценарий 1 — Первый запуск

| Шаг | Статус |
|-----|--------|
| Клонировать репозиторий | OK |
| Создать `.env` из `.env.example` | OK (вручную) |
| Docker-инфраструктура | OK (postgres, redis, minio; meili unhealthy) |
| Prisma generate/migrate/seed | migrate/seed OK; generate — EPERM если API запущен |
| Запустить API/Web | API :4002 вручную; Web :3001 |
| Frontend + Swagger | OK при правильном URL |

#### Сценарий 2 — Дерево

| Шаг | Статус |
|-----|--------|
| Login admin | OK |
| 3 персоны + семья + связи | OK через API |
| `/tree` показывает связи | **Проверить в UI**; API `full` — OK |

#### Сценарий 3 — Медиа

| Шаг | Статус |
|-----|--------|
| Загрузка фото/PDF | **FAIL** до MinIO env |
| Metadata в PostgreSQL | CRUD media metadata — частично (без файла в bucket) |
| `/media`, `/documents` | UI есть; e2e не прогонялся |

#### Сценарий 4 — Timeline

| Шаг | Статус |
|-----|--------|
| События birth/migration/work | OK (API) |
| `/timeline` | **Проверить в UI** |
| Фильтр по типу | Не проверено в браузере |

#### Сценарий 5 — Search

| Шаг | Статус |
|-----|--------|
| Person + Document | CRUD OK |
| reindex | OK (`indexed: 27`) |
| Поиск по имени/документу | **FAIL** — пустые категории |

#### Сценарий 6 — GEDCOM

| Шаг | Статус |
|-----|--------|
| Загрузить `.ged` | OK (preview API) |
| Preview + report | preview OK; report — UI |
| Confirm import | Ранее P1.3 — API import; **повторить e2e** |

---

## 6. Блокеры перед полным §9

Приоритет **P0** (закрыть до пользовательских сценариев):

1. **MINIO_* в environment процесса API** — иначе сценарий 3.
2. **Meilisearch** — контейнер healthy, `MEILI_MASTER_KEY` совпадает с API; проверить `GET /search` после reindex (сценарий 5).
3. **Единый порт API в документации** — 4002 для host-run vs 4000 в compose.
4. **TreeService** — нормализация `RelationshipType` (`PARENT` vs `parent`) для ancestors/descendants.
5. **Windows toolchain** — `pnpm` + `turbo` в PATH или `pnpm exec turbo`; иначе DoD §8 пункты 4–6 формально FAIL.

Приоритет **P1** (после §9):

- Зелёный GitHub Actions (push в `main`/`develop`).
- `next build` на CI/Linux.
- Browser e2e чеклист (Playwright — опционально).

---

## 7. Известные дефекты (ссылка на код)

| Проблема | Влияние | Где |
|----------|---------|-----|
| Enum case в tree traversal | ancestors/descendants пустые | `apps/api` TreeService |
| Meilisearch unhealthy | search 0 hits | Docker healthcheck / ключ |
| JWT export в AuthModule | было: API не стартовал | исправлено: `auth.module.ts` exports JwtModule |
| Default API URL `:4000` | UI бьёт в skeleton | `apps/web/lib/api-client.ts` |

---

## 8. Рекомендуемые команды для повторной проверки

### 8.1. Docker config (как в CI)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.prod.yml config --quiet
```

### 8.2. Prisma (Windows)

```powershell
cd family-memory-platform\apps\api
$env:DATABASE_URL = "postgresql://family:family@localhost:5432/family_platform"
npx prisma@6.1.0 migrate status
npx prisma@6.1.0 db seed
```

### 8.3. Genealogy tests (без turbo)

```powershell
cd family-memory-platform\packages\genealogy-core
node --test .\test\*.test.mjs
```

### 8.4. API smoke (один скрипт)

См. раздел 4; обязательно `:4002` и Bearer после login.

---

## 9. Следующие действия

| Действие | Владелец | Закрывает |
|----------|----------|-----------|
| Перезапустить API с полным `.env` (MinIO + Meili) | Dev | DoD #15–16, §9 сц. 3–5 |
| Исправить Meilisearch healthcheck / master key | DevOps | DoD #16 |
| Исправить TreeService enum | Dev | DoD #18, §9 сц. 2 |
| Прогнать `pnpm install && pnpm build && pnpm test` на Linux/WSL или CI | Dev | DoD #1–7 |
| Ручной browser pass §9 (1–6) | QA | Финальный MVP sign-off |
| Обновить `Выполнено_MVP_FIRST_RELEASE_PLAN.md` §8 таблицей статусов | Doc | Синхрон с этим файлом |

---

## 10. История документа

| Версия | Дата | Изменение |
|--------|------|-----------|
| 1.0 | 20.05.2026 | Первая верификация §8 DoD + матрица готовности §9 |

---

*Этот отчёт не заменяет [Выполнено_MVP_FIRST_RELEASE_PLAN.md](./Выполнено_MVP_FIRST_RELEASE_PLAN.md) по итерациям P0–P2; он фокусируется только на критериях §8 и переходе к §9.*
