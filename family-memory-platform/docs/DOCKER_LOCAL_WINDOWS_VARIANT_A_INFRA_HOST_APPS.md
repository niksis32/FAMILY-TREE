# Вариант A: инфраструктура в Docker, приложения на хосте Windows/WSL

Подробная инструкция для Windows 11 + Docker Desktop + WSL2/Ubuntu.

Этот вариант рекомендуется для ежедневной разработки проекта `family-memory-platform`: Docker запускает только инфраструктуру, а `web` и `api` запускаются локально через `pnpm dev`.

Исходный общий документ остаётся здесь: [`DOCKER_LOCAL_WINDOWS.md`](./DOCKER_LOCAL_WINDOWS.md).

---

## 1. Что именно запускается

В варианте A Docker запускает только сервисы, которые приложению нужны как внешняя инфраструктура.

| Сервис | Контейнер | Порт | За что отвечает |
|---|---|---:|---|
| PostgreSQL | `family_postgres` | `5432` | Основная база данных проекта |
| Redis | `family_redis` | `6379` | Кэш, очереди, быстрые временные данные |
| MinIO | `family_minio` | `9000`, `9001` | Локальное S3-хранилище для фото, видео, документов |
| Meilisearch | `family_meilisearch` | `7700` | Быстрый полнотекстовый поиск |

Приложения запускаются не в Docker:

| Приложение | Где запускается | Команда | URL |
|---|---|---|---|
| Web, Next.js | На хосте/WSL | `pnpm dev` | `http://localhost:3000` |
| API, NestJS | На хосте/WSL | `pnpm dev` | `http://localhost:4000` |

---

## 2. Как это работает

Схема варианта A:

```text
Browser
  |
  | http://localhost:3000
  v
Next.js Web
  |
  | http://localhost:4000/api/v1
  v
NestJS API
  |
  +--> PostgreSQL  localhost:5432  (Docker)
  +--> Redis       localhost:6379  (Docker)
  +--> MinIO       localhost:9000  (Docker)
  +--> Meilisearch localhost:7700  (Docker)
```

Ключевая идея:

- Docker Desktop держит базу данных, Redis, MinIO и Meilisearch.
- Код `apps/web` и `apps/api` запускается через Node.js и `pnpm`.
- Cursor видит код напрямую, поэтому удобно редактировать и сразу видеть изменения.
- При изменении кода не нужно пересобирать Docker-образ.

---

## 3. Когда выбирать вариант A

Выбирайте вариант A, если:

- вы разрабатываете проект в Cursor;
- хотите быстрый hot-reload;
- часто меняете frontend/backend код;
- хотите проще смотреть ошибки в терминале;
- не хотите ждать долгую пересборку Docker-образов после каждого изменения.

Это лучший локальный режим для текущей стадии проекта.

---

## 4. Что должно быть установлено

| Компонент | Зачем нужен | Проверка |
|---|---|---|
| Docker Desktop | Запускает контейнеры PostgreSQL, Redis, MinIO, Meilisearch | `docker --version` |
| WSL2 + Ubuntu | Удобная Linux-среда для команд проекта | `wsl -l -v` |
| Node.js 20+ | Запускает Next.js и NestJS на хосте | `node -v` |
| pnpm 9+ | Менеджер пакетов monorepo | `pnpm -v` |
| Git | Работа с репозиторием | `git --version` |

Важно для WSL: Node.js и pnpm должны быть установлены **внутри Ubuntu**, а не только в Windows. Если в Ubuntu команда `pnpm` ведёт на `/mnt/c/Program Files/nodejs/pnpm`, это Windows-версия pnpm, и она может падать с ошибкой `exec: node: not found`.

Проверка Docker:

```bash
docker --version
docker compose version
docker ps
```

Что должно получиться:

- команды выполняются без ошибки;
- `docker ps` показывает список контейнеров или пустой список;
- ошибки вида `Cannot connect to the Docker daemon` быть не должно.

---

## 5. Проверить и поставить Node.js/pnpm внутри Ubuntu

Перед запуском `pnpm docker:infra`, `pnpm install`, `pnpm db:migrate` и `pnpm dev` проверьте Node.js именно в Ubuntu:

```bash
which node
node -v
which pnpm
pnpm -v
```

Правильный вариант:

```text
/home/nik/.nvm/versions/node/v20.x.x/bin/node
v20.x.x
/home/nik/.nvm/versions/node/v20.x.x/bin/pnpm
9.x.x
```

Проблемный вариант:

```text
/mnt/c/Program Files/nodejs/pnpm
exec: node: not found
```

Это означает, что Ubuntu подхватила Windows-версию pnpm, но Linux-версии Node.js нет.

### Рекомендуемая установка через nvm

В Ubuntu выполните:

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
node -v
pnpm -v
which node
which pnpm
```

Что делает каждая команда:

| Команда | Что делает |
|---|---|
| `sudo apt update` | Обновляет список пакетов Ubuntu |
| `sudo apt install -y curl ca-certificates` | Ставит утилиты для скачивания nvm по HTTPS |
| `curl ... install.sh \| bash` | Устанавливает nvm — менеджер версий Node.js |
| `source ~/.bashrc` | Перечитывает настройки терминала, чтобы появилась команда `nvm` |
| `nvm install 20` | Ставит Node.js 20 LTS внутрь Ubuntu |
| `nvm use 20` | Делает Node.js 20 активной версией |
| `corepack enable` | Включает менеджер pnpm, встроенный в Node.js |
| `corepack prepare pnpm@9.15.0 --activate` | Активирует версию pnpm, которую ожидает проект |
| `hash -r` | Сбрасывает кэш путей команд в shell |
| `which node`, `which pnpm` | Проверяет, что используются Linux-версии из `/home/nik/.nvm/...` |

После этого ошибка `/mnt/c/Program Files/nodejs/pnpm: 11: exec: node: not found` должна исчезнуть.

---

## 6. Настройка Docker Desktop

Откройте Docker Desktop.

1. Перейдите в **Settings**.
2. Откройте **General**.
3. Включите **Use the WSL 2 based engine**.
4. Откройте **Resources → WSL Integration**.
5. Включите интеграцию для **Ubuntu**.
6. Нажмите **Apply & Restart**.

Зачем это нужно:

| Настройка | Что делает |
|---|---|
| WSL2 based engine | Docker запускает Linux-контейнеры через WSL2 |
| WSL Integration для Ubuntu | Команда `docker` работает внутри Ubuntu-терминала |
| Apply & Restart | Перезапускает Docker Engine с новыми настройками |

Проверка в Ubuntu:

```bash
docker ps
```

Если команда отработала, Docker готов.

---

## 7. Перейти в папку проекта

В Ubuntu/WSL:

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
```

Почему путь в кавычках:

- в имени папки `FAMILY TREE` есть пробел;
- без кавычек терминал воспримет это как два разных аргумента.

Проверка:

```bash
ls
```

В корне проекта должны быть:

```text
docker-compose.yml
docker-compose.dev.yml
package.json
pnpm-workspace.yaml
.env.example
apps
packages
infra
```

---

## 8. Создать локальный `.env`

Команда:

```bash
cp .env.example .env
```

Что делает команда:

- копирует шаблон `.env.example`;
- создаёт рабочий файл `.env`;
- именно `.env` будет читать Docker Compose и приложения.

Откройте `.env` и задайте локальные значения:

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=family_platform
POSTGRES_USER=family_user
POSTGRES_PASSWORD=local_postgres_password

DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://${REDIS_HOST}:${REDIS_PORT}

MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
MINIO_ROOT_USER=family_admin
MINIO_ROOT_PASSWORD=local_minio_password
MINIO_BUCKET_MEDIA=family-media
MINIO_BUCKET_DOCUMENTS=family-documents

MEILI_HOST=http://localhost:7700
MEILI_MASTER_KEY=local_meili_master_key_123

JWT_SECRET=local_jwt_secret_minimum_32_characters
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

Что за что отвечает:

| Переменная | Назначение |
|---|---|
| `POSTGRES_HOST=localhost` | API подключается к PostgreSQL через проброшенный Docker-порт |
| `POSTGRES_PORT=5432` | Локальный порт PostgreSQL |
| `POSTGRES_DB` | Имя базы данных |
| `POSTGRES_USER` | Пользователь базы данных |
| `POSTGRES_PASSWORD` | Пароль пользователя базы данных |
| `DATABASE_URL` | Полная строка подключения Prisma к PostgreSQL |
| `REDIS_URL` | Подключение к Redis |
| `MINIO_ENDPOINT=localhost` | API обращается к MinIO через локальный хост |
| `MINIO_ROOT_USER` | Логин администратора MinIO |
| `MINIO_ROOT_PASSWORD` | Пароль администратора MinIO |
| `MEILI_HOST` | Адрес Meilisearch |
| `MEILI_MASTER_KEY` | Ключ доступа к Meilisearch |
| `JWT_SECRET` | Секрет подписи токенов авторизации |
| `NEXT_PUBLIC_API_URL` | URL API для frontend |

