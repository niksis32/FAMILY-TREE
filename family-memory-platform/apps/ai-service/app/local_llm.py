"""Optional local LLM adapter (Ollama / OpenAI-compatible) for storytelling."""

from __future__ import annotations

import os
from typing import Any, Literal

import httpx

StoryMode = Literal["dry_biography", "artistic", "archive", "family_book"]
LlmProvider = Literal["ollama", "openai_compatible"]


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


def llm_enabled() -> bool:
    return _env_bool("LOCAL_LLM_ENABLED", False)


def llm_provider() -> LlmProvider:
    raw = (os.getenv("LOCAL_LLM_PROVIDER") or "ollama").strip().lower()
    if raw in ("openai", "openai_compatible", "openai-compatible", "vllm"):
        return "openai_compatible"
    return "ollama"


def llm_base_url() -> str:
    default = "http://localhost:11434" if llm_provider() == "ollama" else "http://localhost:8080/v1"
    return (os.getenv("LOCAL_LLM_BASE_URL") or default).rstrip("/")


def llm_model() -> str:
    default = "llama3.2" if llm_provider() == "ollama" else "local-model"
    return (os.getenv("LOCAL_LLM_MODEL") or default).strip()


def llm_timeout_sec() -> float:
    try:
        return float(os.getenv("LOCAL_LLM_TIMEOUT_SEC") or "120")
    except ValueError:
        return 120.0


def llm_max_tokens() -> int:
    try:
        return int(os.getenv("LOCAL_LLM_MAX_TOKENS") or "2048")
    except ValueError:
        return 2048


def llm_config() -> dict[str, Any]:
    return {
        "enabled": llm_enabled(),
        "provider": llm_provider(),
        "baseUrl": llm_base_url(),
        "model": llm_model(),
        "timeoutSec": llm_timeout_sec(),
        "maxTokens": llm_max_tokens(),
    }


async def check_llm_health() -> dict[str, Any]:
    cfg = llm_config()
    if not cfg["enabled"]:
        return {
            "status": "disabled",
            "available": False,
            **cfg,
            "message": "Local LLM is disabled. Set LOCAL_LLM_ENABLED=true and run Ollama or an OpenAI-compatible server.",
        }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            if cfg["provider"] == "ollama":
                response = await client.get(f"{cfg['baseUrl']}/api/tags")
                response.raise_for_status()
                tags = response.json()
                models = [m.get("name") for m in tags.get("models", []) if isinstance(m, dict)]
                model_ready = cfg["model"] in models or any(str(m).startswith(cfg["model"]) for m in models)
                return {
                    "status": "ok" if model_ready else "model_missing",
                    "available": model_ready,
                    **cfg,
                    "models": models[:20],
                    "message": None if model_ready else f"Model '{cfg['model']}' not found in Ollama. Pull it first.",
                }

            response = await client.get(f"{cfg['baseUrl']}/models")
            if response.status_code == 404:
                # Some OpenAI-compatible servers omit /models — treat as reachable.
                return {
                    "status": "ok",
                    "available": True,
                    **cfg,
                    "message": "OpenAI-compatible endpoint reachable (models list not exposed).",
                }
            response.raise_for_status()
            payload = response.json()
            models = [m.get("id") for m in payload.get("data", []) if isinstance(m, dict)]
            model_ready = cfg["model"] in models or not models
            return {
                "status": "ok" if model_ready else "model_missing",
                "available": model_ready,
                **cfg,
                "models": models[:20],
                "message": None if model_ready else f"Model '{cfg['model']}' not listed by provider.",
            }
    except Exception as exc:  # noqa: BLE001
        return {
            "status": "unavailable",
            "available": False,
            **cfg,
            "message": str(exc),
        }


_MODE_INSTRUCTIONS: dict[StoryMode, str] = {
    "dry_biography": "Write a concise factual biography. No invented dates or names.",
    "artistic": "Write an evocative family narrative while keeping all stated facts accurate.",
    "archive": "Write in archival / museum tone, citing facts explicitly.",
    "family_book": "Write warm family-book prose suitable for relatives, grounded in provided facts.",
}


def build_story_system_prompt(*, language: str, mode: StoryMode) -> str:
    lang = (language or "ru").lower()
    lang_label = "Russian" if lang.startswith("ru") else "English"
    mode_hint = _MODE_INSTRUCTIONS.get(mode, _MODE_INSTRUCTIONS["dry_biography"])
    return (
        f"You are a genealogical storyteller for a private family archive. "
        f"Respond in {lang_label}. {mode_hint} "
        "Do not invent people, dates, or places that are not in the supplied facts. "
        "If information is missing, omit it or note uncertainty briefly."
    )


def build_story_user_prompt(*, title: str, facts: list[str], extra_context: str = "") -> str:
    fact_lines = "\n".join(f"- {fact}" for fact in facts if fact.strip())
    parts = [f"Title: {title}", "Verified facts:", fact_lines]
    if extra_context.strip():
        parts.extend(["Additional context:", extra_context.strip()])
    parts.append("Write 2–5 connected paragraphs for the family archive.")
    return "\n\n".join(parts)


async def generate_narrative(
    *,
    language: str,
    mode: StoryMode,
    title: str,
    facts: list[str],
    extra_context: str = "",
) -> dict[str, Any]:
    """Call local LLM. Returns {ok, narrative, engine, message}."""
    if not llm_enabled():
        return {
            "ok": False,
            "narrative": "",
            "engine": None,
            "message": "LOCAL_LLM_ENABLED is false",
        }

    system_prompt = build_story_system_prompt(language=language, mode=mode)
    user_prompt = build_story_user_prompt(title=title, facts=facts, extra_context=extra_context)
    cfg = llm_config()

    try:
        async with httpx.AsyncClient(timeout=llm_timeout_sec()) as client:
            if cfg["provider"] == "ollama":
                response = await client.post(
                    f"{cfg['baseUrl']}/api/chat",
                    json={
                        "model": cfg["model"],
                        "stream": False,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        "options": {"num_predict": cfg["maxTokens"]},
                    },
                )
                response.raise_for_status()
                payload = response.json()
                narrative = str((payload.get("message") or {}).get("content") or "").strip()
            else:
                response = await client.post(
                    f"{cfg['baseUrl']}/chat/completions",
                    json={
                        "model": cfg["model"],
                        "max_tokens": cfg["maxTokens"],
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                    },
                )
                response.raise_for_status()
                payload = response.json()
                choices = payload.get("choices") or []
                narrative = ""
                if choices and isinstance(choices[0], dict):
                    narrative = str(((choices[0].get("message") or {}).get("content")) or "").strip()

        if not narrative:
            return {
                "ok": False,
                "narrative": "",
                "engine": cfg["provider"],
                "message": "Local LLM returned an empty response",
            }

        return {
            "ok": True,
            "narrative": narrative,
            "engine": cfg["provider"],
            "model": cfg["model"],
            "message": None,
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "ok": False,
            "narrative": "",
            "engine": cfg["provider"],
            "message": str(exc),
        }
