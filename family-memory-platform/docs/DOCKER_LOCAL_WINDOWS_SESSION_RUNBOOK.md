# Runbook: фактический локальный запуск проекта на Windows 11 + WSL2 + Docker

Документ описывает реальный порядок запуска `family-memory-platform`, который был пройден на Windows 11 с Docker Desktop, Ubuntu/WSL и Cursor.

Цель документа:

- зафиксировать рабочую последовательность команд;
- объяснить, что было сделано и зачем;
- описать ошибки, которые встретились по пути;
- показать, как понять, что проект уже запущен;
- дать план перехода к варианту B: полный Docker-запуск;
- дать основу для будущего переноса на VPS.

Связанные документы:

- [`DOCKER_LOCAL_WINDOWS.md`](./DOCKER_LOCAL_WINDOWS.md) — общий документ.
- [`DOCKER_LOCAL_WINDOWS_VARIANT_A_INFRA_HOST_APPS.md`](./DOCKER_LOCAL_WINDOWS_VARIANT_A_INFRA_HOST_APPS.md) — вариант A: инфраструктура в Docker, приложения на хосте.
- [`DOCKER_LOCAL_WINDOWS_VARIANT_B_FULL_DOCKER.md`](./DOCKER_LOCAL_WINDOWS_VARIANT_B_FULL_DOCKER.md) — вариант B: всё в Docker.

---

## 1. Итоговое состояние

На момент успешного запуска:

| Компонент | Статус | Как проверять |
|---|---|---|
| PostgreSQL | Работает в Docker | `docker exec family_postgres pg_isready -U family_user -d family_platform` |
| Redis | Работает в Docker | `docker exec family_redis redis-cli ping` |
| MinIO | Работает в Docker | `http://localhost:9001/login` |
| Meilisearch | Контейнер поднят, может быть `unhealthy`, но UI/HTTP доступен | `http://localhost:7700/` или `http://localhost:7700/health` |
| API NestJS | Работает на порту `4000` | `http://localhost:4000/docs` |
| Web Next.js | Работает на порту `3000` | `http://localhost:3000` |

Важно:

- `http://localhost:5432/` не должен открываться в браузере. Это порт PostgreSQL, не HTTP.
- `http://localhost:6379/` не должен открываться в браузере. Это порт Redis, не HTTP.
- Для API правильный базовый путь: `http://localhost:4000/api/v1`, а не `http://localhost:4000/api/v`.
- Swagger открывается по адресу: `http://localhost:4000/docs`.

---

## 2. Что означает текущий режим запуска

Используется вариант A:

```text
Docker:
  family_postgres
  family_redis
  family_minio
  family_meilisearch

Ubuntu/WSL:
  API NestJS
  Web Next.js
```

Схема:

```text
Browser
  |
  +--> http://localhost:3000       -> Next.js Web
  |
  +--> http://localhost:4000/docs  -> NestJS Swagger

NestJS API
  |
  +--> PostgreSQL  localhost:5432
  +--> Redis       localhost:6379
  +--> MinIO       localhost:9000
  +--> Meilisearch localhost:7700
```

Почему так удобно на локальной машине:

- Docker держит тяжёлую инфраструктуру.
- Код `api` и `web` запускается из WSL.
- Cursor редактирует файлы напрямую.
- Не нужно пересобирать Docker-образы после каждого изменения кода.

---

## 3. Что было сделано по шагам

### Шаг 1. Перешли в проект

