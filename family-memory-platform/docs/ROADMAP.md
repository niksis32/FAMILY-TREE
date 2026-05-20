# Roadmap

Roadmap отражает путь от текущего MVP foundation к production-ready self-hosted платформе.

## Phase 0. Project hygiene

- GitHub-ready README and docs.
- CI workflow for install, lint, test, build.
- Stable `.env.example`.
- Clear local and VPS deploy instructions.

## Phase 1. Prisma hardening

- UUID/cuid strategy finalized.
- Soft delete via `deletedAt`.
- Strong enums: user roles, gender, relationship types, event types, privacy.
- Seed data: first admin, demo family, demo relationships.
- Migration strategy documented.

## Phase 2. Auth and RBAC

- First admin registration.
- Login with JWT.
- Password hashing.
- Guards and roles: admin, editor, viewer/member.
- Protected backend routes.
- Swagger bearer auth examples.

## Phase 3. CRUD MVP

- Persons CRUD.
- Families CRUD.
- Relationships CRUD with validation.
- Events and places.
- Documents and sources.
- Citations.
- Admin audit view.

## Phase 4. Timeline, Search, Media

- Unified person timeline.
- Media presigned upload to MinIO.
- Document metadata.
- Meilisearch indexing for persons, documents, sources, places.
- OCR-ready search fields.

## Phase 5. Frontend MVP

- Dashboard.
- Persons and person details.
- Families.
- Interactive tree.
- Timeline with filters.
- Media gallery.
- Documents.
- Search.
- Settings and GEDCOM import.

## Phase 6. Tree and graph engine

- React Flow MVP.
- Renderer adapter abstraction.
- D3.js or Cytoscape.js replacement path.
- Large tree performance strategy.
- Optional Neo4j analytics.

## Phase 7. GEDCOM

- Preview import.
- Import report.
- Basic tags: INDI, NAME, SEX, BIRT, DEAT, FAM, FAMS, FAMC, HUSB, WIFE, CHIL, MARR, SOUR, NOTE.
- Export MVP.
- Conflict resolution.

## Phase 8. AI optional layer

- FastAPI service.
- OCR preview stub.
- Relationship suggestions stub.
- Timeline summary stub.
- Future local engines: Tesseract, PaddleOCR, local LLM, embeddings.

## Phase 9. Production readiness

- Secure Docker Compose prod network.
- Nginx and SSL.
- Backup/restore.
- Monitoring/logging.
- Rate limits.
- Security review.
- VPS release checklist.
