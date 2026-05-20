# Локальные команды проекта

Файл нужен как рабочая памятка: сюда добавляем команды для PowerShell и Ubuntu/WSL, что они делают, какой результат ожидается и какие ошибки уже встречались.

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

### Windows PowerShell: проверить страницу

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/documentation" -UseBasicParsing
```

Ожидаемо:

```text
StatusCode: 200
```

После перезапуска в браузере нажмите `Ctrl + F5`, чтобы обновить страницу без старого кэша.
