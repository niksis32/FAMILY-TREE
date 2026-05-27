"""Optional local AI service for Family Memory Platform."""

from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from app.family_story import FamilyStoryNarrativeRequest, family_story_narrative_stub
from app.document_intelligence import (
    DocumentExtractEntitiesRequest,
    DocumentOcrRequest,
    DocumentSuggestEventsRequest,
    DocumentSuggestRelationshipsRequest,
    DocumentSummarizeRequest,
    document_extract_entities_stub,
    document_ocr_stub,
    document_suggest_events_stub,
    document_suggest_relationships_stub,
    document_summarize_stub,
)
from app.photo import (
    PhotoImageRequest,
    PhotoSuggestRequest,
    detect_faces_mediapipe,
    estimate_period,
    extract_context_stub,
    fetch_image_bytes,
    suggest_person_matches,
)

app = FastAPI(
    title="Family Memory AI Service",
    version="0.2.0",
    description="Optional local AI layer: OCR, photo intelligence (MediaPipe), timeline summaries.",
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
    from app.photo import mp as mediapipe_module

    return {
        "status": "ok",
        "service": "family-ai",
        "optional": True,
        "implemented": [
            "ocr.stub",
            "photo.mediapipe",
            "relationship.stub",
            "timeline.stub",
            "document.ocr",
            "document.extract-entities",
            "document.suggest-events",
            "document.suggest-relationships",
            "document.summarize",
            "family-story.narrative",
        ],
        "mediapipe": mediapipe_module is not None,
        "futureEngines": ["paddleocr", "local-llm", "face-embeddings"],
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


@app.post("/photo/detect-faces")
async def photo_detect_faces(payload: PhotoImageRequest):
    try:
        image, width, height = await fetch_image_bytes(payload.image_url)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Cannot load image: {exc}") from exc

    faces = detect_faces_mediapipe(image, width, height)
    return {
        "status": "ok",
        "feature": "photo.detect-faces",
        "mediaId": payload.media_id,
        "faces": faces,
        "imageWidth": width,
        "imageHeight": height,
        "engine": "mediapipe" if faces or True else "none",
    }


@app.post("/photo/suggest-person")
async def photo_suggest_person(payload: PhotoSuggestRequest):
    suggestions = suggest_person_matches(payload)
    return {
        "status": "ok",
        "feature": "photo.suggest-person",
        "mediaId": payload.media_id,
        "faceTagId": payload.face_tag_id,
        "suggestions": suggestions,
    }


@app.post("/photo/extract-context")
async def photo_extract_context(payload: PhotoImageRequest):
    try:
        _image, width, height = await fetch_image_bytes(payload.image_url)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Cannot load image: {exc}") from exc

    context = extract_context_stub(width, height)
    return {
        "status": "ok",
        "feature": "photo.extract-context",
        "mediaId": payload.media_id,
        **context,
    }


@app.post("/photo/estimate-period")
async def photo_estimate_period(payload: PhotoImageRequest):
    period = estimate_period(payload.taken_at)
    return {
        "status": "ok",
        "feature": "photo.estimate-period",
        "mediaId": payload.media_id,
        **period,
    }


@app.post("/document/ocr")
def document_ocr(payload: DocumentOcrRequest):
    return document_ocr_stub(payload)


@app.post("/document/extract-entities")
def document_extract_entities(payload: DocumentExtractEntitiesRequest):
    return document_extract_entities_stub(payload)


@app.post("/document/suggest-events")
def document_suggest_events(payload: DocumentSuggestEventsRequest):
    return document_suggest_events_stub(payload)


@app.post("/document/suggest-relationships")
def document_suggest_relationships(payload: DocumentSuggestRelationshipsRequest):
    return document_suggest_relationships_stub(payload)


@app.post("/document/summarize")
def document_summarize(payload: DocumentSummarizeRequest):
    return document_summarize_stub(payload)


@app.post("/family-story/narrative")
def family_story_narrative(payload: FamilyStoryNarrativeRequest):
    return family_story_narrative_stub(payload)
