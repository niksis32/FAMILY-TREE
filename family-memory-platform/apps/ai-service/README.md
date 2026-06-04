# apps/ai-service

Python **FastAPI** microservice for optional AI features (OCR via Tesseract, photo face detection via MediaPipe, local LLM storytelling).

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

## Local LLM (PROMPT 11 — storytelling)

Optional narrative generation via **Ollama** or any **OpenAI-compatible** server (`/v1/chat/completions`).

```bash
# Example: Ollama on host
ollama pull llama3.2

# In repo root .env:
LOCAL_LLM_ENABLED=true
LOCAL_LLM_PROVIDER=ollama
LOCAL_LLM_BASE_URL=http://localhost:11434
LOCAL_LLM_MODEL=llama3.2
AI_SERVICE_ENABLED=true
```

Health check: `GET http://localhost:8000/llm/health`

Story endpoints (`POST /story/person`, etc.) use LLM when enabled and fall back to deterministic stubs otherwise.
