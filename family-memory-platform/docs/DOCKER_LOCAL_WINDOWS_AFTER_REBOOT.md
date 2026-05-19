# Запуск проекта после перезагрузки компьютера

Инструкция для Windows 11 + Docker Desktop + Ubuntu/WSL после перезагрузки ПК.

Сценарий: проект уже был один раз успешно запущен по варианту A:

- инфраструктура работает в Docker;
- API запускается в Ubuntu вручную;
- Web запускается во второй вкладке Ubuntu;
- миграция `init` уже создана и применена.

Связанные документы:

- [`DOCKER_LOCAL_WINDOWS_VARIANT_A_INFRA_HOST_APPS.md`](./DOCKER_LOCAL_WINDOWS_VARIANT_A_INFRA_HOST_APPS.md)
- [`DOCKER_LOCAL_WINDOWS_SESSION_RUNBOOK.md`](./DOCKER_LOCAL_WINDOWS_SESSION_RUNBOOK.md)

---

## 1. Что должно быть запущено после перезагрузки

После перезагрузки компьютера нужно поднять 3 группы процессов.

| Группа | Где запускается | Что должно работать |
|---|---|---|
| Docker Desktop | Windows | Docker Engine |
| Инфраструктура | Docker containers | PostgreSQL, Redis, MinIO, Meilisearch |
| Приложения | Ubuntu/WSL | API NestJS и Web Next.js |

Итоговые адреса:

| Что | Адрес |
|---|---|
| Web | `http://localhost:3000` |
| Swagger/API | `http://localhost:4000/docs` |
| Health API | `http://localhost:4000/api/v1/health` |
| MinIO Console | `http://localhost:9001/login` |
| Meilisearch | `http://localhost:7700/` |
| Meilisearch health | `http://localhost:7700/health` |

Важно:

- PostgreSQL `5432` не открывается в браузере.
- Redis `6379` не открывается в браузере.
- API prefix — `/api/v1`, не `/api/v`.

---

## 2. Общая последовательность после перезагрузки

Короткая схема:

```text
1. Запустить Docker Desktop.
2. Открыть Ubuntu.
3. Проверить Docker.
4. Перейти в папку проекта.
5. Проверить или запустить контейнеры инфраструктуры.
6. Проверить PostgreSQL и Redis.
7. Запустить API в первой вкладке Ubuntu.
8. Запустить Web во второй вкладке Ubuntu.
9. Проверить браузерные адреса.
```

---

## 3. Шаг 1: запустить Docker Desktop

Откройте Docker Desktop в Windows.

Дождитесь, пока Docker покажет, что Engine запущен.

Обычно это состояние:

```text
Engine running
```

Зачем:

- без Docker Engine не поднимутся PostgreSQL, Redis, MinIO и Meilisearch;
- команды `docker ps` и `docker compose` будут падать.

---

## 4. Шаг 2: открыть Ubuntu/WSL

Откройте Windows Terminal и выберите вкладку Ubuntu.

Проверьте, что Docker виден из Ubuntu:

```bash
docker ps
```

Ожидаемый результат:

- команда не падает;
- показывает таблицу контейнеров;
- если контейнеров пока нет, это нормально.

Если ошибка:

```text
Cannot connect to the Docker daemon
```

значит Docker Desktop ещё не запущен или не включена WSL Integration.

---

## 5. Шаг 3: перейти в папку проекта

Команда:

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
```

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
docs
```

Если этих файлов нет, вы не в корне проекта.

---

## 6. Шаг 4: проверить контейнеры инфраструктуры

Команда:

```bash
docker ps --filter "name=family_"
```

Возможны два варианта.

### Вариант 1: контейнеры уже работают

Ожидаемый пример:

```text
family_postgres
family_redis
family_minio
family_meilisearch
```

Если они есть и в статусе `Up`, повторно запускать `pnpm docker:infra` не нужно.

### Вариант 2: контейнеров нет

Запустите инфраструктуру:

```bash
pnpm docker:infra
```

