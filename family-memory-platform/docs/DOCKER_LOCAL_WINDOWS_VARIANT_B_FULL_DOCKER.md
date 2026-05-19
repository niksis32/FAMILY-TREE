# Вариант B: полный запуск проекта в Docker

Подробная инструкция для Windows 11 + Docker Desktop + WSL2/Ubuntu.

Этот вариант запускает в Docker не только инфраструктуру, но и приложения `api` и `web`. Он ближе к серверному запуску, но для локальной разработки на Windows может быть медленнее, чем вариант A.

Исходный общий документ остаётся здесь: [`DOCKER_LOCAL_WINDOWS.md`](./DOCKER_LOCAL_WINDOWS.md).

---

## 1. Что именно запускается

В варианте B Docker запускает полный набор сервисов проекта.

| Сервис | Контейнер | Порт | За что отвечает |
|---|---|---:|---|
| PostgreSQL | `family_postgres` | `5432` | Основная база данных проекта |
| Redis | `family_redis` | `6379` | Кэш, очереди, быстрые временные данные |
| MinIO | `family_minio` | `9000`, `9001` | Локальное S3-хранилище для фото, видео, документов |
| Meilisearch | `family_meilisearch` | `7700` | Полнотекстовый поиск |
| MinIO init | `family_minio_init` | нет | Создаёт bucket'ы MinIO |
| API | `family_api` | `4000` | Backend NestJS |
| Web | `family_web` | `3000` | Frontend Next.js |

Опционально:

| Сервис | Профиль | Порты | За что отвечает |
|---|---|---:|---|
| Neo4j | `graph` | `7474`, `7687` | Графовая база для связей родства |
| AI service | `ai` | `8000` | Python/FastAPI сервис для будущих AI-функций |

---

## 2. Как это работает

Схема варианта B:

```text
Browser
  |
  | http://localhost:3000
  v
family_web container
  |
  | внутри Docker-сети
  v
family_api container
  |
  +--> family_postgres
  +--> family_redis
  +--> family_minio
  +--> family_meilisearch
```

Ключевая идея:

- `web` и `api` работают внутри контейнеров;
- контейнеры общаются друг с другом по внутренним DNS-именам Docker: `postgres`, `redis`, `minio`, `meilisearch`;
- наружу на Windows пробрасываются только нужные порты: `3000`, `4000`, `5432`, `6379`, `9000`, `9001`, `7700`;
- код монтируется внутрь контейнеров через volumes из `docker-compose.dev.yml`.

---

## 3. Когда выбирать вариант B

Выбирайте вариант B, если:

- хотите проверить, что проект запускается полностью в Docker;
- готовите окружение ближе к VPS/server deploy;
- хотите не запускать `pnpm dev` на хосте;
- проверяете Dockerfile'ы `api` и `web`;
- хотите увидеть поведение контейнеров до production-сборки.

Для постоянной разработки в Cursor вариант A обычно удобнее и быстрее.

---

## 4. Важное отличие от варианта A

| Вопрос | Вариант A | Вариант B |
|---|---|---|
| Где работает PostgreSQL | Docker | Docker |
| Где работает Redis | Docker | Docker |
| Где работает MinIO | Docker | Docker |
| Где работает Meilisearch | Docker | Docker |
| Где работает API | Хост/WSL через `pnpm dev` | Docker-контейнер `family_api` |
| Где работает Web | Хост/WSL через `pnpm dev` | Docker-контейнер `family_web` |
| Нужно ли пересобирать образы после изменения Dockerfile | Нет | Да |
| Hot-reload | Быстрее | Может быть медленнее на Windows |
| Похоже на серверный запуск | Частично | Сильнее похоже |

---

## 5. Что должно быть установлено

| Компонент | Зачем нужен | Проверка |
|---|---|---|
| Docker Desktop | Запускает все контейнеры проекта | `docker --version` |
| WSL2 + Ubuntu | Удобная Linux-среда для команд Docker | `wsl -l -v` |
| Git | Работа с репозиторием | `git --version` |
| Node.js 20+ | Желателен для миграций Prisma с хоста | `node -v` |
| pnpm 9+ | Желателен для миграций Prisma с хоста | `pnpm -v` |

