# Локальный запуск Family Memory Platform в Docker (Windows 11)

Пошаговая инструкция для окружения: **Docker Desktop**, **WSL2 (Ubuntu)**, **Windows Terminal** (PowerShell и Ubuntu), как на типичной рабочей станции разработчика.

Проект: монорепозиторий `family-memory-platform` (Next.js + NestJS + PostgreSQL, Redis, MinIO, Meilisearch).

Главная идея локального Docker-запуска:

- Docker поднимает внешние сервисы проекта: базу данных, кэш, файловое хранилище и поиск.
- Код приложения можно запускать двумя способами:
  - **рекомендуемый для разработки**: инфраструктура в Docker, `web` и `api` запускаются через `pnpm dev`;
  - **полностью в Docker**: инфраструктура, `web` и `api` запускаются контейнерами через профиль `apps`.

---

## Содержание

1. [Что будет запущено](#1-что-будет-запущено)
2. [Предварительные требования](#2-предварительные-требования)
3. [Настройка Docker Desktop](#3-настройка-docker-desktop)
4. [Подготовка проекта](#4-подготовка-проекта)
5. [Вариант A — инфраструктура в Docker, приложения на хосте (рекомендуется)](#5-вариант-a--инфраструктура-в-docker-приложения-на-хосте-рекомендуется)
6. [Вариант B — всё в Docker (профиль apps)](#6-вариант-b--всё-в-docker-профиль-apps)
7. [Опциональные сервисы](#7-опциональные-сервисы)
8. [Проверка и URL](#8-проверка-и-url)
9. [Остановка и очистка](#9-остановка-и-очистка)
10. [Типичные проблемы на Windows](#10-типичные-проблемы-на-windows)
11. [Шпаргалка команд](#11-шпаргалка-команд)

---

## 1. Что будет запущено

| Сервис        | Контейнер              | Порт по умолчанию | Назначение              |
|---------------|------------------------|-------------------|-------------------------|
| PostgreSQL 16 | `family_postgres`      | 5432              | Основная БД (Prisma)    |
| Redis 7       | `family_redis`         | 6379              | Кэш, очереди          |
| MinIO         | `family_minio`         | 9000, 9001        | Фото/документы (S3)     |
| Meilisearch   | `family_meilisearch`   | 7700              | Полнотекстовый поиск    |
| API (NestJS)  | `family_api`           | 4000              | Только в профиле `apps` |
| Web (Next.js) | `family_web`           | 3000              | Только в профиле `apps` |
| Neo4j         | `family_neo4j`         | 7474, 7687        | Профиль `graph`         |
| AI (FastAPI)  | `family_ai`            | 8000              | Профиль `ai`            |

Контейнер `welcome-to-docker` (порт **8080**) к проекту не относится — его можно остановить, чтобы не путаться в Docker Desktop.

---

## 2. Предварительные требования

### Обязательно

| Компонент        | Версия   | Проверка |
|------------------|----------|----------|
| Windows 11       | актуальная | — |
| Docker Desktop   | 4.x+     | `docker --version` |
| WSL2 + Ubuntu    | 22.04+   | `wsl -l -v` |
| Git              | любая    | `git --version` |

### Для варианта A (рекомендуется)

| Компонент | Версия | Установка |
|-----------|--------|-----------|
| Node.js   | ≥ 20   | https://nodejs.org/ или `winget install OpenJS.NodeJS.LTS` |
| pnpm      | ≥ 9    | `corepack enable` затем `corepack prepare pnpm@9.15.0 --activate` |

### Проверка Docker

В **Ubuntu (WSL)** или **PowerShell**:

```bash
docker --version
docker compose version
docker ps
```

Должен быть запущен Docker Engine (в Docker Desktop — зелёный статус «Engine running»).

---

## 3. Настройка Docker Desktop

1. Откройте **Docker Desktop** → **Settings** (шестерёнка).
2. **General**
   - Включите **Use the WSL 2 based engine**.
   - Включите **Start Docker Desktop when you sign in** (по желанию).
3. **Resources → WSL Integration**
   - Включите интеграцию для дистрибутива **Ubuntu**.
4. **Apply & Restart**.

Рекомендация: основные команды `docker compose` и `pnpm` выполняйте из вкладки **Ubuntu** в Windows Terminal — меньше проблем с путями и производительностью томов.

Что означает эта настройка:

| Действие | Зачем нужно | Что должно получиться |
|----------|-------------|-----------------------|
| Включить WSL2 engine | Docker будет работать через Linux-ядро WSL2, это стандартный режим для Windows 11 | Контейнеры Linux запускаются без отдельной виртуальной машины |
| Включить Ubuntu в WSL Integration | Команда `docker` станет доступна прямо в терминале Ubuntu | В Ubuntu можно выполнять `docker ps` и `docker compose ...` |
| Apply & Restart | Docker применит интеграцию и перезапустит движок | В Docker Desktop статус должен быть `Engine running` |

Проверка после настройки:

```bash
docker ps
```

Если команда показывает список контейнеров без ошибки подключения к Docker Engine — настройка выполнена правильно.

---

## 4. Подготовка проекта

### 4.1. Перейти в каталог проекта

Путь на диске Windows (пример):

```text
D:\CURSOR\FAMILY TREE\family-memory-platform
```

В WSL (обратите внимание на пробел в `FAMILY TREE` — путь в кавычках):

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
```

В **PowerShell**:

```powershell
cd "D:\CURSOR\FAMILY TREE\family-memory-platform"
```

Пояснение:

| Команда | Что делает | Почему важно |
|---------|------------|--------------|
| `cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"` | Переходит в папку проекта из Ubuntu/WSL | Docker Compose должен запускаться из корня проекта, где лежит `docker-compose.yml` |
| `cd "D:\CURSOR\FAMILY TREE\family-memory-platform"` | Переходит в папку проекта из PowerShell | Кавычки обязательны из-за пробела в `FAMILY TREE` |

Проверка, что вы в правильной папке:

```bash
ls
```

В списке должны быть файлы `docker-compose.yml`, `docker-compose.dev.yml`, `package.json`, `.env.example`.

### 4.2. Создать файл `.env`

**Ubuntu / PowerShell:**

```bash
cp .env.example .env
```

Откройте `.env` в редакторе и замените значения `change_me_*` на свои пароли (минимум для локальной машины):

- `POSTGRES_PASSWORD`
- `MINIO_ROOT_PASSWORD`
- `MEILI_MASTER_KEY`
- `JWT_SECRET` (не короче 32 символов)

Для **варианта A** оставьте хосты как в шаблоне (`localhost` для Postgres, Redis, MinIO, Meili).

Для **варианта B** (приложения в контейнерах) переменные `DATABASE_URL`, `REDIS_URL`, `MEILI_HOST`, `MINIO_ENDPOINT` переопределяются в `docker-compose.dev.yml` внутри сети Docker — файл `.env` всё равно нужен для `JWT_SECRET` и публичных URL.

Пояснение:

| Действие | Что делает | Почему важно |
|----------|------------|--------------|
| `cp .env.example .env` | Создаёт локальный файл настроек из шаблона | Docker Compose и приложения читают реальные пароли и URL из `.env` |
| Замена `POSTGRES_PASSWORD` | Задаёт пароль пользователя PostgreSQL | Без совпадения пароля API не подключится к базе |
| Замена `MINIO_ROOT_PASSWORD` | Задаёт пароль администратора MinIO | Нужен для входа в MinIO Console на `localhost:9001` |
| Замена `MEILI_MASTER_KEY` | Задаёт мастер-ключ поиска | Нужен для защищённого доступа к Meilisearch |
| Замена `JWT_SECRET` | Задаёт секрет подписи токенов авторизации | Должен быть длинным, иначе авторизация небезопасна |

Минимальный пример локальных значений:

```env
POSTGRES_PASSWORD=local_postgres_password
MINIO_ROOT_PASSWORD=local_minio_password
MEILI_MASTER_KEY=local_meili_master_key_123
JWT_SECRET=local_jwt_secret_minimum_32_characters
```

### 4.3. (Опционально) Остановить демо-контейнер

В Docker Desktop: **Containers** → `welcome-to-docker` → **Stop**,  
или в терминале:

```bash
docker stop welcome-to-docker
```

---

## 5. Вариант A — инфраструктура в Docker, приложения на хосте (рекомендуется)

Подходит для ежедневной разработки: быстрый hot-reload, проще отладка в Cursor/VS Code.

Этот вариант лучше для вашей текущей ситуации: Docker Desktop уже установлен, а разработку удобнее вести из Cursor. В Docker будут работать PostgreSQL, Redis, MinIO и Meilisearch, а `api` и `web` будут запускаться обычной командой `pnpm dev`.

Общая последовательность:

| Шаг | Команда | Что делает | Ожидаемый результат |
|-----|---------|------------|---------------------|
| 1 | `pnpm docker:infra` | Запускает инфраструктурные контейнеры | В Docker Desktop появятся `family_postgres`, `family_redis`, `family_minio`, `family_meilisearch` |
| 2 | `pnpm install` | Ставит зависимости Node.js для monorepo | Появляется/обновляется папка `node_modules` |
| 3 | `pnpm db:generate` | Генерирует Prisma Client | API сможет работать с типизированным доступом к БД |
| 4 | `pnpm db:migrate` | Применяет миграции к PostgreSQL | В базе появятся таблицы проекта |
| 5 | `pnpm dev` | Запускает web и api в dev-режиме | Откроются `localhost:3000` и `localhost:4000` |

### Шаг 1. Запустить инфраструктуру

```bash
pnpm docker:infra
```

Что делает команда:

- читает `docker-compose.yml`;
- добавляет настройки из `docker-compose.dev.yml`;
- скачивает образы PostgreSQL, Redis, MinIO, Meilisearch, если их ещё нет;
- создаёт контейнеры проекта;
- запускает их в фоне.

Эквивалент:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

Дождитесь статуса **healthy** у postgres, redis, meilisearch (в Docker Desktop или `docker ps`).

Проверка:

```bash
docker ps --filter "name=family_"
```

Если контейнеры есть в списке, значит инфраструктура поднялась.

### Шаг 2. Установить зависимости Node

```bash
pnpm install
```

Что делает команда:

- читает `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`;
- устанавливает зависимости для `apps/web`, `apps/api` и `packages/*`;
- готовит проект к запуску без контейнеров приложения.

Если `pnpm` не найден:

```bash
corepack enable
corepack prepare pnpm@9.15.0 --activate
```

### Шаг 3. Prisma: клиент и миграции

```bash
pnpm db:generate
pnpm db:migrate
```

При первом запуске миграций введите имя миграции или подтвердите предложенное.

Пояснение:

| Команда | Что делает | Когда нужна |
|---------|------------|-------------|
| `pnpm db:generate` | Создаёт Prisma Client по схеме базы данных | После установки зависимостей и после изменения `schema.prisma` |
| `pnpm db:migrate` | Создаёт/обновляет таблицы PostgreSQL | При первом запуске и после новых миграций |

### Шаг 4. Запустить API и Web на хосте

```bash
pnpm dev
```

Что делает команда:

- запускает Turbo;
- поднимает dev-сервер Next.js;
- поднимает dev-сервер NestJS API;
- включает hot-reload, чтобы изменения из Cursor применялись без ручной пересборки Docker-образов.

### Шаг 5. Открыть в браузере

| Сервис           | URL |
|------------------|-----|
| Web              | http://localhost:3000 |
| API              | http://localhost:4000/api/v1 |
| Swagger          | http://localhost:4000/docs |
| MinIO Console    | http://localhost:9001 (логин/пароль из `.env`) |
| Meilisearch      | http://localhost:7700 |

---

## 6. Вариант B — всё в Docker (профиль apps)

Приложения **api** и **web** собираются и работают в контейнерах. Первый запуск может занять **10–20 минут** (скачивание образов + `pnpm install` внутри build).

Этот вариант ближе к реальному серверному запуску, но для Windows он тяжелее: Docker должен собирать образы `family_api` и `family_web`, а bind-mount проекта с диска `D:\` может работать медленнее, чем из файловой системы WSL.

Используйте его, если хотите проверить именно контейнерный запуск приложения целиком.

### Шаг 1. Сборка и запуск

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile apps up -d --build
```

Пояснение команды:

| Часть команды | Значение |
|---------------|----------|
| `docker compose` | Запуск Docker Compose |
| `-f docker-compose.yml` | Берём базовые сервисы: Postgres, Redis, MinIO, Meilisearch |
| `-f docker-compose.dev.yml` | Добавляем dev-настройки и сервисы `api`, `web`, `ai-service` |
| `--profile apps` | Включаем сервисы, которые по умолчанию не запускаются: `api`, `web`, `minio-init` |
| `up -d` | Запускаем в фоне |
| `--build` | Перед запуском пересобираем Docker-образы приложения |

Ожидаемый результат: в Docker Desktop должны появиться контейнеры `family_api` и `family_web`.

### Шаг 2. Миграции БД (один раз)

Пока контейнеры работают, выполните миграции **с хоста** (нужны Node и pnpm):

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
```

Либо зайдите в контейнер API:

```bash
docker exec -it family_api sh
# внутри контейнера (если настроен prisma):
# pnpm exec prisma migrate deploy
```

### Шаг 3. Проверка логов

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f api web
```

Что смотреть в логах:

- API должен стартовать без ошибки подключения к PostgreSQL;
- Web должен слушать порт `3000`;
- если есть ошибка `ECONNREFUSED postgres`, значит база ещё не готова или неверные переменные окружения;
- если есть ошибка сборки `pnpm`, проверьте наличие `pnpm-lock.yaml` и повторите сборку.

### Шаг 4. URL

Те же, что в [разделе 8](#8-проверка-и-url): порты проброшены на `localhost`.

---

## 7. Опциональные сервисы

### Neo4j (граф родства)

```bash
pnpm docker:graph
```

или:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile graph up -d
```

- Browser: http://localhost:7474  
- Bolt: `bolt://localhost:7687`  
- В `.env`: `NEO4J_ENABLED=true`, пароль как в `NEO4J_AUTH` (по умолчанию в compose: `neo4j/family_password`)

### AI-сервис (FastAPI)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile ai up -d --build
```

- http://localhost:8000  
- В `.env`: `AI_SERVICE_ENABLED=true`

---

## 8. Проверка и URL

### Список контейнеров проекта

```bash
docker ps --filter "name=family_"
```

Ожидаемые имена: `family_postgres`, `family_redis`, `family_minio`, `family_meilisearch` (+ при профиле apps: `family_api`, `family_web`).

### Healthcheck PostgreSQL

```bash
docker exec family_postgres pg_isready -U family_user -d family_platform
```

### Проверка API

```bash
curl http://localhost:4000/api/v1
```

В PowerShell без curl:

```powershell
Invoke-WebRequest -Uri http://localhost:4000/docs -UseBasicParsing
```

---

## 9. Остановка и очистка

### Остановить инфраструктуру (вариант A)

```bash
pnpm docker:infra:down
```

### Остановить всё с приложениями

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile apps down
```

### Удалить тома с данными БД (осторожно — потеря данных)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v
```

---

## 10. Типичные проблемы на Windows

### Docker Engine не запускается

- Перезапустите Docker Desktop.
- В PowerShell от администратора: `wsl --update`, затем перезагрузка ПК.
- Проверьте, что виртуализация включена в BIOS.

### `port is already allocated` (занят порт)

Найдите процесс:

```powershell
netstat -ano | findstr :5432
```

Остановите конфликтующий сервис или измените порт в `.env`, например `POSTGRES_PORT=5433`, и обновите `DATABASE_URL`.

Частые конфликты: локальный PostgreSQL на 5432, другой Redis на 6379.

### Медленная работа томов / hot-reload в WSL

- Клонируйте или держите проект **внутри файловой системы WSL**, например `~/projects/family-memory-platform`, а не на `D:\` — для варианта B с bind-mount это существенно ускоряет сборку.
- Либо используйте **вариант A** (инфра в Docker, код на хосте).

### Пробел в пути `FAMILY TREE`

Всегда заключайте путь в кавычки в bash и PowerShell (см. [4.1](#41-перейти-в-каталог-проекта)).

### `pnpm: command not found`

```bash
corepack enable
corepack prepare pnpm@9.15.0 --activate
```

### MinIO healthcheck «unhealthy»

Часто проходит после 30–60 секунд. Проверьте логи:

```bash
docker logs family_minio
```

Консоль MinIO: http://localhost:9001

### Ошибка Prisma / подключение к БД

- Убедитесь, что контейнер `family_postgres` в статусе **healthy**.
- В `.env` для варианта A: `POSTGRES_HOST=localhost`, пароль совпадает с `POSTGRES_PASSWORD` в compose.

### Сборка `family_api` / `family_web` падает

- Убедитесь, что есть файл `pnpm-lock.yaml` в корне.
- Повторите с чистой сборкой:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile apps build --no-cache
```

---

## 11. Шпаргалка команд

```bash
# Перейти в проект (WSL)
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"

# Env
cp .env.example .env

# --- Вариант A (рекомендуется) ---
pnpm docker:infra
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm dev

# --- Вариант B (всё в Docker) ---
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile apps up -d --build
pnpm install && pnpm db:generate && pnpm db:migrate

# Логи
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f

# Остановка
pnpm docker:infra:down
# или с apps:
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile apps down
```

---

## Связанные файлы в репозитории

| Файл | Назначение |
|------|------------|
| `docker-compose.yml` | Базовая инфраструктура |
| `docker-compose.dev.yml` | Dev overlay + профиль `apps` |
| `docker-compose.prod.yml` | Production (VPS), не для первого локального запуска |
| `.env.example` | Шаблон переменных окружения |
| `infra/docker/api.Dockerfile` | Образ API |
| `infra/docker/web.Dockerfile` | Образ Web |

Подробности архитектуры — в корневом [README.md](../README.md).

---

*Документ создан для Windows 11 + Docker Desktop 4.x + WSL2 (Ubuntu). При обновлении compose-файлов сверяйте порты и имена контейнеров с актуальными `docker-compose*.yml`.*
