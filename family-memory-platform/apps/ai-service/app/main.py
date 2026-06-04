"""Optional local AI service for Family Memory Platform."""

from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from app.family_story import FamilyStoryNarrativeRequest, family_story_narrative
from app.local_llm import check_llm_health, generate_narrative, llm_config, llm_enabled
from app.storytelling import (
    StoryDocumentSummaryRequest,
    StoryEraContextRequest,
    StoryFamilyRequest,
    StoryMigrationRequest,
    StoryPersonRequest,
    StoryTimelineNarrativeRequest,
    story_document_summary,
    story_era_context,
    story_family,
    story_migration,
    story_person,
    story_timeline_narrative,
)
from app.document_intelligence import (
    DocumentExtractEntitiesRequest,
    DocumentOcrRequest,
    DocumentSuggestEventsRequest,
    DocumentSuggestRelationshipsRequest,
    DocumentSummarizeRequest,
    document_extract_entities_stub,
    document_ocr,
    document_suggest_events_stub,
    document_suggest_relationships_stub,
    document_summarize_stub,
)
from app.ocr_engine import tesseract_available
from app.matching import ScorePairRequest, score_person_pair
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
    download_url: str | None = Field(default=None, alias="downloadUrl")
    text_hint: str | None = Field(default=None, alias="textHint")
    language: str = "ru"


class RelationshipSuggestRequest(BaseModel):
    person_id: str | None = Field(default=None, alias="personId")
    candidates: list[dict[str, Any]] = Field(default_factory=list)
    context: str | None = None


class TimelineSummaryRequest(BaseModel):
    person_id: str | None = Field(default=None, alias="personId")
    events: list[dict[str, Any]] = Field(default_factory=list)
    language: str = "ru"


@app.get("/health")
async def health():
    from app.photo import mp as mediapipe_module

    llm = await check_llm_health()
    implemented = [
        "ocr.tesseract" if tesseract_available() else "ocr.hint-only",
        "photo.mediapipe",
        "relationship.stub",
        "timeline.stub",
        "document.ocr",
        "document.extract-entities",
        "document.suggest-events",
        "document.suggest-relationships",
        "document.summarize",
        "family-story.narrative",
        "story.person",
        "story.timeline-narrative",
        "story.document-summary",
        "story.family",
        "story.migration",
        "story.era-context",
    ]
    if llm.get("available"):
        implemented.append("local-llm.narrative")
    else:
        implemented.append("local-llm.stub")

    return {
        "status": "ok",
        "service": "family-ai",
        "optional": True,
        "implemented": implemented,
        "mediapipe": mediapipe_module is not None,
        "tesseract": tesseract_available(),
        "localLlm": llm,
        "futureEngines": ["paddleocr", "face-embeddings"],
    }


@app.get("/llm/health")
async def llm_health():
    return await check_llm_health()


@app.post("/ocr/preview")
async def ocr_preview(payload: OcrPreviewRequest):
    doc_id = payload.document_id or "preview"
    result = await document_ocr(
        DocumentOcrRequest(
            documentId=doc_id,
            fileName=payload.file_name,
            mimeType=payload.mime_type,
            downloadUrl=payload.download_url,
            language=payload.language,
            textHint=payload.text_hint,
        )
    )
    pages = result.get("pages") or []
    text = " ".join(
        block.get("text", "")
        for page in pages
        for block in page.get("blocks", [])
    ).strip()
    return {
        "status": result.get("status", "ok"),
        "feature": "ocr.preview",
        "documentId": payload.document_id,
        "fileName": payload.file_name,
        "mimeType": payload.mime_type,
        "text": text or payload.text_hint or "",
        "confidence": result.get("averageConfidence", 0),
        "engine": result.get("engine"),
        "message": result.get("message"),
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
async def timeline_summary(payload: TimelineSummaryRequest):
    event_lines: list[str] = []
    for event in payload.events[:20]:
        if not isinstance(event, dict):
            continue
        label = event.get("title") or event.get("type") or "event"
        when = event.get("dateFrom") or event.get("dateTo") or ""
        event_lines.append(f"{label} ({when})")

    title = f"Timeline summary: {payload.person_id or 'person'}"
    llm = await generate_narrative(
        language=payload.language,
        mode="dry_biography",
        title=title,
        facts=event_lines or [f"Events count: {len(payload.events)}"],
        extra_context="Summarize the person's life timeline in 1–3 short paragraphs.",
    )

    if llm.get("ok") and llm.get("narrative"):
        return {
            "status": "ok",
            "feature": "timeline.summary",
            "personId": payload.person_id,
            "language": payload.language,
            "summary": llm["narrative"],
            "eventCount": len(payload.events),
            "engine": llm.get("engine"),
            "model": llm.get("model"),
            "message": "Generated via local LLM.",
        }

    return {
        "status": "stub",
        "feature": "timeline.summary",
        "personId": payload.person_id,
        "language": payload.language,
        "summary": "",
        "eventCount": len(payload.events),
        "localLlm": llm_config(),
        "message": (
            llm.get("message")
            if llm_enabled()
            else "Timeline summary is disabled in MVP. Set LOCAL_LLM_ENABLED=true and run Ollama."
        ),
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


@app.post("/matching/score-pair")
def matching_score_pair(payload: ScorePairRequest):
    return score_person_pair(payload)


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
async def document_ocr_route(payload: DocumentOcrRequest):
    return await document_ocr(payload)


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
async def family_story_narrative_route(payload: FamilyStoryNarrativeRequest):
    return await family_story_narrative(payload)


# --- PROMPT 11 — AI Storytelling (stub contracts) ---


@app.post("/story/person")
async def story_person_route(payload: StoryPersonRequest):
    return await story_person(payload)


@app.post("/story/timeline-narrative")
async def story_timeline_narrative_route(payload: StoryTimelineNarrativeRequest):
    return await story_timeline_narrative(payload)


@app.post("/story/document-summary")
async def story_document_summary_route(payload: StoryDocumentSummaryRequest):
    return await story_document_summary(payload)


@app.post("/story/family")
async def story_family_route(payload: StoryFamilyRequest):
    return await story_family(payload)


@app.post("/story/migration")
async def story_migration_route(payload: StoryMigrationRequest):
    return await story_migration(payload)


@app.post("/story/era-context")
async def story_era_context_route(payload: StoryEraContextRequest):
    return await story_era_context(payload)
