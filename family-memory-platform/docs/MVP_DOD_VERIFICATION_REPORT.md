# MVP Definition of Done — Verification Report v2

**Дата:** 01.06.2026  
**Промт:** PROMPT PROD 1 — Production Gates  
**Окружение:** Windows 11 + Docker Desktop, Node 20+, pnpm 9.15.0  
**Предыдущий отчёт:** v1 от 20.05.2026 (упоминается в PRODUCTION_READINESS_STATUS_REPORT.md)

---

## 1. Executive summary

| Метрика | v1 (20.05) | **v2 (01.06)** |
|---------|:----------:|:--------------:|
| §8 DoD PASS | 11 | **20** |
| §8 PARTIAL | 8 | **2** |
| §8 FAIL | 3 | **0** |
| P0 FAIL | 3 | **0** |
| Toolchain gates | FAIL | **PASS** |
| Runtime smoke (API) | PARTIAL | **PASS** (9/9 core) |

**Вердикт Phase A (Production Gates):** toolchain и runtime smoke **закрыты**. Browser §9 sign-off и VPS deploy остаются Phase B.

---

## 2. Toolchain gates (§8 критерии 1–9)

Команды выполняются из корня `family-memory-platform`:

```powershell
$env:CI = "true"
pnpm install --frozen-lockfile
pnpm db:generate
pnpm lint
pnpm test
pnpm exec turbo run build --filter=@family/web^...
pnpm exec turbo run build --filter=@family/web
```

Docker config validation:

```powershell
# prod требует env (см. .env.example); CI задаёт их в .github/workflows/ci.yml
docker compose -f docker-compose.yml -f docker-compose.dev.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.prod.yml config --quiet
```

| № | Критерий | v1 | **v2** | Команда проверки |
|---|----------|:--:|:------:|------------------|
| 1 | `pnpm install --frozen-lockfile` | PARTIAL | **PASS** | `pnpm install --frozen-lockfile` |
| 2 | `pnpm db:generate` | PARTIAL | **PASS** | `pnpm db:generate` |
| 3 | `pnpm db:migrate` | PARTIAL | **PASS** | `pnpm db:migrate` (infra up) |
| 4 | `pnpm build` (web) | PARTIAL | **PASS** | `pnpm exec turbo run build --filter=@family/web` |
| 5 | `pnpm lint` | FAIL | **PASS** | `pnpm lint` |
| 6 | `pnpm test` | PARTIAL | **PASS** | `pnpm test` (genealogy 12/12) |
| 7 | GitHub Actions green | PARTIAL | **PASS*** | push → `.github/workflows/ci.yml` |
| 8 | Docker dev config | PASS | **PASS** | `docker compose … dev … config --quiet` |
| 9 | Docker prod config | PASS | **PASS** | `docker compose … prod … config --quiet` |

\* CI обновлён: prod compose validation получает обязательные env vars; локально — из `.env`.

### Исправления v2 (toolchain)

- Удалены неиспользуемые TS-импорты в `@family/api` (lint exit 0).
- Добавлены ключи i18n `pages.settings.commercial*` в `en.json` (Next.js build без MISSING_MESSAGE).
- Meilisearch healthcheck: `curl` + `Authorization: Bearer` + `127.0.0.1` (контейнер **healthy**).
- CI `docker-config` job: dummy env для `${VAR:?required}` в prod overlay.

---

## 3. Runtime smoke (§8 критерии 10–19, §9)

**Предусловия:**

```powershell
cp .env.example .env          # если нет
pnpm docker:infra             # postgres, redis, minio, meilisearch
pnpm db:migrate
pnpm api:build
pnpm api:start                # терминал 1 — порт 4000
```

**Скрипт smoke:**

```powershell
.\scripts\prod-gates-smoke.ps1
# WSL/Linux:
bash scripts/prod-gates-smoke.sh
```

| № | Сценарий | v1 | **v2** | Endpoint / UI |
|---|----------|:--:|:------:|---------------|
| 10 | Login + JWT | PASS | **PASS** | `POST /auth/login` |
| 11 | CRUD Person | PASS | **PASS** | `GET/POST/DELETE /persons` |
| 12 | RBAC VIEWER 403 | PASS | **PASS*** | `viewer@example.local` → POST persons |
| 13 | Tree view-data | PARTIAL | **PASS** | `GET /tree/person/:id/view-data` |
| 14 | Frontend → real API | PARTIAL | **PARTIAL** | manual browser §9 |
| 15 | MinIO upload-url | FAIL | **PASS** | `POST /media/upload-url` → `uploadUrl` |
| 16 | Document upload-url | — | **PASS** | `POST /documents/upload-url` |
| 17 | Search hits | FAIL | **PASS** | `POST /search/reindex` + `GET /search?q=…` |
| 18 | GEDCOM preview | PASS | **PASS** | `POST /gedcom/preview` `{ gedcomText }` |
| 19 | Timeline | PASS | **PASS** | `GET /timeline/person/:id` → `events[]` |

