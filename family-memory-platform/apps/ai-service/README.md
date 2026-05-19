# apps/ai-service

Python **FastAPI** microservice for future AI features. Not required for MVP core.

```bash
# Local (with venv)
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Docker
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile ai up -d ai-service
```
