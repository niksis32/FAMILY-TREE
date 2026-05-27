from typing import Any

from pydantic import BaseModel, Field


class FamilyStoryNarrativeRequest(BaseModel):
    title: str
    language: str = "ru"
    persons: list[dict[str, Any]] = Field(default_factory=list)
    template: str = "classic"


def family_story_narrative_stub(req: FamilyStoryNarrativeRequest) -> dict[str, Any]:
    names = ", ".join(p.get("name", "—") for p in req.persons[:8]) or "предки"
    narrative = (
        f"«{req.title}» — семейная история, собранная из архивных записей платформы Family Memory. "
        f"В центре повествования: {names}. "
        f"Шаблон оформления: {req.template}. "
        f"Полный LLM-рассказ будет доступен при подключении локальной модели (AI_SERVICE_ENABLED + local-llm)."
    )
    return {
        "status": "stub",
        "feature": "family-story.narrative",
        "narrative": narrative,
        "language": req.language,
        "message": "Narrative is stubbed. Plug local LLM for rich storytelling.",
    }
