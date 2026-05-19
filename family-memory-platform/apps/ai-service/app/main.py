"""
Family Memory AI Service (optional).

Future responsibilities:
- OCR for archive documents
- Relationship inference suggestions
- Face detection / clustering in photos
- Voice story transcription

Enable via docker compose profile: ai
"""

from fastapi import FastAPI

app = FastAPI(
    title="Family Memory AI Service",
    version="0.1.0",
    description="Skeleton — implement in later iterations",
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "family-ai", "implemented": False}


@app.post("/ocr")
def ocr_stub():
    return {"message": "OCR not implemented — skeleton only"}
