from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from app.local_llm import generate_narrative, llm_enabled
from app.story_fact_check import FactCheckResult, apply_fact_check_to_claims, fact_check_narrative


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
    kind: Literal["uncertainty", "assumption", "missing_source", "fact_mismatch"]
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
    fact_check: dict[str, Any] | None = Field(default=None, alias="factCheck")


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


def _paragraphs_from_narrative(narrative: str, claim_ids: list[str] | None = None) -> list[StoryParagraph]:
    chunks = [part.strip() for part in narrative.split("\n\n") if part.strip()]
    if not chunks:
        chunks = [narrative.strip()] if narrative.strip() else []
    return [
        StoryParagraph(id=f"p{idx}", text=text, claimIds=claim_ids)
        for idx, text in enumerate(chunks, start=1)
    ]


def _merge_warnings(*groups: list[StoryWarning]) -> list[StoryWarning]:
    seen: set[str] = set()
    merged: list[StoryWarning] = []
    for group in groups:
        for warning in group:
            key = f"{warning.kind}:{warning.message}"
            if key in seen:
                continue
            seen.add(key)
            merged.append(warning)
    return merged


def _apply_fact_check(
    output: StoryOutput,
    *,
    persons: list[dict[str, Any]] | None = None,
    events: list[dict[str, Any]] | None = None,
) -> StoryOutput:
    if not output.narrative.strip():
        return output

    result: FactCheckResult = fact_check_narrative(
        output.narrative,
        persons=persons,
        events=events,
    )
    fact_warnings = [
        StoryWarning(kind=w.kind, message=w.message)
        for w in result.warnings
    ]
    claims = apply_fact_check_to_claims(output.claims, result)
    ai_uncertainty = output.uncertainty_score if output.uncertainty_score is not None else 0.0
    fact_uncertainty = 1.0 - result.score

    return output.model_copy(
        update={
            "claims": claims,
            "warnings": _merge_warnings(output.warnings, fact_warnings),
            "uncertaintyScore": max(ai_uncertainty, fact_uncertainty),
            "factCheck": result.model_dump(by_alias=True),
        }
    )


