"""Document intelligence — OCR, NER, suggestions (PROMPT 7)."""

from typing import Any

from pydantic import BaseModel, Field

from app.ocr_engine import run_ocr_from_url, tesseract_available


class DocumentOcrRequest(BaseModel):
    document_id: str = Field(alias="documentId")
    file_name: str | None = Field(default=None, alias="fileName")
    mime_type: str | None = Field(default=None, alias="mimeType")
    storage_key: str | None = Field(default=None, alias="storageKey")
    download_url: str | None = Field(default=None, alias="downloadUrl")
    language: str = "ru"
    text_hint: str | None = Field(default=None, alias="textHint")

    model_config = {"populate_by_name": True}


class TextBlockIn(BaseModel):
    page: int = 1
    text: str
    block_id: str | None = Field(default=None, alias="blockId")

    model_config = {"populate_by_name": True}


class DocumentExtractEntitiesRequest(BaseModel):
    document_id: str = Field(alias="documentId")
    language: str = "ru"
    text_blocks: list[TextBlockIn] = Field(default_factory=list, alias="textBlocks")

    model_config = {"populate_by_name": True}


class DocumentSuggestEventsRequest(BaseModel):
    document_id: str = Field(alias="documentId")
    language: str = "ru"
    entities: list[dict[str, Any]] = Field(default_factory=list)
    text_blocks: list[TextBlockIn] = Field(default_factory=list, alias="textBlocks")

    model_config = {"populate_by_name": True}


class DocumentSuggestRelationshipsRequest(BaseModel):
    document_id: str = Field(alias="documentId")
    language: str = "ru"
    entities: list[dict[str, Any]] = Field(default_factory=list)
    text_blocks: list[TextBlockIn] = Field(default_factory=list, alias="textBlocks")
    known_person_ids: list[str] = Field(default_factory=list, alias="knownPersonIds")

    model_config = {"populate_by_name": True}


class DocumentSummarizeRequest(BaseModel):
    document_id: str = Field(alias="documentId")
    language: str = "ru"
    text_blocks: list[TextBlockIn] = Field(default_factory=list, alias="textBlocks")

    model_config = {"populate_by_name": True}


def _hint_pages(text: str) -> list[dict[str, Any]]:
    return [
        {
            "page": 1,
            "blocks": [
                {
                    "blockId": "b1",
                    "text": text[:8000],
                    "bbox": None,
                    "confidence": 0.0,
                }
            ],
        }
    ]


async def document_ocr(req: DocumentOcrRequest) -> dict[str, Any]:
    if req.download_url and tesseract_available():
        try:
            result = await run_ocr_from_url(req.download_url, req.mime_type, req.language)
            return {
                "status": "ok",
                "feature": "document.ocr",
                "documentId": req.document_id,
                "language": result["language"],
                "engine": result["engine"],
                "averageConfidence": result["averageConfidence"],
                "pages": result["pages"],
            }
        except Exception as exc:  # noqa: BLE001
            hint = (req.text_hint or "").strip()
            if hint:
                return {
                    "status": "fallback",
                    "feature": "document.ocr",
                    "documentId": req.document_id,
                    "language": req.language,
                    "engine": "text-hint",
                    "pages": _hint_pages(hint),
                    "message": f"OCR failed ({exc}); returned stored textHint.",
                }
            return {
                "status": "error",
                "feature": "document.ocr",
                "documentId": req.document_id,
                "language": req.language,
                "pages": [],
                "message": str(exc),
            }

    hint = (req.text_hint or "").strip()
    if hint:
        return {
            "status": "hint",
            "feature": "document.ocr",
            "documentId": req.document_id,
            "language": req.language,
            "engine": "text-hint",
            "pages": _hint_pages(hint),
            "message": "No downloadUrl or Tesseract unavailable — returned textHint only.",
        }

    return {
        "status": "unavailable",
        "feature": "document.ocr",
        "documentId": req.document_id,
        "language": req.language,
        "pages": _hint_pages("(no stored OCR text — upload a file and run OCR with AI profile enabled)"),
        "message": "Provide downloadUrl and enable Tesseract (docker profile ai) for real OCR.",
    }


def document_extract_entities_stub(req: DocumentExtractEntitiesRequest) -> dict[str, Any]:
    return {
        "status": "stub",
        "feature": "document.extract-entities",
        "documentId": req.document_id,
        "language": req.language,
        "entities": [],
        "message": "NER/entity extraction is stubbed. Plug spaCy / GLiNER / LLM extraction here.",
    }


def document_suggest_events_stub(req: DocumentSuggestEventsRequest) -> dict[str, Any]:
    return {
        "status": "stub",
        "feature": "document.suggest-events",
        "documentId": req.document_id,
        "suggestions": [],
        "message": "Event suggestions are stubbed. Use rules + LLM over entities and textBlocks.",
    }


def document_suggest_relationships_stub(req: DocumentSuggestRelationshipsRequest) -> dict[str, Any]:
    return {
        "status": "stub",
        "feature": "document.suggest-relationships",
        "documentId": req.document_id,
        "suggestions": [],
        "message": "Relationship suggestions are stubbed. Use resolver over extracted names + tree context.",
    }


def document_summarize_stub(req: DocumentSummarizeRequest) -> dict[str, Any]:
    joined = " ".join(b.text for b in req.text_blocks)[:12000]
    return {
        "status": "stub",
        "feature": "document.summarize",
        "documentId": req.document_id,
        "language": req.language,
        "summary": "",
        "documentKind": "unknown",
        "uncertaintyScore": 0.85,
        "sourceHint": joined[:500] if joined else None,
        "message": "Summary is stubbed. Plug local LLM for narrative summary + document classification.",
    }
