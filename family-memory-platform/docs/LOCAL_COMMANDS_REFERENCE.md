# Локальные команды проекта

Файл нужен как рабочая памятка: сюда добавляем команды для PowerShell и Ubuntu/WSL, что они делают, какой результат ожидается и какие ошибки уже встречались.

**Обновление / перезапуск после `git pull` или миграций** — пошаговый runbook: [LOCAL_SERVICE_UPDATE_RUNBOOK.md](./LOCAL_SERVICE_UPDATE_RUNBOOK.md).

---

## Шпаргалка Ubuntu/WSL — перезапуск и обновление (Variant A)

Все команды ниже — **только в Ubuntu/WSL**, не в PowerShell (кроме EPERM Prisma — см. runbook §8).

**Схема Variant A:** Docker = PostgreSQL, Redis, MinIO, Meilisearch; **API** = WSL `:4000`; **Web** = WSL `:3000`.

### 0. Перейти в проект и Node (каждый новый терминал)

```bash
source ~/.nvm/nvm.sh
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
pwd
ls package.json
```

Ожидаемо: путь заканчивается на `family-memory-platform`, есть `package.json`.  
Если `ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND` — вы в `~`, снова выполните `cd`.

---

### 1. Полное обновление после `git pull` (рекомендуется)

**Терминал 1** — инфраструктура, БД, API:

```bash
source ~/.nvm/nvm.sh
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"

# зависимости (если менялся pnpm-lock.yaml)
pnpm install

# Docker: postgres, redis, minio, meilisearch
pnpm docker:infra
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# миграции Prisma (применяет все папки в apps/api/prisma/migrations/)
pnpm db:migrate
node scripts/prisma-cli.mjs migrate status

# остановить старый API, собрать заново (внутри: api:prisma + shared + genealogy-core + api)
pkill -f "dist/main.js" 2>/dev/null || true
pnpm api:build
ls -la apps/api/dist/main.js

# запуск API (терминал не закрывать)
pnpm api:start
```

Ожидаемо в конце терминала 1:

```text
API listening on http://localhost:4000/api/v1
```

**Терминал 2** — фронтенд:

```bash
source ~/.nvm/nvm.sh
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
pnpm dev:web
```

Ожидаемо:

```text
Local:        http://localhost:3000
✓ Ready
```

**Проверка (любой терминал):**

```bash
curl -s http://localhost:4000/api/v1/health
ss -ltnp | grep -E ':4000|:3000|:5432'
```

Браузер: http://localhost:3000 → после перезапуска API **выйти и войти снова** (`/login`), затем **Ctrl+F5**.

---

### 2. Только перезапуск API (новые маршруты, без смены schema)

```bash
source ~/.nvm/nvm.sh
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
pkill -f "dist/main.js" 2>/dev/null || true
pnpm api:build
pnpm api:start
```

Web (`pnpm dev:web`) можно не трогать.

---

### 3. Только перезапуск Web (изменения в `apps/web`)

В терминале, где крутится Next.js: **Ctrl+C**, затем:

```bash
source ~/.nvm/nvm.sh
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
pnpm dev:web
```

В браузере: **Ctrl+F5** на http://localhost:3000

---

### 4. Только миграции БД (новый `schema.prisma` / папки `migrations/`)

```bash
source ~/.nvm/nvm.sh
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
pnpm docker:infra
pnpm db:migrate
node scripts/prisma-cli.mjs migrate status
pnpm api:prisma
pkill -f "dist/main.js" 2>/dev/null || true
pnpm api:build
pnpm api:start
```

Если после `pnpm db:migrate` Prisma спрашивает имя новой миграции, а `migrate status` уже показывает **`Database schema is up to date!`** — **Ctrl+C** (код 130 нормален), дальше `pnpm api:build`.

**Production-подобный режим** (без интерактива `migrate dev`):

```bash
node scripts/prisma-cli.mjs migrate deploy
pnpm api:prisma
```

---

### 5. Остановка сервисов

```bash
# API
pkill -f "dist/main.js" 2>/dev/null || true

# Web — в терминале next: Ctrl+C, или:
fuser -k 3000/tcp 2>/dev/null || true

# Docker-инфраструктура (данные в volumes сохраняются)
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
pnpm docker:infra:down
```

---

### 6. Опционально: AI-сервис (Document Intelligence, Family Stories narrative)

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
# в корневом .env: AI_SERVICE_ENABLED=true, AI_SERVICE_URL=http://localhost:8000
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile ai up -d
curl -s http://localhost:8000/health
```

После изменений в `apps/ai-service` — пересоздать контейнер profile `ai` (см. runbook).

---

### 7. Опционально: PDF для Public Family Stories (PROMPT 10)

В корневом `.env` (WSL):

```env
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
# или путь к Chromium в WSL
```

Проверка endpoint (после `api:start` и создания story):

```bash
curl -s -o /tmp/story.pdf -w "%{http_code}\n" \
  "http://localhost:4000/api/v1/public/family-stories/token/YOUR_TOKEN/pdf"
```

---

### 8. Симптомы → быстрые команды

| Симптом | WSL |
|---------|-----|
| `Failed to fetch`, `/health` → 404 | §2 — перезапуск API |
| `401` после перезапуска API | Выйти → войти на `/login` |
| `EADDRINUSE :::4000` | `pkill -f "dist/main.js"` → `pnpm api:start` |
| `EADDRINUSE :::3000` | Ctrl+C в терминале Web или `fuser -k 3000/tcp` |
| `DATABASE_URL` not found | `cd` в корень проекта; `ls .env`; `pnpm docker:infra` |
| `avatarMediaId does not exist` при build | `pnpm api:prisma` → `pnpm api:build` |
| Prisma engine Windows vs WSL | **не** `db:generate` из PowerShell; только `pnpm api:prisma` из WSL |

Подробные разборы: [LOCAL_SERVICE_UPDATE_RUNBOOK.md](./LOCAL_SERVICE_UPDATE_RUNBOOK.md).

---

## Meilisearch: создать индекс и добавить документ

Контекст:

- Meilisearch запущен локально в Docker: `http://localhost:7700`.
- Контейнер проекта: `family_meilisearch`.
- Индекс для примера: `documents`.
- Meilisearch принимает JSON-документы, а не файлы напрямую. Файлы должны храниться в MinIO, а в Meilisearch отправляется поисковый JSON: название, текст, описание, OCR, связанные люди и даты.