Важно: для варианта A хосты должны быть `localhost`, потому что `api` запускается не внутри Docker, а на вашей машине/WSL.

---

## 9. Последовательность команд

Короткая последовательность:

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
cp .env.example .env
node -v
pnpm -v
pnpm docker:infra
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm dev
```

Дальше подробно по каждому шагу.

---

## 10. Шаг 1: запустить инфраструктуру

Команда:

```bash
pnpm docker:infra
```

Что она делает:

- запускает скрипт из `package.json`;
- внутри выполняется `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d`;
- Docker Compose читает базовую инфраструктуру из `docker-compose.yml`;
- Docker Compose добавляет dev-настройки из `docker-compose.dev.yml`;
- контейнеры запускаются в фоне.

Эквивалентная команда без `pnpm`:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

Если `pnpm docker:infra` падает из-за Node.js/pnpm, но Docker уже работает, можно временно запустить инфраструктуру напрямую этой командой `docker compose`. Но для следующих шагов (`pnpm install`, `pnpm db:generate`, `pnpm db:migrate`, `pnpm dev`) Node.js и pnpm в Ubuntu всё равно нужно исправить.

Что должно появиться в Docker Desktop:

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

Ожидаемый результат:

- контейнеры отображаются в списке;
- PostgreSQL, Redis и Meilisearch постепенно переходят в состояние `healthy`;
- MinIO может стартовать чуть дольше, это нормально.

---

## 11. Шаг 2: установить зависимости Node.js

Команда:

```bash
pnpm install
```

Что делает:

- читает `package.json`;
- читает `pnpm-workspace.yaml`;
- устанавливает зависимости для всех приложений и пакетов;
- подготавливает `apps/web`, `apps/api`, `packages/shared`, `packages/ui`, `packages/genealogy-core`.

Если `pnpm` не найден:

```bash
corepack enable
corepack prepare pnpm@9.15.0 --activate
pnpm -v
```

Зачем нужен `corepack`:

- Node.js поставляется с Corepack;
- Corepack умеет активировать нужную версию pnpm;
- проект ожидает `pnpm@9.15.0`, это указано в `package.json`.

---

## 12. Шаг 3: сгенерировать Prisma Client

Команда:

```bash
pnpm db:generate
```

Что делает:

- запускает Prisma Generate в приложении API;
- читает Prisma-схему;
- создаёт клиент для типизированной работы с PostgreSQL.

Зачем это нужно:

- NestJS API работает с базой через Prisma;
- без сгенерированного клиента API может падать при старте или при обращении к БД.

---

## 13. Шаг 4: применить миграции БД

Команда:

```bash
pnpm db:migrate
```

Что делает:

- подключается к PostgreSQL через `DATABASE_URL`;
- создаёт таблицы проекта;
- применяет миграции Prisma;
- записывает историю миграций в БД.

Что должно быть готово перед командой:

- контейнер `family_postgres` запущен;
- PostgreSQL доступен на `localhost:5432`;
- пароль в `.env` совпадает с паролем контейнера.

Проверка PostgreSQL:

```bash
docker exec family_postgres pg_isready -U family_user -d family_platform
```

Ожидаемый результат:

```text
family_platform:5432 - accepting connections
```

---

## 14. Шаг 5: запустить приложение

Команда:

```bash
pnpm dev
```

Что делает:

- запускает Turbo;
- Turbo запускает dev-команды в `apps/web` и `apps/api`;
- Next.js поднимает frontend;
- NestJS поднимает backend API;
- включается hot-reload.

Ожидаемый результат:

| Компонент | URL |
|---|---|
| Web | `http://localhost:3000` |
| API | `http://localhost:4000/api/v1` |
| Swagger | `http://localhost:4000/docs` |

Проверка в браузере:

```text
http://localhost:3000
http://localhost:4000/docs
```

---

## 15. Проверка инфраструктурных сервисов