Эквивалентная команда:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

Ожидаемый результат:

```text
Container family_postgres Started
Container family_redis Started
Container family_minio Started
Container family_meilisearch Started
```

После запуска снова проверьте:

```bash
docker ps --filter "name=family_"
```

---

## 7. Шаг 5: проверить PostgreSQL

Команда:

```bash
docker exec family_postgres pg_isready -U family_user -d family_platform
```

Ожидаемый результат:

```text
/var/run/postgresql:5432 - accepting connections
```

Что это значит:

- контейнер PostgreSQL работает;
- база `family_platform` доступна;
- можно запускать API и Prisma.

Если ошибка:

```text
container not found
```

значит инфраструктура не запущена. Вернитесь к шагу 4.

---

## 8. Шаг 6: проверить Redis

Команда:

```bash
docker exec family_redis redis-cli ping
```

Ожидаемый результат:

```text
PONG
```

Что это значит:

- Redis работает;
- API сможет использовать Redis для кэша/очередей, когда эти модули будут включены.

---

## 9. Шаг 7: проверить MinIO и Meilisearch

### MinIO

Откройте в браузере:

```text
http://localhost:9001/login
```

Логин и пароль берутся из `.env`:

```env
MINIO_ROOT_USER=family_admin
MINIO_ROOT_PASSWORD=change_me_minio
```

Если вы меняли пароль, используйте актуальный.

### Meilisearch

Откройте:

```text
http://localhost:7700/
```

или:

```text
http://localhost:7700/health
```

Если в `docker ps` Meilisearch показывает `unhealthy`, но `/health` отвечает, для текущего локального MVP это не блокирует запуск.

---

## 10. Шаг 8: запустить API

Откройте первую вкладку Ubuntu.

Перейдите в проект:

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
```

Задайте `DATABASE_URL` для текущей вкладки:

```bash
export DATABASE_URL="postgresql://family_user:change_me_postgres@localhost:5432/family_platform?schema=public"
```

Если в `.env` у вас другой пароль PostgreSQL, замените `change_me_postgres` на свой пароль.

Соберите зависимости API:

```bash
pnpm --filter @family/shared build
pnpm --filter @family/genealogy-core build
pnpm --filter @family/api build
```

Запустите API:

```bash
node apps/api/dist/apps/api/src/main.js
```

Ожидаемый результат:

```text
Nest application successfully started
```

или:

```text
API listening on http://localhost:4000/api/v1
```

Эту вкладку Ubuntu нужно оставить открытой.

---

## 11. Шаг 9: запустить Web

Откройте вторую вкладку Ubuntu.

Перейдите в проект:

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
```

Запустите Web:

```bash
pnpm --filter @family/web dev
```

Ожидаемый результат:

```text
Local: http://localhost:3000
Ready
```

Эту вкладку Ubuntu тоже нужно оставить открытой.

---

## 12. Шаг 10: проверить браузер

Откройте:

```text
http://localhost:3000
```

Ожидаемый результат:

- открывается главная страница Family Memory Platform;
- видны блоки вроде `Люди`, `Древо`, `Архив`.

Откройте:

```text
http://localhost:4000/docs
```

Ожидаемый результат:

- открывается Swagger;
- видны API-разделы;
- путь `/api/v1/health` доступен.

Проверка health:

```text
http://localhost:4000/api/v1/health
```

---

## 13. Если порт уже занят

### API: `EADDRINUSE :::4000`

Ошибка:

```text
Error: listen EADDRINUSE: address already in use :::4000
```

Значит API уже запущен.

Проверьте:

```text
http://localhost:4000/docs
```

Если Swagger открывается, всё нормально. Второй API запускать не нужно.

Найти процесс:

```bash
ss -ltnp | grep ':4000'
```

### Web: `EADDRINUSE :::3000`

Ошибка:

```text
Error: listen EADDRINUSE: address already in use :::3000
```

Значит Web уже запущен.

Проверьте:

```text
http://localhost:3000
```

