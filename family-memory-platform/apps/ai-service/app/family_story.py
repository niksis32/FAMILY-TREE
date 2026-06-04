from typing import Any

from pydantic import BaseModel, Field

from app.local_llm import generate_narrative, llm_enabled


class FamilyStoryNarrativeRequest(BaseModel):
    title: str
    language: str = "ru"
    persons: list[dict[str, Any]] = Field(default_factory=list)
    template: str = "classic"


async def family_story_narrative(req: FamilyStoryNarrativeRequest) -> dict[str, Any]:
    names = ", ".join(p.get("name", "—") for p in req.persons[:8]) or "предки"
    facts = [f"Family story title: {req.title}.", f"People in scope: {names}.", f"Template: {req.template}."]
    for person in req.persons[:12]:
        if not isinstance(person, dict):
            continue
        label = person.get("name") or person.get("id") or "person"
        bio = str(person.get("biography") or person.get("notes") or "")[:240]
        if bio:
            facts.append(f"{label}: {bio}")
        else:
            facts.append(f"Person listed: {label}.")

    llm = await generate_narrative(
        language=req.language,
        mode="family_book",
        title=req.title,
        facts=facts,
        extra_context=f"Template style: {req.template}.",
    )

    if llm.get("ok") and llm.get("narrative"):
        return {
            "status": "ok",
            "feature": "family-story.narrative",
            "narrative": llm["narrative"],
            "language": req.language,
            "engine": llm.get("engine"),
            "model": llm.get("model"),
            "message": "Generated via local LLM.",
        }

    narrative = (
        f"«{req.title}» — семейная история, собранная из архивных записей платформы Family Memory. "
        f"В центре повествования: {names}. "
        f"Шаблон оформления: {req.template}. "
        f"Полный LLM-рассказ будет доступен при подключении локальной модели (LOCAL_LLM_ENABLED=true)."
    )
    message = "Narrative is stubbed. Plug local LLM for rich storytelling."
    if llm_enabled():
        message = f"Local LLM unavailable: {llm.get('message') or 'unknown error'}. Using stub narrative."

    return {
        "status": "stub",
        "feature": "family-story.narrative",
        "narrative": narrative,
        "language": req.language,
        "message": message,
    }
