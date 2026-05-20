"""Optional local AI service for Family Memory Platform."""

from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(
    title="Family Memory AI Service",
    version="0.1.0",
    description="Optional local AI layer: OCR, relationship hints, timeline summaries.",
)


class OcrPreviewRequest(BaseModel):
    document_id: str | None = Field(default=None, alias="documentId")
    file_name: str | None = Field(default=None, alias="fileName")
    mime_type: str | None = Field(default=None, alias="mimeType")
    text_hint: str | None = Field(default=None, alias="textHint")


class RelationshipSuggestRequest(BaseModel):
    person_id: str | None = Field(default=None, alias="personId")
    candidates: list[dict[str, Any]] = Field(default_factory=list)
    context: str | None = None


class TimelineSummaryRequest(BaseModel):
    person_id: str | None = Field(default=None, alias="personId")
    events: list[dict[str, Any]] = Field(default_factory=list)
    language: str = "ru"


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "family-ai",
        "optional": True,
        "implemented": "stub",
        "futureEngines": ["tesseract", "paddleocr", "local-llm", "embeddings"],
    }


@app.post("/ocr/preview")
def ocr_preview_stub(payload: OcrPreviewRequest):
    return {
        "status": "stub",
        "feature": "ocr.preview",
        "documentId": payload.document_id,
        "fileName": payload.file_name,
        "mimeType": payload.mime_type,
        "text": payload.text_hint or "",
        "confidence": 0,
        "message": "OCR preview is disabled in MVP. Plug in Tesseract/PaddleOCR later.",
    }


@app.post("/relationship/suggest")
def relationship_suggest_stub(payload: RelationshipSuggestRequest):
    return {
        "status": "stub",
        "feature": "relationship.suggest",
        "personId": payload.person_id,
        "suggestions": [],
        "message": "Relationship suggestions are disabled in MVP. Plug in graph analytics/LLM later.",
    }


@app.post("/timeline/summary")
def timeline_summary_stub(payload: TimelineSummaryRequest):
    return {
        "status": "stub",
        "feature": "timeline.summary",
        "personId": payload.person_id,
        "language": payload.language,
        "summary": "",
        "eventCount": len(payload.events),
        "message": "Timeline summary is disabled in MVP. Plug in local LLM later.",
    }