### PowerShell: ошибка без Bearer

Команда была выполнена с неправильным заголовком авторизации:

```powershell
$headers = @{ Authorization = "change_me_meilisearch_master_key" }

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:7700/indexes" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body '{"uid":"documents","primaryKey":"id"}'
```

Результат:

```text
Invoke-RestMethod : {"message":"The Authorization header is missing. It must use the bearer authorization method.","code":"missing_authorization_header","type":"auth","link":"https://docs.meilisearch.com/errors#missing_authorization_header"}
строка:1 знак:1
+ Invoke-RestMethod `
+ ~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (System.Net.HttpWebRequest:HttpWebRequest) [Invoke-RestMethod], WebException
    + FullyQualifiedErrorId : WebCmdletWebResponseException,Microsoft.PowerShell.Commands.InvokeRestMethodCommand
```

Причина:

`Authorization` должен быть в формате `Bearer <MEILI_MASTER_KEY>`. Если написать только ключ без слова `Bearer`, Meilisearch считает, что заголовок авторизации отсутствует.

### PowerShell: правильное создание индекса

```powershell
$headers = @{
  Authorization = "Bearer change_me_meilisearch_master_key"
}

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:7700/indexes" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body '{"uid":"documents","primaryKey":"id"}'
```

Что делает команда:

- `-Method Post` отправляет POST-запрос.
- `-Uri "http://localhost:7700/indexes"` обращается к API создания индексов Meilisearch.
- `-Headers $headers` передает мастер-ключ.
- `-ContentType "application/json"` сообщает, что тело запроса в JSON.
- `uid` задает имя индекса.
- `primaryKey` задает уникальное поле документа.

Результат:

```text
taskUid    : 0
indexUid   : documents
status     : enqueued
type       : indexCreation
enqueuedAt : 2026-05-19T18:34:42.944682744Z
```

Что означает результат:

- `status: enqueued` значит, что задача поставлена в очередь Meilisearch.
- `type: indexCreation` значит, что создается индекс.
- `indexUid: documents` значит, что операция относится к индексу `documents`.

### PowerShell: добавить JSON-документ

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:7700/indexes/documents/documents" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body '[{"id":"1","title":"Семейное фото","text":"Архивное фото семьи"}]'
```

Что делает команда:

- Отправляет массив JSON-документов в индекс `documents`.
- `id` используется как primary key.
- `title` и `text` будут доступны для поиска.

Результат:

```text
taskUid    : 1
indexUid   : documents
status     : enqueued
type       : documentAdditionOrUpdate
enqueuedAt : 2026-05-19T18:35:07.483243434Z
```

Что означает результат:

- `documentAdditionOrUpdate` значит, что документ добавляется или обновляется.
- После выполнения задачи индекс `documents` можно выбрать в Mini Dashboard на `http://localhost:7700`.

### Ubuntu / WSL: создать индекс через curl

```bash
curl -X POST "http://localhost:7700/indexes" \
  -H "Authorization: Bearer change_me_meilisearch_master_key" \
  -H "Content-Type: application/json" \
  --data '{"uid":"documents","primaryKey":"id"}'
```

### Ubuntu / WSL: добавить JSON-документ через curl

```bash
curl -X POST "http://localhost:7700/indexes/documents/documents" \
  -H "Authorization: Bearer change_me_meilisearch_master_key" \
  -H "Content-Type: application/json" \
  --data '[{"id":"1","title":"Семейное фото","text":"Архивное фото семьи"}]'
```

### Проверка

PowerShell:

```powershell
Invoke-RestMethod -Uri "http://localhost:7700/health"
```

Ubuntu / WSL:

```bash
curl "http://localhost:7700/health"
```

Ожидаемый результат:

```json
{"status":"available"}
```

## Meilisearch: ручное добавление файлов в поиск

Важно: Meilisearch не хранит сами файлы. Это поисковый движок, который хранит JSON-документы.

Правильная схема для проекта:

1. Сам файл, фото, видео или архив хранится в MinIO.
2. В PostgreSQL хранится основная запись документа/медиа.
3. В Meilisearch отправляется поисковая карточка: `id`, `title`, `fileName`, `mediaKey`, `type`, `text`, `persons`, `year`, `tags`.

Пример поисковой карточки:

```json
{
  "id": "file-1",
  "title": "Семейное фото",
  "fileName": "photo-archive-001.jpg",
  "mediaKey": "family-media/photo-archive-001.jpg",
  "type": "image/jpeg",
  "text": "Архивное фото семьи",
  "persons": ["Иван Петров", "Мария Петрова"],
  "year": 1978,
  "tags": ["архив", "фото", "семья"]
}
```

Что здесь что:

- `id` — уникальный идентификатор записи в поиске.
- `title` — человекочитаемое название.
- `fileName` — имя файла.
- `mediaKey` — путь/ключ файла в MinIO.
- `type` — MIME-тип файла.
- `text` — текст для поиска: описание, OCR, заметки.
- `persons` — связанные люди.
- `year` — год события или примерная дата.
- `tags` — дополнительные ключевые слова.

### PowerShell: добавить поисковую карточку файла

```powershell
$headers = @{
  Authorization = "Bearer change_me_meilisearch_master_key"
}

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:7700/indexes/documents/documents" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body '[{"id":"file-1","title":"Семейное фото","fileName":"photo-archive-001.jpg","mediaKey":"family-media/photo-archive-001.jpg","type":"image/jpeg","text":"Архивное фото семьи","persons":["Иван Петров","Мария Петрова"],"year":1978,"tags":["архив","фото","семья"]}]'
```

Ожидаемый результат:

```text
taskUid    : 2
indexUid   : documents
status     : enqueued
type       : documentAdditionOrUpdate
```

### Ubuntu / WSL: добавить поисковую карточку файла