async def _story_from_facts_or_llm(
    *,
    feature: str,
    language: str,
    mode: StoryMode,
    title: str,
    facts: list[tuple[str, StorySourceRef]],
    extra_context: str = "",
    stub_message: str,
    stub_uncertainty: float,
    stub_warnings: list[StoryWarning],
    persons: list[dict[str, Any]] | None = None,
    events: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    fact_texts = [text for text, _src in facts]
    llm = await generate_narrative(
        language=language,
        mode=mode,
        title=title,
        facts=fact_texts,
        extra_context=extra_context,
    )

    claims, _stub_paragraphs, _stub_narrative = _stub_claims_from_facts(facts)

    if llm.get("ok") and llm.get("narrative"):
        narrative = str(llm["narrative"])
        llm_claim = StoryClaim(
            id=f"c{len(claims) + 1}",
            text="Narrative generated by local LLM from verified facts above.",
            isAssumption=True,
            uncertainty=0.15,
            uncertaintyNote="Review LLM prose against person records before publishing.",
            sources=[StorySourceRef(sourceType="system", label="local-llm")],
        )
        claims.append(llm_claim)
        paragraphs = _paragraphs_from_narrative(narrative, claim_ids=[llm_claim.id])
        output = _apply_fact_check(
            StoryOutput(
                status="ok",
                feature=feature,
                language=language,
                mode=mode,
                title=title,
                narrative=narrative,
                paragraphs=paragraphs,
                claims=claims,
                warnings=[
                    StoryWarning(
                        kind="uncertainty",
                        message="Текст сгенерирован local LLM. Проверьте факты по записям Person/Event перед публикацией.",
                    )
                ],
                uncertaintyScore=0.2,
                message=f"Generated via local LLM ({llm.get('engine')}:{llm.get('model')}).",
            ),
            persons=persons,
            events=events,
        )
        return output.model_dump(by_alias=True)

    # Fallback: deterministic stub
    paragraphs = _stub_paragraphs
    narrative = _stub_narrative
    warnings = list(stub_warnings)
    if llm_enabled():
        warnings.append(
            StoryWarning(
                kind="missing_source",
                message=f"Local LLM недоступен: {llm.get('message') or 'unknown error'}. Использован stub.",
            )
        )

    output = _apply_fact_check(
        StoryOutput(
            status="stub",
            feature=feature,
            language=language,
            mode=mode,
            title=title,
            narrative=narrative,
            paragraphs=paragraphs,
            claims=claims,
            warnings=warnings,
            uncertaintyScore=stub_uncertainty,
            message=stub_message,
        ),
        persons=persons,
        events=events,
    )
    return output.model_dump(by_alias=True)


async def story_person(req: StoryPersonRequest) -> dict[str, Any]:
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
    if req.person.get("biography"):
        facts.append(
            (
                f"Биография в профиле: {str(req.person.get('biography'))[:500]}.",
                StorySourceRef(sourceType="person", sourceId=person_id),
            )
        )

    timeline_lines: list[str] = []
    for event in req.timeline[:12]:
        if not isinstance(event, dict):
            continue
        label = event.get("title") or event.get("type") or "событие"
        when = event.get("dateFrom") or event.get("dateTo") or ""
        place = event.get("place") or ""
        timeline_lines.append(f"{label} ({when}{', ' + place if place else ''})".strip())
    extra_context = ""
    if timeline_lines:
        extra_context = "Timeline events:\n" + "\n".join(f"- {line}" for line in timeline_lines)

    return await _story_from_facts_or_llm(
        feature="story.person",
        language=req.language,
        mode=req.mode,
        title=f"Биография: {name}",
        facts=facts,
        extra_context=extra_context,
        stub_message="Storytelling is stubbed. Plug local LLM for rich narrative with citations.",
        stub_uncertainty=0.25,
        stub_warnings=[
            StoryWarning(
                kind="uncertainty",
                message="Это stub-генерация без LLM. Добавьте local-llm для художественного рассказа и более связного текста.",
            )
        ],
        persons=[req.person],
        events=req.timeline,
    )


async def story_timeline_narrative(req: StoryTimelineNarrativeRequest) -> dict[str, Any]:
    person_id = str(req.person.get("id") or "")
    name = str(req.person.get("name") or "") or "Персона"
    facts: list[tuple[str, StorySourceRef]] = [
        (f"Найдено событий в timeline: {len(req.timeline)}.", StorySourceRef(sourceType="person", sourceId=person_id))
    ]
    for event in req.timeline[:20]:
        if not isinstance(event, dict):
            continue
        event_id = str(event.get("id") or "")
        label = event.get("title") or event.get("type") or "событие"
        when = event.get("dateFrom") or event.get("dateTo") or ""
        desc = str(event.get("description") or "")[:200]
        line = f"{label} ({when})"
        if desc:
            line = f"{line}: {desc}"
        facts.append((line, StorySourceRef(sourceType="event", sourceId=event_id or None)))

    return await _story_from_facts_or_llm(
        feature="story.timeline-narrative",
        language=req.language,
        mode=req.mode,
        title=f"Timeline narrative: {name}",
        facts=facts,
        stub_message="Timeline narrative is stubbed. Plug local LLM later.",
        stub_uncertainty=0.35,
        stub_warnings=[],
        persons=[req.person],
        events=req.timeline,
    )


async def story_document_summary(req: StoryDocumentSummaryRequest) -> dict[str, Any]:
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

    extra_context = ocr_text[:4000] if ocr_text.strip() else ""
    person_id = str(req.document.get("personId") or "")
    persons = [{"id": person_id}] if person_id else []
    return await _story_from_facts_or_llm(
        feature="story.document-summary",
        language=req.language,
        mode=req.mode,
        title=f"Summary: {title}",
        facts=facts,
        extra_context=extra_context,
        stub_message="Document summary is stubbed. Plug local LLM later.",
        stub_uncertainty=0.55,
        stub_warnings=[
            StoryWarning(
                kind="missing_source",
                message="Stub-режим: нет классификации документа и полнотекстового резюме. Для этого нужен local-llm.",
            )
        ],
        persons=persons,
    )


async def story_family(req: StoryFamilyRequest) -> dict[str, Any]:
    family_id = str(req.family.get("id") or "")
    name = str(req.family.get("name") or "") or "Семья"
    member_count = len(req.persons)
    event_count = len(req.events)

    facts: list[tuple[str, StorySourceRef]] = [
        (f"Семейная ветка: {name}.", StorySourceRef(sourceType="family", sourceId=family_id)),
        (f"Участников в ветке: {member_count}.", StorySourceRef(sourceType="family", sourceId=family_id)),
        (f"Событий, привязанных к семье: {event_count}.", StorySourceRef(sourceType="family", sourceId=family_id)),
    ]
    for person in req.persons[:15]:
        if not isinstance(person, dict):
            continue
        pid = str(person.get("id") or "")
        pname = " ".join(
            [str(person.get("givenName") or ""), str(person.get("familyName") or "")]
        ).strip() or "участник"
        facts.append((f"Участник: {pname}.", StorySourceRef(sourceType="person", sourceId=pid or None)))

    return await _story_from_facts_or_llm(
        feature="story.family",
        language=req.language,
        mode=req.mode,
        title=f"История ветки: {name}",
        facts=facts,
        stub_message="Family story is stubbed. Plug local LLM later.",
        stub_uncertainty=0.45,
        stub_warnings=[
            StoryWarning(
                kind="uncertainty",
                message="Stub-режим: история ветки пока собирается из минимальных фактов. Для полноценного рассказа нужен local-llm.",
            )
        ],
        persons=req.persons,
        events=req.events,
    )


async def story_migration(req: StoryMigrationRequest) -> dict[str, Any]:
    routes = req.map.get("routes") if isinstance(req.map, dict) else None
    route_count = len(routes) if isinstance(routes, list) else 0

    facts: list[tuple[str, StorySourceRef]] = [
        (f"Персон в миграционном анализе: {len(req.person_ids)}.", StorySourceRef(sourceType="system", label="migration")),
        (f"Маршрутов на карте: {route_count}.", StorySourceRef(sourceType="system", label="map")),
    ]
    if isinstance(routes, list):
        for route in routes[:10]:
            if not isinstance(route, dict):
                continue
            label = route.get("label") or route.get("from") or "маршрут"
            facts.append((f"Маршрут: {label}.", StorySourceRef(sourceType="system", label="map-route")))

    return await _story_from_facts_or_llm(
        feature="story.migration",
        language=req.language,
        mode=req.mode,
        title="Рассказ о миграции семьи",
        facts=facts,
        stub_message="Migration story is stubbed. Plug local LLM later.",
        stub_uncertainty=0.6,
        stub_warnings=[
            StoryWarning(
                kind="missing_source",
                message="Stub-режим: нет извлечения причин/эпохи/контекста миграций. Нужен local-llm + нормализация событий миграции.",
            )
        ],
    )


async def story_era_context(req: StoryEraContextRequest) -> dict[str, Any]:
    yf = req.year_from
    yt = req.year_to
    span = f"{yf}–{yt}" if yf and yt else (str(yf) if yf else (str(yt) if yt else "—"))

    facts: list[tuple[str, StorySourceRef]] = [
        (f"Запрошен исторический контекст эпохи: {span}.", StorySourceRef(sourceType="system", label="era-context")),
    ]
    if req.person_id:
        facts.append(
            (
                f"Контекст привязан к персоне: {req.person_id}.",
                StorySourceRef(sourceType="person", sourceId=req.person_id),
            )
        )
    if req.family_id:
        facts.append(
            (
                f"Контекст привязан к семейной ветке: {req.family_id}.",
                StorySourceRef(sourceType="family", sourceId=req.family_id),
            )
        )

    return await _story_from_facts_or_llm(
        feature="story.era-context",
        language=req.language,
        mode=req.mode,
        title=f"Исторический контекст: {span}",
        facts=facts,
        stub_message="Era context is stubbed. Plug local LLM later.",
        stub_uncertainty=0.7,
        stub_warnings=[
            StoryWarning(
                kind="uncertainty",
                message="Stub-режим: без LLM и без внешних источников. При подключении local-llm добавится контекст с явной маркировкой предположений.",
            )
        ],
    )