Команда:

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
```

Зачем:

- все команды `pnpm`, `docker compose`, Prisma и сборки должны выполняться из корня проекта;
- кавычки нужны из-за пробела в папке `FAMILY TREE`.

Проверка:

```bash
ls
```

Ожидаемые файлы:

```text
docker-compose.yml
docker-compose.dev.yml
package.json
pnpm-lock.yaml
apps
packages
infra
docs
```

---

### Шаг 2. Проверили Docker

Команды:

```bash
docker --version
docker compose version
docker ps
```

Зачем:

- убедиться, что Docker Desktop запущен;
- убедиться, что Ubuntu/WSL видит Docker Engine.

---

### Шаг 3. Запустили инфраструктуру

Рабочая команда:

```bash
pnpm docker:infra
```

Эквивалент без `pnpm`:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

Что было запущено:

```text
family_postgres
family_redis
family_minio
family_meilisearch
```

Проверка:

```bash
docker ps --filter "name=family_"
```

---

### Шаг 4. Исправили Node.js/pnpm внутри Ubuntu

Проблема:

```text
/mnt/c/Program Files/nodejs/pnpm: 11: exec: node: not found
```

Причина:

- Ubuntu подхватила Windows-версию `pnpm`;
- Linux-версия `node` внутри Ubuntu не была корректно доступна.

Правильный подход:

```bash
sudo apt update
sudo apt install -y curl ca-certificates
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
corepack enable
corepack prepare pnpm@9.15.0 --activate
hash -r
```

Проверка:

```bash
which node
node -v
which pnpm
pnpm -v
```

Правильно, если пути похожи на:

```text
/home/nik/.nvm/versions/node/v20.20.2/bin/node
/home/nik/.nvm/versions/node/v20.20.2/bin/pnpm
```

Неправильно, если `pnpm` идёт из:

```text
/mnt/c/Program Files/nodejs/pnpm
```

---

### Шаг 5. Установили зависимости

Команда:

```bash
pnpm install
```

На вопрос:

```text
The modules directories will be removed and reinstalled from scratch. Proceed? (Y/n)
```

нужно отвечать:

```text
Y
```

или нажать `Enter`.

Что делает `pnpm install`:

- пересоздаёт `node_modules`;
- устанавливает `next`, `nestjs`, `prisma`, `turbo` и остальные зависимости;
- подготавливает monorepo к запуску.

Что не удаляется:

```text
apps
packages
docs
.env
docker-compose.yml
README.md
```

Если ответить `n`, зависимости не будут установлены, и дальше появятся ошибки:

```text
Cannot find module ... prisma
Cannot find module ... next
Cannot find module ... @nestjs/cli
```

---

### Шаг 6. Исправили `.env`

Проблема:

```text
PrismaClientInitializationError: invalid port number in database URL
```

Причина:

В `.env` была строка с вложенными переменными:

```env
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public
```

Prisma получила эту строку без раскрытия переменных и увидела порт как:

```text
${POSTGRES_PORT}
```

Решение: сделать `DATABASE_URL` явным:

```env
DATABASE_URL=postgresql://family_user:change_me_postgres@localhost:5432/family_platform?schema=public
```

Также желательно сделать явным Redis URL:

```env
REDIS_URL=redis://localhost:6379
```

Если пароль PostgreSQL был изменён, нужно подставить свой пароль вместо `change_me_postgres`.

---

### Шаг 7. Сгенерировали Prisma Client

Команда:

```bash
pnpm db:generate
```

Что делает:

- читает `apps/api/prisma/schema.prisma`;
- генерирует Prisma Client;
- не требует подключения к базе.

Успешный результат:

```text
Generated Prisma Client
```

---

### Шаг 8. Экспортировали `DATABASE_URL` для миграции

Проблема:

```text
Environment variable not found: DATABASE_URL
```

Причина:

- Prisma CLI запускается внутри workspace-пакета `apps/api`;
- корневой `.env` может не подхватываться автоматически.

Рабочее решение:

```bash
export DATABASE_URL="postgresql://family_user:change_me_postgres@localhost:5432/family_platform?schema=public"
```

Если пароль другой, используйте свой пароль.

---

### Шаг 9. Применили миграцию

Команда:

```bash
pnpm db:migrate
```

Prisma спросила:

```text
Enter a name for the new migration:
```

Было введено:

```text
init
```

Результат:

- создана папка миграции в `apps/api/prisma/migrations/`;
- таблицы созданы в PostgreSQL.

В git появился новый путь:

```text
apps/api/prisma/migrations/20260519145419_init/
```

Это нормальное изменение: миграцию нужно сохранить в репозитории, если эта схема является стартовой для проекта.

---

### Шаг 10. Собрали общие пакеты и API

Команды:

```bash
pnpm --filter @family/shared build
pnpm --filter @family/genealogy-core build
pnpm --filter @family/api build
```

Зачем:

- `@family/shared` содержит общие типы и константы;
- `@family/genealogy-core` содержит доменную логику;
- `@family/api` зависит от этих пакетов;
- API в текущей конфигурации собирается не в `dist/main.js`, а в `dist/apps/api/src/main.js`.

---

### Шаг 11. Запустили API

Команда:

```bash
node apps/api/dist/apps/api/src/main.js
```

Успешный признак:

```text
Nest application successfully started
```

Проверка:

```text
http://localhost:4000/docs
```

Важно: правильный API prefix:

```text
/api/v1
```

Поэтому `http://localhost:4000/api/v` возвращает:

```json
{
  "message": "Cannot GET /api/v",
  "error": "Not Found",
  "statusCode": 404
}
```

Это нормально, потому что правильный путь:

