# Architecture

Family Memory Platform - self-hosted monorepo для семейного древа, медиаархива, документов, timeline, поиска, GEDCOM и будущих AI-функций.

## High-level схема

```text
Browser
  |
  v
apps/web (Next.js)
  |
  v
apps/api (NestJS REST API)
  |-- PostgreSQL + Prisma: domain data and metadata
  |-- MinIO: physical files
  |-- Meilisearch: local full-text search
  |-- Redis: cache/queues future
  |-- ai-service: optional local AI
  |-- Neo4j: optional graph analytics
```

## Monorepo zones

| Path | Назначение |
|---|---|
| `apps/web` | Next.js frontend, dashboard, tree, timeline, media, search |
| `apps/api` | NestJS backend, REST API, Prisma, integrations |
| `apps/ai-service` | Optional FastAPI service for OCR, relationship suggestions, summaries |
| `packages/shared` | Shared DTO/types/constants |
| `packages/genealogy-core` | Pure genealogy logic without framework dependencies |
| `packages/ui` | Shared React UI primitives |
| `infra` | Dockerfiles, nginx, backup scripts |
| `docs` | Project docs and deployment runbooks |

## Backend modules

`apps/api` is a modular monolith. Main modules:

- `auth`, `users`, `admin`
- `persons`, `families`, `relationships`
- `events`, `places`, `timeline`, `tree`
- `media`, `documents`, `sources`, `citations`
- `search`, `gedcom`, `ai`

## Data ownership

| Data | Storage |
|---|---|
| Persons, families, relationships | PostgreSQL |
| Events, timeline items | PostgreSQL |
| Media/document metadata | PostgreSQL |
| Physical files | MinIO |
| Search documents | Meilisearch |
| AI results / future embeddings | optional AI service / future storage |

## Graph rendering

**Tree Experience 2.0** (`/tree`): single `GET /tree/person/:id/view-data` feeds five modes (Classic React Flow, Cytoscape graph, R3F 3D, SVG timeline, MapLibre map). Layout math lives in `packages/tree-experience`. Legacy `TreeCanvas` / `ancestors|descendants|full` endpoints remain as thin wrappers.

Frontend `TreeCanvas` (MVP) still uses React Flow. Graph DTOs (`nodes`, `edges`) are extended in `TreeViewDataResponse` with `events`, `places`, `mediaPreview`, and layout hints.

## Optional services

- `ai-service` is disabled by default through `AI_SERVICE_ENABLED=false`.
- `neo4j` is enabled only through Docker profile `graph`.
- No external AI/search/storage provider is required for MVP.

## Production direction

Target production topology:

```text
Internet
  |
  v
Nginx / reverse proxy
  |
  v
family_internal Docker network
  |-- web
  |-- api
  |-- postgres
  |-- redis
  |-- minio
  |-- meilisearch
  |-- ai-service optional
  |-- neo4j optional
```