### PostgreSQL

```bash
docker exec family_postgres pg_isready -U family_user -d family_platform
```

Назначение: проверить, что БД принимает подключения.

### Redis

```bash
docker exec family_redis redis-cli ping
```

Ожидаемый ответ:

```text
PONG
```

### MinIO

Откройте:

```text
http://localhost:9001
```

Логин и пароль берутся из `.env`:

```env
MINIO_ROOT_USER=family_admin
MINIO_ROOT_PASSWORD=local_minio_password
```

### Meilisearch

Откройте:

```text
http://localhost:7700/health
```

Ожидаемый ответ:

```json
{
  "status": "available"
}
```

---

## 16. Что делать после успешного запуска

Если открылись оба адреса:

```text
http://localhost:3000
http://localhost:4000/docs
```

значит локальный запуск варианта A выполнен успешно.

На этом этапе у вас должны работать:

| Что работает | Как проверять | Какой процесс держит |
|---|---|---|
| Frontend | Открыть в браузере `http://localhost:3000` | Вторая вкладка Ubuntu с `pnpm --filter @family/web dev` |
| Swagger/API | Открыть в браузере `http://localhost:4000/docs` | Первая вкладка Ubuntu с `node apps/api/dist/apps/api/src/main.js` |
| PostgreSQL | Проверять командой `docker exec family_postgres pg_isready -U family_user -d family_platform` | Docker-контейнер `family_postgres` |
| Redis | Проверять командой `docker exec family_redis redis-cli ping` | Docker-контейнер `family_redis` |
| MinIO | Открыть в браузере `http://localhost:9001/login` | Docker-контейнер `family_minio` |
| Meilisearch | Открыть в браузере `http://localhost:7700/` или `http://localhost:7700/health` | Docker-контейнер `family_meilisearch` |

Важно: PostgreSQL (`5432`) и Redis (`6379`) — это не HTTP-сайты. Их нельзя корректно открыть в браузере как `http://localhost:5432/` или `http://localhost:6379/`. Эти порты предназначены для подключения приложений и CLI-клиентов.

### С какого места продолжать в следующий раз

Если компьютер не перезагружался и контейнеры Docker ещё работают, продолжать нужно не с начала, а только с запуска API и Web.

Проверить контейнеры:

```bash
docker ps --filter "name=family_"
```

Если контейнеры `family_postgres`, `family_redis`, `family_minio`, `family_meilisearch` есть в списке, `pnpm docker:infra` повторять не нужно.

### Повторный запуск после закрытия терминалов

Откройте первую вкладку Ubuntu для API:

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
export DATABASE_URL="postgresql://family_user:change_me_postgres@localhost:5432/family_platform?schema=public"
pnpm --filter @family/shared build
pnpm --filter @family/genealogy-core build
pnpm --filter @family/api build
node apps/api/dist/apps/api/src/main.js
```

Если в `.env` вы поменяли пароль `POSTGRES_PASSWORD`, в `DATABASE_URL` используйте именно ваш пароль вместо `change_me_postgres`.

Ожидаемый результат:

```text
API listening on http://localhost:4000/api/v1
```

Откройте вторую вкладку Ubuntu для Web:

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
pnpm --filter @family/web dev
```

Ожидаемый результат:

```text
Local: http://localhost:3000
Ready
```

### Если менялась Prisma-схема

Если вы меняли файл `apps/api/prisma/schema.prisma`, перед запуском API выполните:

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
export DATABASE_URL="postgresql://family_user:change_me_postgres@localhost:5432/family_platform?schema=public"
pnpm db:generate
pnpm db:migrate
```

Если Prisma спросит имя миграции:

```text
Enter a name for the new migration:
```

Введите короткое имя, например:

```text
init
```

или по смыслу изменения:

```text
add_person_fields
```

### Что делать дальше в разработке

После успешного запуска можно переходить к работе с модулями проекта:

| Задача | Куда смотреть |
|---|---|
| Проверить API | `http://localhost:4000/docs` |
| Смотреть frontend | `http://localhost:3000` |
| Менять страницы UI | `apps/web` |
| Менять backend-модули | `apps/api/src/modules` |
| Менять Prisma-схему | `apps/api/prisma/schema.prisma` |
| Смотреть общие типы | `packages/shared` |
| Смотреть логи API | Первая вкладка Ubuntu |
| Смотреть логи Web | Вторая вкладка Ubuntu |