```bash
curl -X POST "http://localhost:7700/indexes/documents/documents" \
  -H "Authorization: Bearer change_me_meilisearch_master_key" \
  -H "Content-Type: application/json" \
  --data '[{"id":"file-1","title":"Семейное фото","fileName":"photo-archive-001.jpg","mediaKey":"family-media/photo-archive-001.jpg","type":"image/jpeg","text":"Архивное фото семьи","persons":["Иван Петров","Мария Петрова"],"year":1978,"tags":["архив","фото","семья"]}]'
```

### PowerShell: выполнить поиск

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:7700/indexes/documents/search" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body '{"q":"семейное фото"}'
```

### Ubuntu / WSL: выполнить поиск

```bash
curl -X POST "http://localhost:7700/indexes/documents/search" \
  -H "Authorization: Bearer change_me_meilisearch_master_key" \
  -H "Content-Type: application/json" \
  --data '{"q":"семейное фото"}'
```

## Быстрые команды локального запуска

### Ubuntu / WSL: проверить инфраструктуру

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
docker ps --filter "name=family_"
```

Что должно быть в списке:

```text
family_postgres
family_redis
family_minio
family_meilisearch
```

### Ubuntu / WSL: запустить инфраструктуру

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
pnpm docker:infra
```

Эквивалент без `pnpm`:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### Ubuntu / WSL: запустить Web

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
pnpm --filter @family/web dev
```

Ожидаемый адрес:

```text
http://localhost:3000
```

### Ubuntu / WSL: проверить занятый порт 3000

```bash
ss -ltnp | grep ":3000"
```

Если порт занят старым Next.js, при повторном запуске будет ошибка:

```text
Error: listen EADDRINUSE: address already in use :::3000
```

### PowerShell: посмотреть соединения на 3000

```powershell
netstat -ano | Select-String ":3000"
```
********************************************************************
********************************************************************
********************************************************************

****************************/  МОЙ ВАРИАНТ 

********************************************************************
********************************************************************
********************************************************************


********************************************************************
////////////////////////4000
********************************************************************


Команды и так не пойдут дальше, пока предыдущая не завершится, если ты запускаешь их как один скрипт (или соединяешь через &&). Чтобы добавить явную задержку между шагами — вставляем sleep N.

Вариант 1 (рекомендую): одна цепочка && + задержки

```bash
source ~/.nvm/nvm.sh && sleep 1 && \
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform" && sleep 1 && \
pnpm install && sleep 2 && \
pnpm docker:infra && sleep 2 && \
pnpm db:migrate && sleep 1 && \
node scripts/prisma-cli.mjs migrate status && sleep 1 && \
pkill -f "dist/main.js" 2>/dev/null || true && sleep 1 && \
pnpm api:build && sleep 1 && \
pnpm api:start

```
&& гарантирует: следующая команда запустится только если предыдущая успешно завершилась.
sleep N — задержка в секундах (поменяй значения под себя).

Вариант 2: “строгий” bash-скрипт (остановится при любой ошибке)

```bash
set -euo pipefail
source ~/.nvm/nvm.sh
sleep 1
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
sleep 1
pnpm install
sleep 2
pnpm docker:infra
sleep 2
pnpm db:migrate
sleep 1
node scripts/prisma-cli.mjs migrate status
sleep 1
pkill -f "dist/main.js" 2>/dev/null || true
sleep 1
pnpm api:build
sleep 1
pnpm api:start

```
Если хочешь, скажи какую задержку ставить (например 1/3/5 сек) и нужно ли, чтобы скрипт продолжал работу даже если pnpm db:migrate упадёт.


******************************************************
/////////////////////////////////3000
******************************************************

Вот то же самое, но в виде последовательного “скрипта”: каждая команда ждёт завершения предыдущей, плюс есть задержки sleep между шагами.

Вариант 1 (рекомендую): через && + задержки

```bash
ss -ltnp | grep ":3000" && sleep 1 && \
ps -ef | grep -E "next|node|pnpm" | grep -v grep && sleep 1 && \
pkill -f "next dev --port 3000" || true && sleep 1 && \
pkill -f "next-server" || true && sleep 1 && \
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform" && sleep 1 && \
CI=true pnpm install --frozen-lockfile && sleep 1 && \
source ~/.nvm/nvm.sh && sleep 1 && \
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform" && sleep 1 && \
pnpm --filter @family/web dev

```
Вариант 2: “строгий” bash-режим (останавливается при ошибках, кроме pkill)

```bash
set -euo pipefail
ss -ltnp | grep ":3000"
sleep 1
ps -ef | grep -E "next|node|pnpm" | grep -v grep
sleep 1
pkill -f "next dev --port 3000" || true
sleep 1
pkill -f "next-server" || true
sleep 1
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
sleep 1
CI=true pnpm install --frozen-lockfile
sleep 1
source ~/.nvm/nvm.sh
sleep 1
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
sleep 1
pnpm --filter @family/web dev
```



********************************************************************
## После изменений в коде: перезапустить Web/Node.js
********************************************************************

Ситуация из практики:

- файл страницы или меню уже изменён;
- в браузере пункт меню не появился;
- `http://localhost:3000/documentation` показывает `404`;
- новый запуск `pnpm --filter @family/web dev` падает с ошибкой `EADDRINUSE`;
- значит старый Next.js/Node.js процесс уже держит порт `3000`.

Важно: Web в текущем варианте A запускается из Ubuntu/WSL. После изменений иногда нужно перезапустить именно WSL-процесс Next.js.

### Ubuntu / WSL: найти процесс на 3000

```bash
ss -ltnp | grep ":3000"
```

Пример результата:

```text
LISTEN 0 511 *:3000 *:* users:(("next-server",pid=7163,fd=19))
```

Что это значит:

- порт `3000` занят;
- Web уже запущен;
- повторный запуск даст `EADDRINUSE`.

### Ubuntu / WSL: посмотреть Node/Next/pnpm процессы

```bash
ps -ef | grep -E "next|node|pnpm" | grep -v grep
```

Пример результата:

```text
nik 6905 ... pnpm --filter @family/web dev
nik 7135 ... next dev --port 3000
nik 7163 ... next-server
```

### Ubuntu / WSL: остановить старый Web

