"""Ask Archive — grounded narrative with strict citations (Ollama)."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from app.local_llm import generate_narrative


class AskArchiveCitation(BaseModel):
    source_type: str = Field(alias="sourceType")
    entity_id: str = Field(alias="entityId")
    title: str
    excerpt: str
    deep_link: str = Field(alias="deepLink")
    confidence: float = 0.7

    class Config:
        populate_by_name = True


class AskArchiveNarrativeRequest(BaseModel):
    question: str
    language: str = "ru"
    citations: list[AskArchiveCitation] = Field(default_factory=list)


async def ask_archive_narrative(payload: AskArchiveNarrativeRequest) -> dict[str, Any]:
    """Synthesize answer from citations only — LLM must not invent facts."""
    if not payload.citations:
        return {
            "ok": False,
            "answer": "",
            "engine": None,
            "message": "No citations supplied",
        }

    facts: list[str] = []
    for i, c in enumerate(payload.citations[:12], start=1):
        facts.append(
            f"[{i}] ({c.source_type}/{c.entity_id}) {c.title}: {c.excerpt[:400]}"
        )

    extra = (
        f"User question: {payload.question}\n\n"
        "Rules: Answer ONLY using the numbered sources above. "
        "Cite sources inline as [1], [2], etc. "
        "If sources do not answer the question, say so explicitly. "
        "Mark uncertain claims with [uncertainty]. "
        "Do not mention living persons by full name unless present in sources."
    )

    llm = await generate_narrative(
        language=payload.language,
        mode="archive",
        title=f"Archive Q: {payload.question[:120]}",
        facts=facts,
        extra_context=extra,
    )

    if llm.get("ok") and llm.get("narrative"):
        return {
            "ok": True,
            "answer": llm["narrative"],
            "engine": llm.get("engine"),
            "model": llm.get("model"),
            "message": None,
        }

    # Deterministic fallback when LLM unavailable
    bullets = "\n".join(f"- {c.title}: {c.excerpt[:180]}" for c in payload.citations[:8])
    lang = (payload.language or "ru").lower()
    if lang.startswith("en"):
        answer = (
            f"Based on {len(payload.citations)} archive source(s) for «{payload.question}»:\n"
            f"{bullets}\n\n[uncertainty] Verify against original documents."
        )
    else:
        answer = (
            f"По {len(payload.citations)} источник(ам) архива по запросу «{payload.question}»:\n"
            f"{bullets}\n\n[uncertainty] Проверьте по оригинальным документам."
        )

    return {
        "ok": False,
        "answer": answer,
        "engine": llm.get("engine"),
        "message": llm.get("message") or "LLM unavailable — keyword fallback used",
    }
