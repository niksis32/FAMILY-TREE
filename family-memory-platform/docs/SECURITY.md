# Security

Family Memory Platform stores sensitive family, media and archive data. Treat every deployment as private by default.

## Supported security posture

Current stage: MVP foundation. Production hardening is in progress.

Do not expose a production instance publicly until:

- Auth and RBAC are complete.
- Production secrets are rotated.
- Infrastructure ports are closed.
- Backups and restore are tested.
- HTTPS is enabled.

## Secrets

Never commit:

- `.env`
- `.env.local`
- `.env.production`
- database dumps
- MinIO files/uploads
- private keys
- credentials JSON

Required strong secrets:

- `POSTGRES_PASSWORD`
- `MINIO_ROOT_PASSWORD`
- `MEILI_MASTER_KEY`
- `JWT_SECRET`
- `NEO4J_PASSWORD` if graph profile is used

`JWT_SECRET` should be at least 32 random characters.

## Network exposure

Production target:

- Public: only `80/443` through Nginx/reverse proxy.
- Internal only: PostgreSQL, Redis, MinIO, Meilisearch, Neo4j, AI service.

Do not expose:

- PostgreSQL `5432`
- Redis `6379`
- MinIO API `9000`
- Meilisearch `7700`
- Neo4j `7474/7687`
- AI service `8000`

## Data protection

- Physical files are stored in MinIO.
- Metadata is stored in PostgreSQL.
- Search index stores searchable text only; avoid indexing private raw secrets.
- Living persons should be hidden or reduced for public views.
- Future OCR output should inherit document privacy.

## AI security

AI service is optional and disabled by default.

Rules:

- No mandatory external AI API.
- Prefer local engines for private family data.
- Do not send private documents to third-party APIs without explicit user consent.
- Store AI results with provenance and privacy level.

## Reporting vulnerabilities

Before public GitHub release, configure a private vulnerability reporting channel.

Suggested policy:

1. Do not open public issues with secrets or exploit details.
2. Email the maintainer/security contact.
3. Include reproduction steps and affected version/commit.
4. Wait for confirmation before public disclosure.

## Production checklist

- [ ] `.env` contains no default values.
- [ ] HTTPS is enabled.
- [ ] Infrastructure ports are closed.
- [ ] Admin password is strong.
- [ ] Backups are encrypted or stored in a private location.
- [ ] Restore was tested.
- [ ] Swagger exposure is intentional.
- [ ] Logs do not print secrets.