```bash
pkill -f "next dev --port 3000" || true
pkill -f "next-server" || true
```

Что делает:

- останавливает старый Next.js dev server;
- освобождает порт `3000`;
- API на `4000` не трогает.

### Ubuntu / WSL: если после Windows install сломался Next/SWC

Если сервер зависает на сообщениях вида:

```text
Attempted to load @next/swc-linux-x64-gnu, but it was not installed
```

нужно переустановить зависимости из Ubuntu:

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
CI=true pnpm install --frozen-lockfile
```

Причина:

- зависимости Next.js содержат платформенные пакеты;
- если установить их из Windows, WSL может не получить Linux SWC;
- поэтому для запуска из Ubuntu безопаснее делать install из Ubuntu.

### Ubuntu / WSL: заново запустить Web

Если команда `pnpm` в Ubuntu берётся из Windows и падает так:

```text
/mnt/c/Program Files/nodejs/pnpm: 11: exec: node: not found
```

запускайте через `nvm`:

```bash
source ~/.nvm/nvm.sh
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
pnpm --filter @family/web dev
```

Ожидаемый результат:

```text
Local: http://localhost:3000
Ready
```

Терминал с этой командой должен оставаться открытым.

## Перезапуск API при `Failed to fetch` / health 404

Симптомы: http://localhost:3000 — не логинится, `Failed to fetch`; http://localhost:4000/api/v1/health — **404** или connection refused.

**Решение (WSL)** — см. также [§ Шпаргалка WSL](#шпаргалка-ubuntuwsl--перезапуск-и-обновление-variant-a) выше:

```bash
source ~/.nvm/nvm.sh
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
pkill -f "dist/main.js" 2>/dev/null || true
pnpm api:build
pnpm api:start
```

Проверка:

```bash
curl -s http://localhost:4000/api/v1/health
```

Ожидаемо JSON с `"status":"ok"`. В браузере: **Ctrl+F5**, повторный **/login**.

### Windows PowerShell: проверить Web

```powershell
Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing
```

Ожидаемо: `StatusCode: 200`.

## Prisma — `Environment variable not found: DATABASE_URL`

Симптом при `pnpm db:migrate` из Ubuntu:

```text
Error: Environment variable not found: DATABASE_URL
```

Причина: Prisma запускается из `apps/api`, а файл `.env` лежит в **корне** монорепозитория. NestJS подхватывает `../../.env`, Prisma CLI — нет (до исправления скрипта).

### Ubuntu / WSL: проверка и миграция

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
ls -la .env
grep DATABASE_URL .env
pnpm docker:infra
pnpm db:migrate
```

Команды `pnpm db:migrate`, `db:generate`, `db:seed` читают корневой `.env` через `scripts/prisma-cli.mjs`.

### После `db:migrate` — запрос имени новой миграции / `Canceled by user`

После строки `Applying migration ... person_avatar_media` Prisma может спросить `Enter a name for the new migration`. Если `node scripts/prisma-cli.mjs migrate status` показывает **`Database schema is up to date!`**, новая миграция не нужна — нажмите **Ctrl+C** (код выхода 130 — нормально).

Дальше **обязательно** (иначе `api:build` падает с `avatarMediaId does not exist`):

```bash
pnpm api:prisma
pnpm api:build
```

Если `.env` нет:

```bash
cp .env.example .env
# отредактируйте POSTGRES_PASSWORD и DATABASE_URL (должен совпадать с docker-compose)
```

Пример рабочего `DATABASE_URL` для variant A:

```env
DATABASE_URL=postgresql://family_user:local_postgres_password@localhost:5432/family_platform?schema=public
```

Пароль `family_user` / `local_postgres_password` должны совпадать с `POSTGRES_USER` / `POSTGRES_PASSWORD` в `.env` и в `docker-compose`.

Обход без скрипта (вручную):

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform/apps/api"
export DATABASE_URL="postgresql://family_user:ВАШ_ПАРОЛЬ@localhost:5432/family_platform?schema=public"
pnpm exec prisma migrate dev
```

---

## Photo Intelligence (PROMPT 6) — миграция, Redis, AI (Ubuntu / WSL)

Контекст: разметка лиц на фото (`PhotoFaceTag`), очередь анализа **BullMQ** (нужен **Redis**), детекция лиц — **MediaPipe** в контейнере `ai-service` (profile `ai`).

Подробности: [PROMPT_6_AI_PHOTO_TAGGING.md](./PROMPT_6_AI_PHOTO_TAGGING.md).

### 1. Инфраструктура (Postgres, Redis, MinIO, …)

Из **корня** монорепозитория (Redis обязателен для очереди фото):

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
pnpm docker:infra
```

Проверка, что Redis поднят:

```bash
docker ps --filter "name=family_redis"
redis-cli -h localhost -p 6379 ping
```

Ожидаемо: `PONG`.

### 2. Переменные в корневом `.env`

Откройте `family-memory-platform/.env` (не только `apps/api/.env`) и добавьте или раскомментируйте:

```env
REDIS_URL=redis://localhost:6379
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_ENABLED=true
```

Без `REDIS_URL` ручная разметка фото работает, но задачи в очередь не ставятся (статус job — `SKIPPED`).  
Без `AI_SERVICE_ENABLED=true` API не вызывает AI; кнопка «Запустить AI-анализ» в UI будет неактивна.

### 3. Применить миграции Prisma (photo intelligence)

**Вариант A (рекомендуется)** — из корня, с корневым `.env`:

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
node scripts/prisma-cli.mjs migrate deploy
node scripts/prisma-cli.mjs generate
```

**Вариант B** — только каталог API (как в runbook):

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform/apps/api"
source ~/.nvm/nvm.sh
export DATABASE_URL="postgresql://family_user:ВАШ_ПАРОЛЬ@localhost:5432/family_platform?schema=public"
pnpm prisma migrate deploy
pnpm prisma generate
```

Пароль и хост должны совпадать с `DATABASE_URL` в корневом `.env` и с `docker-compose`.