```text
http://localhost:4000/api/v1
```

А документация:

```text
http://localhost:4000/docs
```

---

### Шаг 12. Запустили Web

В отдельной вкладке Ubuntu:

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
pnpm --filter @family/web dev
```

Успешный признак:

```text
Local: http://localhost:3000
Ready
```

Проверка:

```text
http://localhost:3000
```

---

## 4. Текущая рабочая схема запуска

Используйте две вкладки Ubuntu.

### Вкладка 1: API

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
export DATABASE_URL="postgresql://family_user:change_me_postgres@localhost:5432/family_platform?schema=public"
pnpm --filter @family/shared build
pnpm --filter @family/genealogy-core build
pnpm --filter @family/api build
node apps/api/dist/apps/api/src/main.js
```

Держите вкладку открытой.

### Вкладка 2: Web

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
pnpm --filter @family/web dev
```

Держите вкладку открытой.

---

## 5. Как понять, что всё уже запущено

### Проверить Docker-инфраструктуру

```bash
docker ps --filter "name=family_"
```

Ожидаемо:

```text
family_postgres
family_redis
family_minio
family_meilisearch
```

### Проверить PostgreSQL

```bash
docker exec family_postgres pg_isready -U family_user -d family_platform
```

Ожидаемо:

```text
accepting connections
```

### Проверить Redis

```bash
docker exec family_redis redis-cli ping
```

Ожидаемо:

```text
PONG
```

### Проверить Web

```text
http://localhost:3000
```

### Проверить API/Swagger

```text
http://localhost:4000/docs
```

---

## 6. Частые ошибки и что они означают

### `EADDRINUSE: address already in use :::4000`

Пример:

```text
Error: listen EADDRINUSE: address already in use :::4000
```

Значение:

- порт `4000` уже занят;
- чаще всего API уже запущен в другой вкладке или процессе;
- это не поломка проекта.

Что делать:

1. Откройте `http://localhost:4000/docs`.
2. Если Swagger открывается, API уже работает, второй раз запускать не нужно.
3. Если нужно перезапустить API, сначала остановите старый процесс через `Ctrl + C` в той вкладке, где он запущен.

Найти процесс из Ubuntu:

```bash
ss -ltnp | grep ':4000'
```

Если нужно принудительно завершить процесс:

```bash
kill <PID>
```

Где `<PID>` — номер процесса из команды `ss`.

---

### `EADDRINUSE: address already in use :::3000`

Значение:

- порт `3000` уже занят;
- чаще всего Web уже запущен в другой вкладке.

Что делать:

1. Откройте `http://localhost:3000`.
2. Если сайт открывается, Web уже работает.
3. Не запускайте `pnpm --filter @family/web dev` второй раз.

Найти процесс:

```bash
ss -ltnp | grep ':3000'
```

---

### `Cannot GET /api/v`

Значение:

- вы открыли неправильный путь API;
- в проекте используется prefix `/api/v1`.

Правильно:

```text
http://localhost:4000/api/v1
http://localhost:4000/docs
http://localhost:4000/api/v1/health
```

Неправильно:

```text
http://localhost:4000/api/v
```

---

### Meilisearch `unhealthy`

В `docker ps` может быть:

```text
family_meilisearch   Up ... (unhealthy)
```

При этом `http://localhost:7700/` может открываться.

Что проверить:

```bash
docker logs family_meilisearch
```

И:

```text
http://localhost:7700/health
```

Если `/health` отвечает, для текущего MVP это не блокирует запуск Web/API.

Причина может быть в healthcheck внутри контейнера: образ Meilisearch может не иметь нужной утилиты для проверки или проверка выполняется не так, как ожидает контейнер.

---

### `Environment variable not found: DATABASE_URL`

Значение:

- Prisma CLI не увидела переменную окружения.

Решение:

```bash
export DATABASE_URL="postgresql://family_user:change_me_postgres@localhost:5432/family_platform?schema=public"
pnpm db:migrate
```

---

### `invalid port number in database URL`

Значение:

- Prisma получила строку `DATABASE_URL` с нераскрытыми переменными.

Плохо:

```env
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public
```

Хорошо:

```env
DATABASE_URL=postgresql://family_user:change_me_postgres@localhost:5432/family_platform?schema=public
```

---

### `Cannot find module ... dist/main`

Значение:

- Nest ожидает `apps/api/dist/main.js`;
- текущий monorepo собирает API в `apps/api/dist/apps/api/src/main.js`.

Рабочий запуск:

```bash
node apps/api/dist/apps/api/src/main.js
```