Почему Node.js и pnpm всё равно полезны:

- контейнеры `api` и `web` Docker соберёт сам;
- но миграции БД удобнее и надёжнее запускать с хоста командой `pnpm db:migrate`;
- если не хотите ставить Node.js на Windows/WSL, миграции можно запускать внутри контейнера API, но это менее удобно.

---

## 6. Настройка Docker Desktop

Откройте Docker Desktop.

1. Перейдите в **Settings**.
2. Откройте **General**.
3. Включите **Use the WSL 2 based engine**.
4. Откройте **Resources → WSL Integration**.
5. Включите интеграцию для **Ubuntu**.
6. Нажмите **Apply & Restart**.

Проверка в Ubuntu:

```bash
docker ps
docker compose version
```

Если ошибок нет, Docker готов.

---

## 7. Перейти в папку проекта

В Ubuntu/WSL:

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
```

Проверка:

```bash
ls
```

В папке должны быть:

```text
docker-compose.yml
docker-compose.dev.yml
package.json
pnpm-lock.yaml
apps
packages
infra
```

Важно: путь содержит пробел `FAMILY TREE`, поэтому он должен быть в кавычках.

---

## 8. Создать локальный `.env`

Команда:

```bash
cp .env.example .env
```

Откройте `.env` и задайте локальные значения:

```env
POSTGRES_DB=family_platform
POSTGRES_USER=family_user
POSTGRES_PASSWORD=local_postgres_password

MINIO_ROOT_USER=family_admin
MINIO_ROOT_PASSWORD=local_minio_password
MINIO_BUCKET_MEDIA=family-media
MINIO_BUCKET_DOCUMENTS=family-documents

MEILI_MASTER_KEY=local_meili_master_key_123

JWT_SECRET=local_jwt_secret_minimum_32_characters
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

Особенность варианта B:

В `docker-compose.dev.yml` для контейнера API часть переменных переопределяется:

```yaml
DATABASE_URL: postgresql://${POSTGRES_USER:-family_user}:${POSTGRES_PASSWORD:-family_password}@postgres:5432/${POSTGRES_DB:-family_platform}?schema=public
REDIS_URL: redis://redis:6379
MEILI_HOST: http://meilisearch:7700
MINIO_ENDPOINT: minio
MINIO_PORT: 9000
```

Что это значит:

| Значение | Где используется | Почему так |
|---|---|---|
| `postgres` | Внутри контейнера API | Это имя сервиса PostgreSQL в Docker-сети |
| `redis` | Внутри контейнера API | Это имя сервиса Redis в Docker-сети |
| `minio` | Внутри контейнера API | Это имя сервиса MinIO в Docker-сети |
| `meilisearch` | Внутри контейнера API | Это имя сервиса Meilisearch в Docker-сети |
| `localhost` | В браузере Windows | Браузер обращается к проброшенным портам Docker |

Важно: внутри Docker нельзя использовать `localhost` для подключения API к PostgreSQL, потому что `localhost` внутри контейнера означает сам контейнер API, а не контейнер базы данных.

---

## 9. Последовательность команд

Короткая последовательность:

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile apps up -d --build
pnpm install
pnpm db:generate
pnpm db:migrate
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f api web
```

Дальше подробно по каждому шагу.

---

## 10. Шаг 1: собрать и запустить контейнеры

Команда:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile apps up -d --build
```

Разбор команды:

| Часть команды | Что делает |
|---|---|
| `docker compose` | Запускает Docker Compose |
| `-f docker-compose.yml` | Берёт базовую инфраструктуру проекта |
| `-f docker-compose.dev.yml` | Добавляет dev-настройки и сервисы приложений |
| `--profile apps` | Включает сервисы `api`, `web`, `minio-init` |
| `up` | Создаёт и запускает сервисы |
| `-d` | Запускает контейнеры в фоне |
| `--build` | Пересобирает Docker-образы перед запуском |