Проверка статуса:

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform/apps/api"
pnpm exec prisma migrate status
```

Ожидаемо: `Database schema is up to date!` (в т.ч. миграция `20260526120000_photo_intelligence`).

После миграции пересоберите API:

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
source ~/.nvm/nvm.sh
pnpm api:prisma
pnpm --filter @family/shared build
pnpm api:build && pnpm api:start
```

### 4. Запустить AI-сервис (MediaPipe, profile `ai`)

Из **корня** проекта:

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile ai up -d --build
```

Краткий вариант (если dev-overlay уже в контексте не нужен):

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
docker compose --profile ai up -d --build
```

Проверка:

```bash
curl -s http://localhost:8000/health | head
```

В ответе желательно `"mediapipe": true`.

Порт AI по умолчанию: `8000` (`AI_PORT` в `.env`).

### 5. Web + проверка в UI

Терминал Web (если ещё не запущен):

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
source ~/.nvm/nvm.sh
pnpm --filter @family/web dev
```

Страницы:

- Галерея: http://localhost:3000/media  
- Фото с тегами: http://localhost:3000/media/{mediaId}  
- Массовая разметка: http://localhost:3000/media/tagging  

После загрузки **изображения** (`image/jpeg`, `image/png`, `image/webp`) API ставит задачу в очередь; статус: `GET http://localhost:4000/api/v1/photo-analysis/{mediaId}/status`.

Ручной повторный анализ (нужен JWT EDITOR/ADMIN):

```bash
curl -s -X POST "http://localhost:4000/api/v1/photo-analysis/MEDIA_ID/enqueue" \
  -H "Authorization: Bearer ВАШ_ACCESS_TOKEN"
```

### 6. Типичные проблемы

| Симптом | Что проверить |
|--------|----------------|
| Очередь не работает | `REDIS_URL`, контейнер `family_redis`, перезапуск API после правки `.env` |
| AI не находит лица | `docker ps` → `family_ai`, `AI_SERVICE_ENABLED=true`, `curl localhost:8000/health` |
| `migrate deploy` — нет `DATABASE_URL` | Запуск из корня: `node scripts/prisma-cli.mjs migrate deploy` или `export DATABASE_URL=...` в WSL |
| Первый build AI долгий | `mediapipe` + `opencv` — нормально для `--build` |

---

## UI — `401 Unauthorized` при создании персоны

Симптом в браузере:

```json
{"message":"Invalid or expired token","error":"Unauthorized","statusCode":401}
```

При этом список персон **может загружаться** (GET `/persons` без JWT), а **POST** `/persons` требует роль EDITOR/ADMIN и валидный Bearer-токен.

Частые причины:

| Причина | Что сделать |
|---------|-------------|
| После перезапуска API сменился `JWT_SECRET` в `.env` | **Выйти** → **Войти** снова на http://localhost:3000/login |
| В `localStorage` остался старый токен | DevTools → Application → Local Storage → удалить `family-session` → войти снова |
| Не передаётся `Authorization` | Убедиться, что в Network у POST есть заголовок `Authorization: Bearer ...` |

Учётные данные после seed (если пароль задавался при первом входе / register-first-admin):

- Email: `admin@example.local`
- Пароль: тот, что вы вводили при «Создать первого admin» или при входе (в seed по умолчанию **нет** рабочего пароля — только через форму login).

Проверка API из Ubuntu:

```bash
curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.local","password":"ВАШ_ПАРОЛЬ"}'
```

В ответе должен быть `accessToken`. Этот же пароль — в форме входа Web.

---

## API :4000 — `ERR_CONNECTION_REFUSED` (API не запущен)

Симптом в браузере (DevTools → Network):

```text
GET/POST http://localhost:4000/api/v1/persons net::ERR_CONNECTION_REFUSED
```

Значение: на порту **4000 никто не слушает**. Web (`:3000`) работает, **API в отдельном терминале не запущен** или упал после ошибки `dist/main`.

Проверка (команды **из каталога проекта**, не из `~`):

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
ss -ltnp | grep ":4000"
ls -la apps/api/dist/main.js
```

Если `ls` пишет `No such file` — вы не в папке проекта (промпт `nik@...:~$` без `family-memory-platform`).

### Ubuntu / WSL: `EADDRINUSE` на порту 4000

Симптом при `pnpm api:start`:

```text
Error: listen EADDRINUSE: address already in use :::4000
```

Значит API **уже запущен** в другом терминале (часто старая сборка без аватаров). Либо используйте тот терминал, либо остановите процесс и запустите заново:

```bash
pkill -f "dist/main.js" || true
ss -ltnp | grep ":4000"
pnpm api:start
```

### Ubuntu / WSL: собрать и запустить API (надёжный способ)

Терминал 1 — оставить открытым:

```bash
source ~/.nvm/nvm.sh
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
pkill -f "dist/main.js" 2>/dev/null || true
pnpm api:prisma
pnpm api:build
ls -la apps/api/dist/main.js
pnpm api:start
```

После `api:build` файл `apps/api/dist/main.js` **обязан** существовать. Если нет — не запускайте `api:start` (будет `MODULE_NOT_FOUND`).

`pnpm api:prisma` — **обязательно из Ubuntu/WSL**, если API запускаете из WSL (см. раздел Prisma ниже).

Ожидаемо в терминале:

```text
API listening on http://localhost:4000/api/v1
```

Проверка:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4000/docs
```

Должно быть `200` или `301`. Терминал с API **не закрывать**.

Терминал 2 — Web:

```bash
source ~/.nvm/nvm.sh
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
pnpm dev:web
```

После входа в UI (`admin@example.local` / `Test12345!`) создание персоны шлёт `POST /persons` с Bearer-токеном.

