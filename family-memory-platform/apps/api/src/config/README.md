# Config

Centralized configuration factories (`registerAs`) for:
- database, redis, minio, meilisearch, jwt, neo4j (optional).

Root `.env` is loaded before NestJS boot via `bootstrap-env.ts` and `scripts/api-start.mjs`
(MINIO_*, MEILI_*, REDIS_* and other vars — see `config/load-root-env.ts`).

Iteration: add `config/*.config.ts` and import in `ConfigModule`.