Что происходит внутри:

1. Docker скачивает базовые образы:
   - `postgres:16-alpine`;
   - `redis:7-alpine`;
   - `minio/minio`;
   - `getmeili/meilisearch`;
   - `node:20-alpine`.
2. Docker собирает образ API из `infra/docker/api.Dockerfile`.
3. Docker собирает образ Web из `infra/docker/web.Dockerfile`.
4. Docker создаёт сеть проекта.
5. Docker запускает инфраструктуру.
6. После готовности зависимостей запускает `family_api`.
7. После API запускает `family_web`.

Ожидаемый результат:

```text
family_postgres
family_redis
family_minio
family_meilisearch
family_minio_init
family_api
family_web
```

Проверка:

```bash
docker ps --filter "name=family_"
```

---

## 11. Шаг 2: проверить логи запуска

Команда:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f
```

Если нужно смотреть только приложения:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f api web
```

Что смотреть:

| Лог | Что должно быть |
|---|---|
| `postgres` | База принимает подключения |
| `redis` | Redis готов принимать команды |
| `meilisearch` | Сервис слушает порт `7700` |
| `minio` | Консоль доступна на `9001` |
| `api` | NestJS стартовал на `4000` |
| `web` | Next.js стартовал на `3000` |

Остановить просмотр логов:

```text
Ctrl + C
```

Контейнеры при этом не остановятся, остановится только просмотр логов.

---

## 12. Шаг 3: применить миграции БД

Рекомендуемый способ — с хоста/WSL:

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
```

Что делает каждая команда:

| Команда | Назначение |
|---|---|
| `pnpm install` | Устанавливает зависимости проекта на хосте |
| `pnpm db:generate` | Генерирует Prisma Client |
| `pnpm db:migrate` | Создаёт/обновляет таблицы в PostgreSQL |

Почему миграции лучше запускать после старта контейнеров:

- PostgreSQL уже работает;
- `DATABASE_URL` из `.env` указывает на `localhost:5432`;
- порт `5432` проброшен из контейнера PostgreSQL на Windows/WSL.

Проверка PostgreSQL:

```bash
docker exec family_postgres pg_isready -U family_user -d family_platform
```

Ожидаемый результат:

```text
family_platform:5432 - accepting connections
```

Альтернативный способ — зайти в контейнер API:

```bash
docker exec -it family_api sh
```

Внутри контейнера можно выполнять команды проекта, если все зависимости и рабочая директория доступны в образе. На практике для dev-режима проще и прозрачнее использовать миграции с хоста.

---

## 13. Шаг 4: открыть проект в браузере

| Сервис | URL | Что проверяем |
|---|---|---|
| Web | `http://localhost:3000` | Открывается frontend |
| API | `http://localhost:4000/api/v1` | API отвечает |
| Swagger | `http://localhost:4000/docs` | Документация API открывается |
| MinIO Console | `http://localhost:9001` | Вход по `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` |
| Meilisearch Health | `http://localhost:7700/health` | Поиск доступен |

Проверка API из терминала:

```bash
curl http://localhost:4000/docs
```

В PowerShell:

```powershell
Invoke-WebRequest -Uri http://localhost:4000/docs -UseBasicParsing
```

---

## 14. Как работает `minio-init`

В `docker-compose.dev.yml` есть сервис `minio-init`.

Он делает следующее:

1. ждёт несколько секунд после старта MinIO;
2. подключается к MinIO по адресу `http://minio:9000`;
3. создаёт bucket для медиа;
4. создаёт bucket для документов;
5. завершает работу.

Переменные:

| Переменная | Назначение |
|---|---|
| `MINIO_BUCKET_MEDIA` | Bucket для фото, видео и других медиа |
| `MINIO_BUCKET_DOCUMENTS` | Bucket для документов |
| `MINIO_ROOT_USER` | Администратор MinIO |
| `MINIO_ROOT_PASSWORD` | Пароль администратора MinIO |

