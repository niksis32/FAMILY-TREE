from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


StoryMode = Literal["dry_biography", "artistic", "archive", "family_book"]


class StorySourceRef(BaseModel):
    source_type: str = Field(alias="sourceType")
    source_id: str | None = Field(default=None, alias="sourceId")
    label: str | None = None


class StoryClaim(BaseModel):
    id: str
    text: str
    is_assumption: bool = Field(alias="isAssumption")
    uncertainty: float | None = None
    uncertainty_note: str | None = Field(default=None, alias="uncertaintyNote")
    sources: list[StorySourceRef] = Field(default_factory=list)


class StoryParagraph(BaseModel):
    id: str
    text: str
    claim_ids: list[str] | None = Field(default=None, alias="claimIds")


class StoryWarning(BaseModel):
    kind: Literal["uncertainty", "assumption", "missing_source"]
    message: str


class StoryOutput(BaseModel):
    status: str = "stub"
    feature: str
    language: str = "ru"
    mode: StoryMode = "dry_biography"
    title: str | None = None
    narrative: str = ""
    paragraphs: list[StoryParagraph] = Field(default_factory=list)
    claims: list[StoryClaim] = Field(default_factory=list)
    warnings: list[StoryWarning] = Field(default_factory=list)
    uncertainty_score: float | None = Field(default=None, alias="uncertaintyScore")
    message: str | None = None


class StoryPersonRequest(BaseModel):
    language: str = "ru"
    mode: StoryMode = "dry_biography"
    person: dict[str, Any] = Field(default_factory=dict)
    timeline: list[dict[str, Any]] = Field(default_factory=list)


class StoryTimelineNarrativeRequest(BaseModel):
    language: str = "ru"
    mode: StoryMode = "dry_biography"
    person: dict[str, Any] = Field(default_factory=dict)
    timeline: list[dict[str, Any]] = Field(default_factory=list)


class StoryDocumentSummaryRequest(BaseModel):
    language: str = "ru"
    mode: StoryMode = "dry_biography"
    document: dict[str, Any] = Field(default_factory=dict)


class StoryFamilyRequest(BaseModel):
    language: str = "ru"
    mode: StoryMode = "dry_biography"
    family: dict[str, Any] = Field(default_factory=dict)
    persons: list[dict[str, Any]] = Field(default_factory=list)
    events: list[dict[str, Any]] = Field(default_factory=list)


class StoryMigrationRequest(BaseModel):
    language: str = "ru"
    mode: StoryMode = "dry_biography"
    person_ids: list[str] = Field(default_factory=list, alias="personIds")
    family_id: str | None = Field(default=None, alias="familyId")
    map: dict[str, Any] = Field(default_factory=dict)


class StoryEraContextRequest(BaseModel):
    language: str = "ru"
    mode: StoryMode = "dry_biography"
    person_id: str | None = Field(default=None, alias="personId")
    family_id: str | None = Field(default=None, alias="familyId")
    year_from: int | None = Field(default=None, alias="yearFrom")
    year_to: int | None = Field(default=None, alias="yearTo")


def _stub_claims_from_facts(facts: list[tuple[str, StorySourceRef]]) -> tuple[list[StoryClaim], list[StoryParagraph], str]:
    claims: list[StoryClaim] = []
    paragraphs: list[StoryParagraph] = []
    lines: list[str] = []
    for idx, (text, src) in enumerate(facts, start=1):
        cid = f"c{idx}"
        claims.append(
            StoryClaim(
                id=cid,
                text=text,
                isAssumption=False,
                sources=[src],
            )
        )
        lines.append(f"- {text}")
    narrative = "\n".join(lines).strip()
    if narrative:
        paragraphs.append(StoryParagraph(id="p1", text=narrative, claimIds=[c.id for c in claims]))
    return claims, paragraphs, narrative


def story_person_stub(req: StoryPersonRequest) -> dict[str, Any]:
    person_id = str(req.person.get("id") or "")
    name = " ".join(
        [str(req.person.get("givenName") or ""), str(req.person.get("familyName") or "")]
    ).strip() or "Персона"

    facts: list[tuple[str, StorySourceRef]] = [
        (f"Профиль: {name}.", StorySourceRef(sourceType="person", sourceId=person_id)),
    ]
    if req.person.get("birthDate"):
        facts.append(
            (
                f"Дата рождения указана: {req.person.get('birthDate')}.",
                StorySourceRef(sourceType="person", sourceId=person_id),
            )
        )
    if req.person.get("deathDate"):
        facts.append(
            (
                f"Дата смерти указана: {req.person.get('deathDate')}.",
                StorySourceRef(sourceType="person", sourceId=person_id),
            )
        )
    claims, paragraphs, narrative = _stub_claims_from_facts(facts)

    return StoryOutput(
        feature="story.person",
        language=req.language,
        mode=req.mode,
        title=f"Биография: {name}",
        narrative=narrative,
        paragraphs=paragraphs,
        claims=claims,
        warnings=[
            StoryWarning(
                kind="uncertainty",
                message="Это stub-генерация без LLM. Добавьте local-llm для художественного рассказа и более связного текста.",
            )
        ],
        uncertaintyScore=0.25,
        message="Storytelling is stubbed. Plug local LLM for rich narrative with citations.",
    ).model_dump(by_alias=True)


