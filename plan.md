отовый пакет для Cursor: структура проекта, Docker-архитектура, объяснение сервисов и промты. Основа соответствует вашему ТЗ по open-source genealogy platform: дерево, графы, медиа, AI, self-hosted, расширяемость .

1. Главная стратегия MVP

Делаем не “одноразовый сайт”, а MVP с нормальной архитектурой:

Локальная разработка в Cursor
        ↓
GitHub repository
        ↓
Docker Compose
        ↓
Перенос на удаленный VPS
        ↓
Дальше масштабирование: AI, Neo4j, OCR, карты, SaaS

На MVP не нужно сразу перегружать проект Kubernetes и микросервисами. Лучше сделать модульный монолит + отдельные инфраструктурные сервисы.

2. Стек MVP
Frontend: Next.js + React + TypeScript + TailwindCSS
Backend: NestJS + TypeScript
DB: PostgreSQL
ORM: Prisma
Media Storage: MinIO
Cache/Queue: Redis
Search: Meilisearch
Graph Future Layer: Neo4j, но подключить как optional service
AI Future Layer: Python FastAPI, optional service
Reverse Proxy: Traefik или Nginx
Deploy: Docker Compose
Repository: GitHub
3. Структура проекта
family-memory-platform/
│
├── apps/
│   ├── web/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   │   ├── persons/
│   │   │   ├── families/
│   │   │   ├── tree/
│   │   │   ├── media/
│   │   │   ├── documents/
│   │   │   ├── timeline/
│   │   │   └── search/
│   │   ├── lib/
│   │   ├── public/
│   │   └── package.json
│   │
│   ├── api/
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── users/
│   │   │   │   ├── persons/
│   │   │   │   ├── families/
│   │   │   │   ├── relationships/
│   │   │   │   ├── events/
│   │   │   │   ├── media/
│   │   │   │   ├── documents/
│   │   │   │   ├── timeline/
│   │   │   │   ├── search/
│   │   │   │   ├── gedcom/
│   │   │   │   └── admin/
│   │   │   ├── common/
│   │   │   ├── config/
│   │   │   ├── prisma/
│   │   │   └── main.ts
│   │   └── package.json
│   │
│   └── ai-service/
│       ├── app/
│       ├── requirements.txt
│       └── Dockerfile
│
├── packages/
│   ├── shared/
│   │   ├── types/
│   │   ├── dto/
│   │   └── constants/
│   │
│   ├── genealogy-core/
│   │   ├── person.model.ts
│   │   ├── relationship.rules.ts
│   │   ├── tree-builder.ts
│   │   ├── privacy-rules.ts
│   │   └── gedcom-mapper.ts
│   │
│   └── ui/
│       ├── components/
│       └── theme/
│
├── infra/
│   ├── docker/
│   ├── nginx/
│   ├── traefik/
│   ├── postgres/
│   ├── minio/
│   ├── backup/
│   └── scripts/
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── MVP.md
│   ├── DATABASE.md
│   ├── DEPLOY_LOCAL.md
│   ├── DEPLOY_VPS.md
│   └── ROADMAP.md
│
├── docker-compose.yml
├── docker-compose.dev.yml
├── docker-compose.prod.yml
├── .env.example
├── .gitignore
├── README.md
└── package.json
4. Что за что отвечает
Компонент	За что отвечает
apps/web	Интерфейс: карточки людей, дерево, timeline, медиа, поиск
apps/api	Основная бизнес-логика, REST API, авторизация, БД
apps/ai-service	Будущий AI/OCR слой: распознавание документов, подсказки связей
packages/shared	Общие типы, DTO, enum, интерфейсы
packages/genealogy-core	Логика родства, построение дерева, правила приватности
packages/ui	Общие UI-компоненты
infra	Docker, nginx/traefik, backup, deploy scripts
docs	Документация для разработки и VPS
5. Docker Compose для локальной разработки
version: "3.9"

services:
  postgres:
    image: postgres:16
    container_name: family_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: family_platform
      POSTGRES_USER: family_user
      POSTGRES_PASSWORD: family_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    container_name: family_redis
    restart: unless-stopped
    ports:
      - "6379:6379"

  minio:
    image: minio/minio:latest
    container_name: family_minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: family_admin
      MINIO_ROOT_PASSWORD: family_password
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

  meilisearch:
    image: getmeili/meilisearch:v1.7
    container_name: family_meilisearch
    restart: unless-stopped
    environment:
      MEILI_MASTER_KEY: family_master_key
    ports:
      - "7700:7700"
    volumes:
      - meili_data:/meili_data

  neo4j:
    image: neo4j:5
    container_name: family_neo4j
    restart: unless-stopped
    environment:
      NEO4J_AUTH: neo4j/family_password
    ports:
      - "7474:7474"
      - "7687:7687"
    volumes:
      - neo4j_data:/data
    profiles:
      - graph

volumes:
  postgres_data:
  redis_data:
  minio_data:
  meili_data:
  neo4j_data:

Neo4j в MVP можно держать как optional:

docker compose --profile graph up -d
6. Основные сущности MVP
User
Person
Family
Relationship
Event
Place
Media
Document
Source
Citation
TimelineItem
AuditLog

Минимальный смысл:

Сущность	Назначение
Person	Человек в древе
Family	Семейная группа / брак / союз
Relationship	Родственная связь
Event	Рождение, смерть, свадьба, переезд, служба
Place	Географическое место
Media	Фото, видео, аудио, PDF
Document	Архивный документ
Source	Источник информации
Citation	Ссылка на конкретное место в источнике
TimelineItem	Элемент жизненной линии
AuditLog	Журнал изменений