Важно: в текущей конфигурации monorepo команда `pnpm dev` может падать на API из-за пути `dist/main`. Поэтому для этого проекта используйте рабочий режим из двух вкладок: отдельно API через `node apps/api/dist/apps/api/src/main.js`, отдельно Web через `pnpm --filter @family/web dev`.

---

## 17. Как остановить вариант A

Остановить инфраструктуру:

```bash
pnpm docker:infra:down
```

Что делает:

- останавливает контейнеры;
- удаляет контейнеры;
- не удаляет Docker volumes с данными.

Эквивалент:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

Остановить `pnpm dev`:

```text
Ctrl + C
```

Удалить данные БД и хранилищ:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v
```

Важно: `down -v` удаляет volumes, то есть локальные данные PostgreSQL, Redis, MinIO и Meilisearch.

---

## 18. Частые ошибки

### `pnpm: command not found`

Решение:

```bash
corepack enable
corepack prepare pnpm@9.15.0 --activate
```

### `/mnt/c/Program Files/nodejs/pnpm: 11: exec: node: not found`

Причина: Ubuntu запускает Windows-версию `pnpm`, но Linux-версия `node` не установлена или не найдена в `PATH`.

Проверка:

```bash
which pnpm
which node
node -v
pnpm -v
```

Если `which pnpm` показывает `/mnt/c/Program Files/nodejs/pnpm`, установите Node.js и pnpm внутри Ubuntu через nvm:

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

После установки проверьте:

```bash
which node
node -v
which pnpm
pnpm -v
```

Ожидаемо: пути должны начинаться с `/home/nik/.nvm/versions/node/...`, а не с `/mnt/c/Program Files/...`.

### PostgreSQL не подключается

Проверить контейнер:

```bash
docker ps --filter "name=family_postgres"
docker logs family_postgres
```

Проверить `.env`:

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=family_user
POSTGRES_PASSWORD=local_postgres_password
```

### Prisma: `Environment variable not found: DATABASE_URL`

Причина: Prisma CLI запускается из `apps/api` и может не увидеть корневой `.env`.

Решение перед миграциями:

```bash
export DATABASE_URL="postgresql://family_user:change_me_postgres@localhost:5432/family_platform?schema=public"
pnpm db:migrate
```

Если пароль в `.env` другой, используйте свой пароль.

### Prisma: `invalid port number in database URL`

Причина: строка `DATABASE_URL` содержит шаблонные переменные, например:

```env
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public
```

Prisma может получить эту строку без раскрытия переменных и увидеть порт как `${POSTGRES_PORT}`.

Решение: в `.env` укажите явную строку:

```env
DATABASE_URL=postgresql://family_user:change_me_postgres@localhost:5432/family_platform?schema=public
```

Если пароль другой, замените `change_me_postgres` на ваш пароль.

### Порт 5432 занят

В PowerShell:

```powershell
netstat -ano | findstr :5432
```

Решения:

- остановить локальный PostgreSQL;
- или поменять порт в `.env`, например `POSTGRES_PORT=5433`;
- после смены порта обновить `DATABASE_URL`.

### Docker не виден из Ubuntu

Проверьте Docker Desktop:

- Settings → Resources → WSL Integration;
- включить Ubuntu;
- Apply & Restart.

---

## 19. Итоговая команда для повторного запуска

Когда `.env` уже создан, зависимости установлены, миграции применены и контейнеры Docker работают, используйте две вкладки Ubuntu.

Вкладка 1 — API:

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
export DATABASE_URL="postgresql://family_user:change_me_postgres@localhost:5432/family_platform?schema=public"
pnpm --filter @family/shared build
pnpm --filter @family/genealogy-core build
pnpm --filter @family/api build
node apps/api/dist/apps/api/src/main.js
```

Вкладка 2 — Web:

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
pnpm --filter @family/web dev
```

Если менялась Prisma-схема:

```bash
pnpm db:generate
pnpm db:migrate
```

---

## 20. Краткий вывод

Вариант A — основной локальный режим разработки:

- Docker отвечает за инфраструктуру;
- Node.js/pnpm отвечает за запуск приложения;
- Cursor удобно редактирует код;
- hot-reload работает быстрее;
- не нужно пересобирать Docker-образы при каждом изменении.