Если контейнер `family_minio_init` завершился — это нормально. Это одноразовая инициализация, а не постоянный сервис.

---

## 15. Пересборка после изменений

Если изменили только код `apps/web` или `apps/api`, dev-volume может подхватить изменения автоматически.

Если изменили:

- `Dockerfile`;
- `package.json`;
- `pnpm-lock.yaml`;
- системные зависимости;
- build-команды;

пересоберите контейнеры:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile apps up -d --build
```

Если сборка ведёт себя странно, выполните чистую пересборку:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile apps build --no-cache
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile apps up -d
```

---

## 16. Остановка варианта B

Остановить контейнеры:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile apps down
```

Что делает:

- останавливает контейнеры;
- удаляет контейнеры;
- сохраняет volumes с данными.

Удалить контейнеры и данные:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile apps down -v
```

Важно: `down -v` удалит данные PostgreSQL, Redis, MinIO, Meilisearch и Neo4j, если они были в volumes.

---

## 17. Опционально: Neo4j

Запуск графовой БД:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile graph up -d
```

Если нужен вместе с приложениями:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile apps --profile graph up -d --build
```

URL:

```text
http://localhost:7474
bolt://localhost:7687
```

За что отвечает Neo4j:

- хранение и быстрый обход семейных связей;
- анализ родственных цепочек;
- будущая graph analytics;
- возможная AI-проверка связей и аномалий.

---

## 18. Опционально: AI service

Запуск AI-сервиса:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile ai up -d --build
```

Если нужен вместе со всем проектом:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile apps --profile ai up -d --build
```

URL:

```text
http://localhost:8000
```

За что отвечает AI-сервис:

- будущий OCR документов;
- AI-подсказки по связям;
- обработка архивов;
- анализ текстов, фото и документов.

---

## 19. Частые ошибки

### Долго собирается первый раз

Это нормально.

При первом запуске Docker:

- скачивает базовые образы;
- устанавливает зависимости;
- собирает API;
- собирает Web.

На Windows первый запуск может занять 10–20 минут.

### Порт занят

Пример для PostgreSQL:

```powershell
netstat -ano | findstr :5432
```

Решения:

- остановить локальный PostgreSQL;
- изменить `POSTGRES_PORT` в `.env`;
- перезапустить compose.

### API не видит PostgreSQL

Проверьте логи:

```bash
docker logs family_api
docker logs family_postgres
```

Внутри контейнера API должен использоваться хост `postgres`, не `localhost`.

Правильно для Docker-сети:

```text
postgres:5432
redis:6379
minio:9000
meilisearch:7700
```

Неправильно внутри контейнера:

```text
localhost:5432
localhost:6379
localhost:9000
localhost:7700
```

### Web не открывается

Проверить контейнер:

```bash
docker ps --filter "name=family_web"
docker logs family_web
```

Проверить порт:

```bash
docker port family_web
```

### Очень медленный hot-reload

Причина:

- проект лежит на диске Windows `D:\`;
- Docker использует bind-mount в Linux-контейнер;
- синхронизация файлов Windows ↔ WSL может быть медленной.

Решения:

- для разработки использовать вариант A;
- или перенести проект внутрь файловой системы WSL, например:

```bash
mkdir -p ~/projects
cd ~/projects
git clone <repo-url> family-memory-platform
```

---

## 20. Итоговая команда для повторного запуска

Если `.env` уже создан:

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile apps up -d --build
```

Смотреть логи:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f api web
```

Остановить:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile apps down
```

---

## 21. Краткий вывод

Вариант B — полный локальный Docker-запуск:

- всё приложение работает в контейнерах;
- окружение ближе к серверному;
- удобно проверять Dockerfile'ы и compose-конфигурацию;
- на Windows может быть медленнее варианта A;
- для активной разработки в Cursor вариант A обычно комфортнее.