### Ubuntu / WSL: hot-reload API (если `pnpm dev:api` уже работает)

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
pnpm dev:api
```

---

## API — Prisma `debian-openssl-3.0.x` (WSL vs Windows)

Симптом при `pnpm api:start` из **Ubuntu/WSL** (маршруты уже замаплены, затем падение):

```text
PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "debian-openssl-3.0.x".
This happened because Prisma Client was generated for "windows", but the actual deployment required "debian-openssl-3.0.x".
```

Причина: `pnpm db:generate` выполняли в **PowerShell/Windows**, а `node dist/main.js` — в **WSL**. Движок Prisma привязан к ОС, где запускали `generate`.

### Ubuntu / WSL: перегенерировать Prisma Client

```bash
source ~/.nvm/nvm.sh
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
pnpm api:prisma
pnpm api:start
```

### Ubuntu / WSL: `EACCES` / `EPERM` на `query_engine-windows.dll.node`

Симптом:

```text
EACCES: permission denied, rename '...query_engine-windows.dll.node.tmp...' -> '...query_engine-windows.dll.node'
```

Причина: проект на диске **`/mnt/d/...`**, а файл `.dll` держит процесс **Windows** (Node, Cursor, старый API). Prisma из WSL не может перезаписать Windows-движок.

**Шаг 1 — PowerShell (Windows Terminal), без `.ps1`**

На многих ПК включено: `выполнение сценариев отключено` — тогда **не** запускайте `.\scripts\unlock-prisma-windows.ps1`. Вставьте команды **построчно**:

```powershell
cd "D:\CURSOR\FAMILY TREE\family-memory-platform"

Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Get-ChildItem -Path ".\node_modules" -Recurse -Directory -Filter ".prisma" -ErrorAction SilentlyContinue |
  ForEach-Object {
    $client = Join-Path $_.FullName "client"
    if (Test-Path $client) {
      Remove-Item -Path (Join-Path $client "query_engine*") -Force -ErrorAction SilentlyContinue
      Remove-Item -Path (Join-Path $client "*.tmp*") -Force -ErrorAction SilentlyContinue
    }
  }

Write-Host "OK. Перейдите в Ubuntu и выполните pnpm api:prisma"
```

Если всё же нужен файл скрипта (один раз):

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\unlock-prisma-windows.ps1"
```

**Шаг 2 — снова Ubuntu/WSL:**

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
pkill -f "dist/main.js" || true
pnpm api:prisma
pnpm api:start
```

`pnpm api:prisma` → `node scripts/prisma-generate-wsl.mjs` (очистка `.tmp` + `db:generate`). В `schema.prisma` **нет** явного target `windows`.

Правило из [DOCKER_LOCAL_WINDOWS.md](./DOCKER_LOCAL_WINDOWS.md) (вариант A): **инфраструктура в Docker**, **API/Web из Ubuntu/WSL**, `pnpm install` и `pnpm db:generate` — **из Ubuntu**, не из PowerShell (иначе SWC/Prisma engines ломаются).

### Полная цепочка variant A (после разблокировки Prisma)

```bash
# Ubuntu/WSL — один раз или после перезагрузки
source ~/.nvm/nvm.sh
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
pnpm docker:infra
pnpm api:prisma
pnpm db:migrate
pnpm api:build
pnpm api:start
```

Второй терминал Ubuntu: `pnpm dev:web` → http://localhost:3000

---

## API :4000 — CORS (если API запущен, но браузер блокирует)

Симптом в браузере:

```text
blocked by CORS policy ... No 'Access-Control-Allow-Origin'
```

Частая причина: на `:4000` всё ещё крутится **старый** процесс `node apps/api/dist/.../main.js` без `enableCors` (запущен до обновления репозитория).

### Ubuntu / WSL: проверить, кто слушает 4000

```bash
ss -ltnp | grep ":4000"
ps -ef | grep "apps/api/dist" | grep -v grep
```

### Ubuntu / WSL: остановить старый API и запустить заново

```bash
pkill -f "apps/api/dist" || true
pkill -f "nest start" || true
source ~/.nvm/nvm.sh
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
rm -rf apps/api/dist
pnpm --filter @family/shared build
pnpm --filter @family/genealogy-core build
pnpm dev:api
```

Если `pnpm dev:api` падает с `Cannot find module .../dist/main` — в проекте должен быть `apps/api/tsconfig.build.json` (сборка в `dist/main.js`). Очистите старый `apps/api/dist` и перезапустите. Временный обход: `node apps/api/dist/apps/api/src/main.js` (устаревший путь).

Альтернатива (два терминала, как в DOCKER_LOCAL_WINDOWS.md):

```bash
# Терминал 1 — API (hot-reload из src, с CORS)
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
source ~/.nvm/nvm.sh
pnpm dev:api

# Терминал 2 — Web
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
source ~/.nvm/nvm.sh
cp apps/web/.env.local.example apps/web/.env.local   # один раз
pnpm dev:web
```

`pnpm dev` и `cp apps/web/...` выполняйте **только из каталога проекта**, не из `~`.

### Ubuntu / WSL: проверить CORS (preflight)

```bash
curl -i -X OPTIONS "http://localhost:4000/api/v1/persons" \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET"
```

Ожидаемо в ответе: `HTTP/1.1 204` (или 200) и заголовок `Access-Control-Allow-Origin: http://localhost:3000`.

### Прочие сообщения в консоли браузера

| Сообщение | Критично? | Пояснение |
|-----------|-----------|-----------|
| `Unable to add filesystem: <illegal path>` | Нет | DevTools Chrome + проект на `/mnt/d/...` с пробелом в пути |
| `favicon.ico 404` | Нет | Нет файла `apps/web/public/favicon.ico` |
| `React DevTools` | Нет | Подсказка dev-режима Next.js |

## Многоязычность: UI (next-intl) + география (GeographicName)

Контекст:

- **Language (переключатель):** **185 ISO 639-1** кодов из `cities/alternateNamesV2/iso-languagecodes.txt` (список в `packages/shared/src/data/geonames-locales.json`). URL: `http://localhost:3000/pl/timeline`, `http://localhost:3000/ar/timeline` и т.д.
- **Подписи формы «Место»**: для каждого языка нужен файл `apps/web/i18n/locales/<код>.json` (сейчас: `en`, `ar`, `de`, `fr`, `es`, `ru`). После добавления JSON: `pnpm i18n:sync-ui-locales` и перезапуск Web. Без JSON — подписи на английском, **названия стран/городов** — из БД (`GeographicName`, импорт `geography:import:i18n`).
- Переключатель языка в шапке меняет сегмент URL (`next-intl`).
- Названия стран/регионов/городов в API: таблица `GeographicName`, импорт из `cities/alternateNamesV2/alternateNamesV2.txt`.
- Регионы: `admin1CodesASCII.txt` (4-й столбец = `geonamesId`) → `Region.geonamesId` → переводы из alternateNamesV2.
- **СССР в UI** (`iso2=SU`) — та же зона, что RU: иначе в списке только seed «Ленинградская область». Полный список: `pnpm geography:import:regions-admin1`.
- Параметр API: `?lang=pl` (синхронизируется с локалью из URL на фронте).

