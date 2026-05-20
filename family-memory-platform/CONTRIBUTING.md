# Contributing

Спасибо за интерес к Family Memory Platform. Проект находится в MVP-стадии, поэтому главный приоритет - сохранять архитектуру простой, модульной и готовой к self-hosted deploy.

## Базовый workflow

1. Создайте ветку от актуальной `main`.
2. Проверьте `.env.example` и не коммитьте реальные секреты.
3. Установите зависимости:

```bash
pnpm install
```

4. Запустите инфраструктуру:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

5. Подготовьте Prisma:

```bash
pnpm db:generate
pnpm db:migrate
```

6. Запустите приложения:

```bash
pnpm dev
```

## Качество перед PR

Минимальные команды:

```bash
npm run lint
npm run test
npm run build
```

Рекомендуемые команды:

```bash
pnpm lint
pnpm test
pnpm build
```

Если проверка падает из-за локального окружения Windows/WSL, сначала выполните инструкции из `docs/DOCKER_LOCAL_WINDOWS_AFTER_REBOOT.md`.

## Правила разработки

- `packages/genealogy-core` должен оставаться чистой бизнес-логикой без NestJS, Next.js, Prisma и HTTP.
- `apps/api` отвечает за REST API, Prisma, интеграции с MinIO, Meilisearch и optional AI.
- `apps/web` отвечает за UI и не должен обращаться напрямую к PostgreSQL/MinIO/Meilisearch.
- Файлы хранятся в MinIO, в PostgreSQL хранится metadata.
- AI-сервис optional: код должен корректно работать при `AI_SERVICE_ENABLED=false`.
- Не добавляйте внешние managed-сервисы как обязательную зависимость.

## Git

- Коммиты должны быть небольшими и описывать одну логическую задачу.
- Не коммитьте `.env`, дампы БД, MinIO uploads, логи и build artifacts.
- Перед PR проверьте `git status`.

## Документация

При изменении запуска, Docker, deploy или архитектурных решений обновляйте соответствующие файлы в `docs/`.