def story_timeline_narrative_stub(req: StoryTimelineNarrativeRequest) -> dict[str, Any]:
    person_id = str(req.person.get("id") or "")
    name = str(req.person.get("name") or "") or "Персона"
    facts: list[tuple[str, StorySourceRef]] = [
        (f"Найдено событий в timeline: {len(req.timeline)}.", StorySourceRef(sourceType="person", sourceId=person_id))
    ]
    claims, paragraphs, narrative = _stub_claims_from_facts(facts)
    return StoryOutput(
        feature="story.timeline-narrative",
        language=req.language,
        mode=req.mode,
        title=f"Timeline narrative: {name}",
        narrative=narrative,
        paragraphs=paragraphs,
        claims=claims,
        warnings=[],
        uncertaintyScore=0.35,
        message="Timeline narrative is stubbed. Plug local LLM later.",
    ).model_dump(by_alias=True)


def story_document_summary_stub(req: StoryDocumentSummaryRequest) -> dict[str, Any]:
    doc_id = str(req.document.get("id") or "")
    title = str(req.document.get("title") or "") or "Документ"
    ocr_text = str(req.document.get("ocrText") or "")
    snippet = (ocr_text or "").strip().replace("\n", " ")[:240]

    facts: list[tuple[str, StorySourceRef]] = [
        (f"Документ: {title}.", StorySourceRef(sourceType="document", sourceId=doc_id)),
    ]
    if snippet:
        facts.append((f"Фрагмент OCR: «{snippet}…»", StorySourceRef(sourceType="document", sourceId=doc_id)))
    else:
        facts.append(
            (
                "OCR-текст отсутствует или пустой: итоговый summary требует OCR/анализа документа.",
                StorySourceRef(sourceType="document", sourceId=doc_id),
            )
        )

    claims, paragraphs, narrative = _stub_claims_from_facts(facts)
    return StoryOutput(
        feature="story.document-summary",
        language=req.language,
        mode=req.mode,
        title=f"Summary: {title}",
        narrative=narrative,
        paragraphs=paragraphs,
        claims=claims,
        warnings=[
            StoryWarning(
                kind="missing_source",
                message="Stub-режим: нет классификации документа и полнотекстового резюме. Для этого нужен local-llm.",
            )
        ],
        uncertaintyScore=0.55,
        message="Document summary is stubbed. Plug local LLM later.",
    ).model_dump(by_alias=True)


def story_family_stub(req: StoryFamilyRequest) -> dict[str, Any]:
    family_id = str(req.family.get("id") or "")
    name = str(req.family.get("name") or "") or "Семья"
    member_count = len(req.persons)
    event_count = len(req.events)

    facts: list[tuple[str, StorySourceRef]] = [
        (f"Семейная ветка: {name}.", StorySourceRef(sourceType="family", sourceId=family_id)),
        (f"Участников в ветке: {member_count}.", StorySourceRef(sourceType="family", sourceId=family_id)),
        (f"Событий, привязанных к семье: {event_count}.", StorySourceRef(sourceType="family", sourceId=family_id)),
    ]
    claims, paragraphs, narrative = _stub_claims_from_facts(facts)
    return StoryOutput(
        feature="story.family",
        language=req.language,
        mode=req.mode,
        title=f"История ветки: {name}",
        narrative=narrative,
        paragraphs=paragraphs,
        claims=claims,
        warnings=[
            StoryWarning(
                kind="uncertainty",
                message="Stub-режим: история ветки пока собирается из минимальных фактов. Для полноценного рассказа нужен local-llm.",
            )
        ],
        uncertaintyScore=0.45,
        message="Family story is stubbed. Plug local LLM later.",
    ).model_dump(by_alias=True)


def story_migration_stub(req: StoryMigrationRequest) -> dict[str, Any]:
    routes = req.map.get("routes") if isinstance(req.map, dict) else None
    route_count = len(routes) if isinstance(routes, list) else 0

    facts: list[tuple[str, StorySourceRef]] = [
        (f"Персон в миграционном анализе: {len(req.person_ids)}.", StorySourceRef(sourceType="system", label="migration")),
        (f"Маршрутов на карте: {route_count}.", StorySourceRef(sourceType="system", label="map")),
    ]
    claims, paragraphs, narrative = _stub_claims_from_facts(facts)
    return StoryOutput(
        feature="story.migration",
        language=req.language,
        mode=req.mode,
        title="Рассказ о миграции семьи",
        narrative=narrative,
        paragraphs=paragraphs,
        claims=claims,
        warnings=[
            StoryWarning(
                kind="missing_source",
                message="Stub-режим: нет извлечения причин/эпохи/контекста миграций. Нужен local-llm + нормализация событий миграции.",
            )
        ],
        uncertaintyScore=0.6,
        message="Migration story is stubbed. Plug local LLM later.",
    ).model_dump(by_alias=True)


def story_era_context_stub(req: StoryEraContextRequest) -> dict[str, Any]:
    yf = req.year_from
    yt = req.year_to
    span = f"{yf}–{yt}" if yf and yt else (str(yf) if yf else (str(yt) if yt else "—"))

    facts: list[tuple[str, StorySourceRef]] = [
        (f"Запрошен исторический контекст эпохи: {span}.", StorySourceRef(sourceType="system", label="era-context")),
    ]
    claims, paragraphs, narrative = _stub_claims_from_facts(facts)
    return StoryOutput(
        feature="story.era-context",
        language=req.language,
        mode=req.mode,
        title=f"Исторический контекст: {span}",
        narrative=narrative,
        paragraphs=paragraphs,
        claims=claims,
        warnings=[
            StoryWarning(
                kind="uncertainty",
                message="Stub-режим: без LLM и без внешних источников. При подключении local-llm добавится контекст с явной маркировкой предположений.",
            )
        ],
        uncertaintyScore=0.7,
        message="Era context is stubbed. Plug local LLM later.",
    ).model_dump(by_alias=True)