Если сайт открывается, всё нормально. Второй Web запускать не нужно.

Найти процесс:

```bash
ss -ltnp | grep ':3000'
```

---

## 14. Если нужно полностью перезапустить локальный запуск

### Остановить API и Web

Вкладки Ubuntu, где запущены API и Web:

```text
Ctrl + C
```

### Остановить Docker-инфраструктуру без удаления данных

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
pnpm docker:infra:down
```

Эквивалент:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

### Запустить заново

```bash
pnpm docker:infra
```

Потом снова запустить API и Web по шагам 8 и 9.

---

## 15. Если нужно удалить все локальные данные

Осторожно: команда удалит volumes PostgreSQL, Redis, MinIO и Meilisearch.

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v
```

После этого:

1. заново запустить инфраструктуру;
2. заново применить миграции;
3. заново запустить API и Web.

Команды:

```bash
pnpm docker:infra
export DATABASE_URL="postgresql://family_user:change_me_postgres@localhost:5432/family_platform?schema=public"
pnpm db:generate
pnpm db:migrate
```

Если Prisma спросит имя миграции, для новой миграции вводите осмысленное имя. Если миграция `init` уже есть в проекте, Prisma может просто применить существующие миграции.

---

## 16. Когда нужно запускать миграции после перезагрузки

Обычно после обычной перезагрузки миграции **не нужны**.

Миграции нужны только если:

- менялся файл `apps/api/prisma/schema.prisma`;
- была удалена база через `down -v`;
- проект перенесли на новую машину;
- подняли новую пустую БД.

Команды для миграций:

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
export DATABASE_URL="postgresql://family_user:change_me_postgres@localhost:5432/family_platform?schema=public"
pnpm db:generate
pnpm db:migrate
```

---

## 17. Минимальная команда после обычной перезагрузки

Если Docker Desktop запущен и контейнеры живы, нужно только API + Web.

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

---

## 18. Полная команда после перезагрузки, если контейнеры не запущены

Вкладка 1:

```bash
cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"
pnpm docker:infra
docker exec family_postgres pg_isready -U family_user -d family_platform
docker exec family_redis redis-cli ping
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

---

## 19. Что должно остаться открытым

После успешного запуска:

| Окно/вкладка | Должно быть открыто? | Почему |
|---|---|---|
| Docker Desktop | Да | Показывает контейнеры и состояние Docker Engine |
| Ubuntu вкладка API | Да | Там работает API NestJS |
| Ubuntu вкладка Web | Да | Там работает Next.js dev server |
| Browser `localhost:3000` | По необходимости | Проверка frontend |
| Browser `localhost:4000/docs` | По необходимости | Проверка API |

Если закрыть вкладку API, API остановится.

Если закрыть вкладку Web, Web остановится.

Docker-контейнеры продолжат работать, пока их явно не остановить.

---

## 20. Быстрый чеклист

- [ ] Docker Desktop запущен.
- [ ] Ubuntu открыта.
- [ ] Проект открыт через `cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"`.
- [ ] `docker ps --filter "name=family_"` показывает инфраструктуру.
- [ ] PostgreSQL отвечает `accepting connections`.
- [ ] Redis отвечает `PONG`.
- [ ] API запущен в первой вкладке.
- [ ] Web запущен во второй вкладке.
- [ ] `http://localhost:3000` открывается.
- [ ] `http://localhost:4000/docs` открывается.

---

## 21. Важное замечание про текущую конфигурацию

Пока API запускается не стандартной командой `pnpm dev`, а через:

```bash
node apps/api/dist/apps/api/src/main.js
```

Причина:

- текущая сборка monorepo кладёт API entrypoint в `apps/api/dist/apps/api/src/main.js`;
- стандартный Nest запуск ожидает `apps/api/dist/main.js`.

В будущем лучше исправить конфигурацию сборки API, чтобы работала одна простая команда:

```bash
pnpm dev
```

Но для текущего локального запуска после перезагрузки используйте рабочую схему из двух вкладок.