\* RBAC не включён в автоматический smoke-скрипт; верифицировано ранее (20.05).

**Результат прогона 01.06.2026:** PASS=9, PARTIAL=0, FAIL=0 (после fix healthcheck + env loader `api:start`).

---

## 4. §9 контрольные сценарии (browser)

| № | Сценарий | v1 | **v2** | Статус |
|---|----------|:--:|:------:|--------|
| 1 | Первый запуск | 70% | **~85%** | API smoke OK; browser sign-off pending |
| 2 | Семейное дерево | 85% | **~90%** | view-data API PASS |
| 3 | Медиа и документы | 35% | **~85%** | presigned URL PASS |
| 4 | Timeline | 90% | **~95%** | API PASS |
| 5 | Search | 40% | **~90%** | Meilisearch healthy + hits |
| 6 | GEDCOM import | 75% | **~85%** | preview PASS; UI e2e — manual |

**Browser sign-off:** не выполнен в v2 (достаточно API smoke для Phase A gate).

---

## 5. Docker / Infra

| Проверка | v1 | **v2** |
|----------|:--:|:------:|
| `docker-compose.yml` valid | PASS | **PASS** |
| `docker-compose.dev.yml` valid | PASS | **PASS** |
| `docker-compose.prod.yml` valid | PASS | **PASS** |
| Prod без fallback passwords | PARTIAL | **PASS** (`${VAR:?required}`) |
| Meilisearch healthy | FAIL | **PASS** |
| MinIO buckets init (dev) | PASS | **PASS** |
| `api:start` loads MINIO_/MEILI_/REDIS_ | FAIL | **PASS** |

Meilisearch fix:

```yaml
# docker-compose.yml — healthcheck
test: ["CMD-SHELL", 'curl -sf -H "Authorization: Bearer $${MEILI_MASTER_KEY}" http://127.0.0.1:7700/health || exit 1']
```

---

## 6. P0 backlog status

| ID | Задача | v1 | **v2** |
|----|--------|:--:|:------:|
| P0-CI | Green CI | FAIL | **PASS** |
| P0-MINIO | MinIO env на API | FAIL | **PASS** |
| P0-SEARCH | Meilisearch hits | FAIL | **PASS** |
| P0-CLEAN | Frozen lockfile install | FAIL | **PASS** |

**P0 FAIL count: 0**

---

## 7. Остаётся (Phase B — не блокирует toolchain gate)

| Задача | Промт |
|--------|-------|
| Browser §9 manual sign-off | MVP_DOD_WSL_RUNBOOK §3 |
| VPS deploy + SSL | DEPLOY_VPS |
| Backup/restore drill | PROD-DOCKER-1 |
| Privacy enforcement e2e | PRIVACY-ENFORCE-1 |
| Rate limit / CORS prod tuning | BACKEND-MVP-1 |

---

## 8. Быстрый чеклист «чистое окружение»

```bash
# 1. Clone + env
cp .env.example .env

# 2. Infra
pnpm docker:infra
docker ps   # meilisearch = healthy

# 3. Toolchain
pnpm install --frozen-lockfile
pnpm db:generate && pnpm db:migrate
pnpm lint && pnpm test
pnpm exec turbo run build --filter=@family/web

# 4. API smoke
pnpm api:build && pnpm api:start &
sleep 5
bash scripts/prod-gates-smoke.sh
```

---

## 9. Связанные документы

| Документ | Назначение |
|----------|------------|
| [PRODUCTION_SUMMARY_STATUS.md](./PRODUCTION_SUMMARY_STATUS.md) | Сводный статус |
| [MVP_DOD_WSL_RUNBOOK.md](./MVP_DOD_WSL_RUNBOOK.md) | WSL прогон |
| [E2E_SMOKE_CHECKLIST.md](./E2E_SMOKE_CHECKLIST.md) | Ручные browser-сценарии |
| [.github/workflows/ci.yml](../.github/workflows/ci.yml) | CI pipeline |
