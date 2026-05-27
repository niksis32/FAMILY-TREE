"""Document intelligence — OCR, NER, suggestions (stub contracts for PROMPT 7)."""

from typing import Any

from pydantic import BaseModel, Field


class DocumentOcrRequest(BaseModel):
    document_id: str = Field(alias="documentId")
    file_name: str | None = Field(default=None, alias="fileName")
    mime_type: str | None = Field(default=None, alias="mimeType")
    storage_key: str | None = Field(default=None, alias="storageKey")
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


def _stub_pages_from_hint(req: DocumentOcrRequest) -> list[dict[str, Any]]:
    text = (req.text_hint or "").strip() or "(no stored OCR text — run OCR pipeline or paste textHint from API)"
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


def document_ocr_stub(req: DocumentOcrRequest) -> dict[str, Any]:
    return {
        "status": "stub",
        "feature": "document.ocr",
        "documentId": req.document_id,
        "language": req.language,
        "pages": _stub_pages_from_hint(req),
        "message": "OCR is stubbed. Connect Tesseract/PaddleOCR and PDF rasterization for production.",
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
