# Deploy to VPS

Production deployment target: single VPS with Docker Compose, reverse proxy, internal network, persistent volumes and backups.

## 1. Server requirements

- Ubuntu 22.04+ / Debian 12+
- Docker Engine + Docker Compose plugin
- Git
- Domain name pointed to VPS IP
- Open ports: `80`, `443`
- Closed infrastructure ports: PostgreSQL, Redis, MinIO, Meilisearch, Neo4j

## 2. Clone repository

```bash
git clone https://github.com/YOUR_ORG/family-memory-platform.git
cd family-memory-platform
```

## 3. Create production env

```bash
cp .env.example .env
```

Change all secrets:

```env
NODE_ENV=production
APP_URL=https://your-domain.example
API_URL=https://your-domain.example/api
POSTGRES_PASSWORD=strong_password
MINIO_ROOT_PASSWORD=strong_password
MEILI_MASTER_KEY=strong_master_key
JWT_SECRET=long_random_secret_minimum_32_chars
NEXT_PUBLIC_API_URL=https://your-domain.example/api/v1
```

Optional:

```env
AI_SERVICE_ENABLED=false
NEO4J_ENABLED=false
```

## 4. Build and start

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

With optional AI:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile ai up -d --build
```

With optional Neo4j:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile graph up -d --build
```

## 5. Run migrations

Preferred approach: run migrations from an app/API context after containers are built.

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec api pnpm db:generate
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec api pnpm db:migrate
```

If the production image does not include pnpm dev tooling, run migrations during a controlled release job or from a temporary admin container.

## 6. Reverse proxy and SSL

Production compose includes `nginx`. Final Nginx config should route:

- `/` to `web:3000`
- `/api/` to `api:4000`
- `/docs` to Swagger if you intentionally expose it

Use Let's Encrypt / Certbot or another ACME flow. Do not expose infrastructure services directly to the internet.

## 7. Health checks

```bash
docker ps --filter "name=family_"
curl http://localhost:4000/api/v1/health
curl http://localhost:7700/health
```

From outside:

```bash
curl https://your-domain.example
curl https://your-domain.example/api/v1/health
```

## 8. Backups

Minimum backup plan:

- PostgreSQL dump
- MinIO bucket sync
- Meilisearch dump/snapshot
- Neo4j dump if profile `graph` is used
- `.env` stored securely outside the repository

Backup is not complete until restore is tested.

## 9. Release checklist

- [ ] `.env` contains no default `change_me_*` values.
- [ ] Only `80/443` are public.
- [ ] `docker compose config` reviewed.
- [ ] Database migrations applied.
- [ ] Admin account created.
- [ ] Backup job configured.
- [ ] Restore tested.
- [ ] Logs reviewed after first start.
- [ ] Swagger exposure decision made.

## 10. Rollback

Keep previous image/tag or previous git revision available:

```bash
git checkout <previous-release>
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

If migrations are not backward compatible, restore PostgreSQL from backup before rollback.