В будущем это лучше исправить в конфигурации `apps/api`, чтобы команда `pnpm dev` запускала API без ручного пути.

---

## 7. Что делать после перезагрузки компьютера

### 1. Запустить Docker Desktop

Убедитесь, что Docker Engine работает.

### 2. Проверить контейнеры

```bash
docker ps --filter "name=family_"
```

Если контейнеров нет:

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
pnpm docker:infra
```

### 3. Запустить API

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
export DATABASE_URL="postgresql://family_user:change_me_postgres@localhost:5432/family_platform?schema=public"
pnpm --filter @family/shared build
pnpm --filter @family/genealogy-core build
pnpm --filter @family/api build
node apps/api/dist/apps/api/src/main.js
```

### 4. Запустить Web

Во второй вкладке Ubuntu:

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
pnpm --filter @family/web dev
```

### 5. Проверить браузер

```text
http://localhost:3000
http://localhost:4000/docs
```

---

## 8. Когда нужно снова запускать миграции

Миграции нужны, если менялся файл:

```text
apps/api/prisma/schema.prisma
```

Команды:

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
export DATABASE_URL="postgresql://family_user:change_me_postgres@localhost:5432/family_platform?schema=public"
pnpm db:generate
pnpm db:migrate
```

Если Prisma спрашивает имя миграции, вводите короткое осмысленное имя:

```text
add_person_fields
```

или:

```text
init
```

---

## 9. Как подготовить переход к варианту B

Вариант B означает:

```text
PostgreSQL -> Docker
Redis      -> Docker
MinIO      -> Docker
Meilisearch-> Docker
API        -> Docker
Web        -> Docker
```

То есть API и Web больше не запускаются отдельными командами в Ubuntu, а работают как контейнеры:

```text
family_api
family_web
```

### Что важно учесть перед переходом

| Тема | Что проверить |
|---|---|
| `.env` | Все переменные должны быть заполнены явно |
| `DATABASE_URL` | Для контейнера API должен использоваться хост `postgres`, не `localhost` |
| `REDIS_URL` | Для контейнера API должен использоваться `redis://redis:6379` |
| `MINIO_ENDPOINT` | Внутри Docker должен быть `minio` |
| `MEILI_HOST` | Внутри Docker должен быть `http://meilisearch:7700` |
| Миграции | Нужно решить, запускать их вручную или добавить отдельный migration job |
| API dist path | Нужно проверить, что Dockerfile запускает правильный файл |

---

## 10. План миграции к варианту B локально

### Шаг 1. Остановить локальные Web/API процессы

В вкладках, где работают API и Web:

```text
Ctrl + C
```

Зачем:

- освободить порты `3000` и `4000`;
- избежать `EADDRINUSE`.

---

### Шаг 2. Запустить полный Docker Compose

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile apps up -d --build
```

Что делает:

- запускает инфраструктуру;
- собирает `family_api`;
- собирает `family_web`;
- запускает приложения в контейнерах.

---

### Шаг 3. Проверить контейнеры

```bash
docker ps --filter "name=family_"
```

Ожидаемо:

```text
family_postgres
family_redis
family_minio
family_meilisearch
family_api
family_web
```

---

### Шаг 4. Проверить логи

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f api web
```

Что смотреть:

- API не должен падать по `DATABASE_URL`;
- Web должен слушать `3000`;
- API должен слушать `4000`;
- не должно быть `EADDRINUSE`.

---

### Шаг 5. Проверить браузер

```text
http://localhost:3000
http://localhost:4000/docs
```

---

## 11. Что надо улучшить перед полноценным вариантом B

### 1. Исправить запуск API в monorepo

Сейчас рабочий ручной запуск:

```bash
node apps/api/dist/apps/api/src/main.js
```

Но в Dockerfile production указано:

```dockerfile
CMD ["node", "dist/main.js"]
```

Это может не совпасть с фактическим путём сборки.

Нужно привести сборку API к одному из вариантов:

Вариант 1:

- настроить Nest/TypeScript так, чтобы результат был `dist/main.js`;
- оставить Dockerfile как есть.

Вариант 2:

- изменить Dockerfile и package scripts под фактический путь `dist/apps/api/src/main.js`.

Рекомендуемый подход: привести API к стандартному Nest output `dist/main.js`, чтобы `start`, `start:prod`, Dockerfile и локальный запуск были одинаковыми.

---

### 2. Сделать явные env для Docker

Для локального варианта A:

```env
DATABASE_URL=postgresql://family_user:change_me_postgres@localhost:5432/family_platform?schema=public
REDIS_URL=redis://localhost:6379
MINIO_ENDPOINT=localhost
MEILI_HOST=http://localhost:7700
```

Для Docker-варианта B внутри API:

```env
DATABASE_URL=postgresql://family_user:change_me_postgres@postgres:5432/family_platform?schema=public
REDIS_URL=redis://redis:6379
MINIO_ENDPOINT=minio
MEILI_HOST=http://meilisearch:7700
```

Разница:

- `localhost` — когда API запускается на хосте/WSL;
- `postgres`, `redis`, `minio`, `meilisearch` — когда API запускается внутри Docker-сети.

---

### 3. Добавить понятный migration flow

Для VPS лучше не использовать интерактивную команду:

```bash
prisma migrate dev
```

Для сервера нужно:

```bash
prisma migrate deploy
```

Потому что:

- `migrate dev` предназначен для разработки;
- `migrate deploy` применяет уже созданные миграции без вопросов;
- на VPS не должно быть интерактивного вопроса `Enter a name for the new migration`.

---

## 12. План переноса на VPS

### Этап 1. Подготовить репозиторий

Перед VPS нужно сохранить в git:

```text
apps/api/prisma/migrations/...
docs/...
docker-compose.yml
docker-compose.prod.yml
infra/...
```

Важно не коммитить реальные секреты:

```text
.env
```

Файл `.env` должен создаваться отдельно на VPS.

---

### Этап 2. Подготовить VPS

На VPS нужны:

```text
Docker Engine
Docker Compose plugin
Git
```

Проверка:

```bash
docker --version
docker compose version
git --version
```

---

### Этап 3. Скопировать проект

На VPS:

```bash
git clone <repo-url> family-memory-platform
cd family-memory-platform
```

---

### Этап 4. Создать production `.env`

На VPS:

```bash
cp .env.example .env
nano .env
```

Для production важно:

- поменять все `change_me_*`;
- поставить сильный `JWT_SECRET`;
- задать реальные домены;
- не использовать слабые локальные пароли.

Пример направлений:

```env
NODE_ENV=production
APP_URL=https://family.example.com
API_URL=https://family.example.com/api
POSTGRES_DB=family_platform
POSTGRES_USER=family_user
POSTGRES_PASSWORD=strong_password_here
JWT_SECRET=very_long_random_secret_here
```

---

### Этап 5. Запустить production compose

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Что должно подняться:

```text
postgres
redis
minio
meilisearch
api
web
nginx
```

---

### Этап 6. Применить миграции на VPS

Нужен один из вариантов.

Вариант A: отдельная команда внутри API-контейнера:

```bash
docker exec -it family_api sh
prisma migrate deploy
```

Вариант B: добавить отдельный migration service в Docker Compose.

Рекомендуется для production: отдельный migration job, чтобы миграции были управляемыми и повторяемыми.

---

### Этап 7. Настроить домен и SSL

Для production:

- домен указывает на IP VPS;
- Nginx проксирует `web` и `api`;
- SSL через Let's Encrypt/Certbot или reverse proxy с автоматическим TLS.

Проверки:

```text
https://family.example.com
https://family.example.com/docs
```

---

## 13. Что проверить перед вариантом B/VPS

Чеклист:

- [ ] API запускается локально.
- [ ] Web запускается локально.
- [ ] `http://localhost:4000/docs` открывается.
- [ ] `http://localhost:3000` открывается.
- [ ] `docker exec family_postgres pg_isready -U family_user -d family_platform` возвращает `accepting connections`.
- [ ] `docker exec family_redis redis-cli ping` возвращает `PONG`.
- [ ] Prisma migration `init` сохранена в `apps/api/prisma/migrations`.
- [ ] `.env` не содержит боевых секретов в git.
- [ ] Путь сборки API приведён к единому виду для Docker.
- [ ] Для production используется `prisma migrate deploy`, а не `prisma migrate dev`.

---

## 14. Краткая команда для текущего локального запуска

Если контейнеры уже работают, используйте:

Вкладка 1:

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
export DATABASE_URL="postgresql://family_user:change_me_postgres@localhost:5432/family_platform?schema=public"
pnpm --filter @family/shared build
pnpm --filter @family/genealogy-core build
pnpm --filter @family/api build
node apps/api/dist/apps/api/src/main.js
```

Вкладка 2:

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
pnpm --filter @family/web dev
```

Проверка:

```text
http://localhost:3000
http://localhost:4000/docs
```

Если видите `EADDRINUSE`, значит соответствующий сервис уже запущен.
