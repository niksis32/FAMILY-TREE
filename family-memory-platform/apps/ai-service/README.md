# apps/ai-service

Python **FastAPI** microservice for optional AI features (OCR via Tesseract, photo face detection via MediaPipe).

```bash
# Local (with venv) — install Tesseract system binary first:
#   Windows: choco install tesseract
#   Ubuntu:  sudo apt install tesseract-ocr tesseract-ocr-rus tesseract-ocr-eng
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Docker (includes Tesseract + rus/eng language packs)
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile ai up -d ai-service
```

Set `AI_SERVICE_ENABLED=true` in API `.env` and enable compose profile `ai`.