Обновить список языков после обновления `iso-languagecodes.txt`:

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
source ~/.nvm/nvm.sh
pnpm geography:generate:locales
pnpm i18n:sync-ui-locales
pnpm --filter @family/shared build
```

### Ошибка `ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND` в `~`

Команда запущена **не из каталога проекта** (`/home/nik` вместо `family-memory-platform`).

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
source ~/.nvm/nvm.sh
pnpm geography:import:i18n -- --locale=ar
```

### Арабский (и другие языки): подписи + названия мест

1. **Подписи полей** (Век, Страна…): `apps/web/i18n/locales/ar.json` + `pnpm i18n:sync-ui-locales` + перезапуск Web.
2. **Названия Åland, регионов, городов**: импорт в БД (долго для `all`):

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
pnpm geography:import:i18n:ar
# или несколько: pnpm geography:import:i18n -- --locale=ar,de,fr
```

Пять языков (`/ru/`, `/de/`, …) по-прежнему требуют URL с префиксом локали; при выборе **Arabic** откройте `http://localhost:3000/ar/timeline`.

### Файлы данных (скачать с GeoNames, положить в репозиторий)

| Файл | Назначение |
|------|------------|
| `cities/RU.txt` | населённые пункты РФ |
| `cities/countryInfo.txt` | страны |
| `cities/admin1CodesASCII.txt` | регионы (admin1) |
| `cities/alternateNamesV2/alternateNamesV2.txt` | переводы названий (большой файл, ~часы импорта) |
| `cities/alternateNamesV2/iso-languagecodes.txt` | список языков для переключателя Language (185× ISO 639-1) |

### Ubuntu / WSL: после `git pull` — зависимости Web (next-intl)

Если Web не стартует (`next-intl` not found / SWC linux):

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
source ~/.nvm/nvm.sh
pnpm install
```

Важно:

- После добавления пакетов (например `next-intl`) **не** используйте `CI=true pnpm install --frozen-lockfile` — lockfile должен обновиться; иначе `ERR_PNPM_OUTDATED_LOCKFILE`.
- Устанавливать **из Ubuntu/WSL**, не из Windows PowerShell (иначе нет `@next/swc-linux-x64-gnu`).
- Если pnpm спрашивает «modules will be removed» — ответьте `Y` или: `pnpm install --config.confirmModulesPurge=false`.
- Если ошибка `Unexpected store location` (WSL vs Windows store) — один раз из WSL: `pnpm install --no-frozen-lockfile` (не смешивать install из двух ОС подряд).

### Ubuntu / WSL: миграции БД (география + регионы)

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
source ~/.nvm/nvm.sh
pnpm docker:infra
pnpm db:migrate
pnpm api:prisma
```

Ожидаемые миграции:

- `20260522180000_geographic_i18n` — `GeographicName`
- `20260523100000_region_geonames_id` — `Region.geonamesId`, `Region.admin1Key`

### Ubuntu / WSL: полный цикл справочника + переводы (без ошибок)

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
source ~/.nvm/nvm.sh

# 1) Справочник RU + привязка geonamesId к регионам
pnpm geography:import:multilang
# внутри: seed → countries → ru-cities:rebuild → backfill:regions → import:i18n

# 2) Если регионы уже были в БД до обновления — отдельно:
pnpm geography:backfill:regions
pnpm geography:import:i18n:regions
```

Пошагово (если что-то упало на середине):

```bash
pnpm geography:seed
pnpm geography:import:countries
pnpm geography:import:ru-cities:rebuild
pnpm geography:backfill:regions
pnpm geography:import:regions-admin1
pnpm geography:import:i18n
pnpm geography:import:country-i18n
```

`geography:import:country-i18n` — русские названия seed-стран (Россия, СССР, империя…) на en/de/fr/es/ru.

`geography:import:regions-admin1` — все субъекты РФ из admin1 (~80+), не только те, где есть города с min population.

`geography:import:i18n` импортирует **country + region + city**, только для `geonameId`, уже есть в БД.

### Отдельные команды i18n

По умолчанию `geography:import:i18n` импортирует **приоритетные** локали (en, ru, de, fr, es, uk, pl, …). Все 185 языков — долго (только из каталога проекта):

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
source ~/.nvm/nvm.sh
pnpm geography:import:i18n -- --locale=all
pnpm geography:import:i18n -- --locale=pl,uk,it
pnpm geography:import:i18n:ar
```

```bash
pnpm geography:backfill:regions
pnpm geography:import:i18n
pnpm geography:import:i18n:ru
pnpm geography:import:i18n:cities
pnpm geography:import:i18n:regions

node scripts/geography/import-alternate-names-v2.mjs --locale=de
node scripts/geography/import-alternate-names-v2.mjs --locale=all
node scripts/geography/import-alternate-names-v2.mjs --dry-run
```

Ожидаемый лог (каждые 500k строк):

```text
… 500,000 lines | matched 12345 | upserted 12000
Done.
```

## Перезапуск после обновления кода (git pull / правки i18n)

Всегда из каталога проекта (не из `~`):

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
source ~/.nvm/nvm.sh
```

### 1) Зависимости (если менялся package.json / lockfile)

```bash
pnpm install
# не используйте: CI=true pnpm install --frozen-lockfile
# пока lockfile не закоммичен после добавления пакетов
```

### 2) БД и география (после pull с i18n / регионы для всех стран)

```bash
pnpm docker:infra
pnpm db:migrate

# Переводы seed-стран и губерний (RU/СССР/империя…)
pnpm geography:import:country-i18n
pnpm geography:import:region-i18n

# Регионы и города для ВСЕХ стран из countryInfo (не только RU)
pnpm geography:import:countries
pnpm geography:import:regions-admin1:all

# Города: ОБЯЗАТЕЛЬНО cities15000.txt (не подставляется RU.txt!)
# https://download.geonames.org/export/dump/cities15000.zip → cities/cities15000.txt
pnpm geography:import:cities:world
pnpm geography:import:cities:backfill-regions

# Только RU.txt (без cities15000) — мир не импортируется; для РФ после RU.txt:
# pnpm geography:import:cities:backfill-regions:ru

# Переводы названий из alternateNamesV2 (долго)
pnpm geography:import:i18n
```

### Регион есть, города пустые (Германия, Гамбург и т.д.)

Причина: в БД нет строк `City` для этой страны/региона. Регионы приходят из `admin1CodesASCII.txt`, города — **отдельным** импортом.

**Важно:** если `cities15000.txt` нет, `geography:import:cities:world` **раньше молча брал `RU.txt`** (только ~4800 городов РФ). Сейчас команда **завершится с ошибкой**, пока не положите `cities/cities15000.txt`.

1. Скачать [cities15000.zip](https://download.geonames.org/export/dump/cities15000.zip) → `cities/cities15000.txt` (все страны, население ≥15k в файле; скрипт по умолчанию `--min-population=1000`).
2. Или одну страну: [DE.zip](https://download.geonames.org/export/dump/DE.zip) → `cities/DE.txt`, затем:

```bash
pnpm geography:import:cities:de
# или: pnpm geography:import:cities -- --country=DE --min-population=0
pnpm geography:import:cities:backfill-regions -- --country=DE
```

3. Перезапустить API (см. ниже) и обновить страницу `Ctrl+F5`.

Проверка API (подставьте `countryId` и `regionId` из ответа `/places/regions`):

```bash
curl -s "http://localhost:4000/api/v1/places/cities?countryId=geo-country-de&regionId=geo-geonames-region-de-04&lang=en" \
  -H "Authorization: Bearer YOUR_TOKEN" | head -c 500
```

Одна страна (например Польша): скачать `PL.zip` → `cities/PL.txt`, затем:

```bash
pnpm geography:import:regions-admin1 -- --country=PL
pnpm geography:import:cities -- --country=PL --min-population=0
pnpm geography:import:cities:backfill-regions -- --country=PL
pnpm geography:import:i18n:regions
```

### 3) API — терминал A

```bash
pkill -f "nest start" 2>/dev/null || true
pkill -f "dist/main.js" 2>/dev/null || true

pnpm api:prisma
pnpm --filter @family/shared build
pnpm api:build && pnpm api:start
```

Проверка: `ss -ltnp | grep ":4000"` и в логе `API listening on http://localhost:4000/api/v1`.

### 4) Web — терминал B

```bash
pkill -f "next dev --port 3000" 2>/dev/null || true
pnpm --filter @family/web dev
```

Проверка UI на языке:

- `http://localhost:3000/en/timeline` — меню и «Место» / «Event» на английском
- `http://localhost:3000/ru/timeline` — на русском
- `http://localhost:3000/ar/timeline` — подписи на арабском (названия стран — после `geography:import:i18n:ar`)

После добавления `apps/web/i18n/locales/xx.json`: `pnpm i18n:build-ui-locales`, затем перезапуск Web.

### 5) Браузер

`Ctrl + F5` на странице хронологии.

### Одной цепочкой (код + география + API + Web)

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
source ~/.nvm/nvm.sh
pnpm install
pnpm docker:infra && pnpm db:migrate
pnpm geography:import:countries
pnpm geography:import:regions-admin1:all
# нужен файл cities/cities15000.txt
pnpm geography:import:cities:world
pnpm geography:import:cities:backfill-regions
pnpm geography:import:country-i18n && pnpm geography:import:region-i18n

pkill -f "dist/main.js" 2>/dev/null || true
pnpm api:prisma && pnpm --filter @family/shared build && pnpm api:build && pnpm api:start
# второй терминал:
pkill -f "next dev --port 3000" 2>/dev/null || true
pnpm --filter @family/web dev
```

---

### Ubuntu / WSL: перезапуск API + Web (кратко)

```bash
pkill -f "dist/main.js" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true

pnpm api:prisma
pnpm --filter @family/shared build
pnpm api:build && pnpm api:start
```

Второй терминал:

```bash
source ~/.nvm/nvm.sh
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
pnpm --filter @family/web dev
```

### Проверка

```bash
# API
curl -s "http://localhost:4000/api/v1/places/search?q=Mosk&lang=ru" | head -c 400

# Web (редирект на локаль по умолчанию en)
curl -sI "http://localhost:3000/timeline" | head -5
```

В браузере:

- `http://localhost:3000/en/timeline` — английский UI + названия из API
- `http://localhost:3000/ru/timeline` — русский
- Старые URL без префикса (`/timeline`) — middleware перенаправит на `/en/timeline`

### Типичные ошибки

| Симптом | Решение |
|---------|---------|
| `Environment variable not found: DATABASE_URL` | `pnpm docker:infra`, проверить `.env` в корне, `pnpm db:migrate` |
| `EADDRINUSE :::4000` | `pkill -f "dist/main.js"` затем `pnpm api:start` |
| `next-intl` / module not found | `pnpm install` из **WSL** |
| Регионы на латинице | `pnpm geography:backfill:regions` затем `pnpm geography:import:i18n:regions` |
| CORS на `:4000` | пересобрать и перезапустить API (см. раздел CORS выше) |

### Регион на английском остаётся по-русски

Причины: seed-губерния без перевода или не выполнен `geography:import:region-i18n` / `geography:import:i18n`.

```bash
pnpm geography:import:region-i18n
pnpm geography:import:i18n:regions
```

### Ограничения (MVP)

- Меню сайдбара («Люди», «Древо») пока частично на русском — словари в `apps/web/i18n/locales/*.json` дополняются постепенно.
- Полный `alternateNamesV2.txt` очень большой; импорт 30–120+ минут.
- `City.name` / `Region.name` в БД — канон; отображение — `GeographicName` + `?lang=`.
