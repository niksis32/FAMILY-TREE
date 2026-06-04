"""Global tree matching — hybrid ML-lite scoring (embedding-ready, no external API)."""

from __future__ import annotations

import re
from difflib import SequenceMatcher
from typing import Any

from pydantic import BaseModel, Field


class PersonMatchPayload(BaseModel):
    personId: str | None = None
    givenName: str = ""
    patronymic: str | None = None
    familyName: str | None = None
    birthDate: str | None = None
    deathDate: str | None = None
    places: list[str] = Field(default_factory=list)
    spouseNames: list[str] = Field(default_factory=list)
    parentNames: list[str] = Field(default_factory=list)
    childNames: list[str] = Field(default_factory=list)


class ScorePairRequest(BaseModel):
    source: PersonMatchPayload
    target: PersonMatchPayload


def _norm(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"\s+", " ", value.strip().lower())


def _full_name(p: PersonMatchPayload) -> str:
    return " ".join(filter(None, [_norm(p.givenName), _norm(p.patronymic), _norm(p.familyName)]))


def _year_from_iso(value: str | None) -> int | None:
    if not value:
        return None
    try:
        return int(value[:4])
    except ValueError:
        return None


def _phonetic_token(token: str) -> str:
    """Lightweight phonetic key (Cyrillic/Latin) for MVP — replace with metaphone/embeddings later."""
    t = _norm(token)
    if not t:
        return ""
    repl = (
        ("ё", "е"),
        ("й", "и"),
        ("щ", "ш"),
        ("ъ", ""),
        ("ь", ""),
        ("ph", "f"),
        ("kh", "h"),
    )
    for a, b in repl:
        t = t.replace(a, b)
    return t[:12]


def _name_similarity(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    ratio = SequenceMatcher(None, a, b).ratio()
    pa = _phonetic_token(a.split()[0] if a.split() else a)
    pb = _phonetic_token(b.split()[0] if b.split() else b)
    phonetic = 1.0 if pa and pa == pb else SequenceMatcher(None, pa, pb).ratio() if pa and pb else 0.0
    return min(1.0, ratio * 0.7 + phonetic * 0.3)


def _jaccard(a: list[str], b: list[str]) -> float:
    sa = {_norm(x) for x in a if _norm(x)}
    sb = {_norm(x) for x in b if _norm(x)}
    if not sa or not sb:
        return 0.0
    inter = len(sa & sb)
    union = len(sa | sb)
    return inter / union if union else 0.0


def score_person_pair(payload: ScorePairRequest) -> dict[str, Any]:
    """Refinement layer for global tree matching — complements @family/matching-core heuristic."""
    source = payload.source
    target = payload.target
    reasons: list[dict[str, Any]] = []

    name_sim = _name_similarity(_full_name(source), _full_name(target))
    if name_sim > 0.45:
        reasons.append(
            {
                "type": "ML_NAME_SIMILARITY",
                "weight": round(0.22 * name_sim, 4),
                "explanation": f"Fuzzy name similarity {int(name_sim * 100)}%",
            }
        )

    s_tokens = [_phonetic_token(t) for t in _full_name(source).split() if t]
    t_tokens = [_phonetic_token(t) for t in _full_name(target).split() if t]
    if s_tokens and t_tokens and s_tokens[0] == t_tokens[0]:
        reasons.append(
            {
                "type": "ML_PHONETIC",
                "weight": 0.08,
                "explanation": "Given-name phonetic key matches",
            }
        )

    sy = _year_from_iso(source.birthDate)
    ty = _year_from_iso(target.birthDate)
    if sy and ty:
        diff = abs(sy - ty)
        if diff <= 2:
            reasons.append(
                {
                    "type": "ML_CONTEXT",
                    "weight": 0.1,
                    "explanation": "Birth years within 2 years",
                }
            )
        elif diff <= 8:
            reasons.append(
                {
                    "type": "ML_CONTEXT",
                    "weight": 0.05,
                    "explanation": "Birth years within 8 years",
                }
            )

    family_ctx = (
        _jaccard(source.spouseNames, target.spouseNames)
        + _jaccard(source.parentNames, target.parentNames)
        + _jaccard(source.childNames, target.childNames)
    ) / 3
    if family_ctx > 0.2:
        reasons.append(
            {
                "type": "ML_CONTEXT",
                "weight": round(0.12 * family_ctx, 4),
                "explanation": "Family network overlap (ML context)",
            }
        )

    place_ctx = _jaccard(source.places, target.places)
    if place_ctx > 0.15:
        reasons.append(
            {
                "type": "ML_CONTEXT",
                "weight": round(0.08 * place_ctx, 4),
                "explanation": "Shared places in life events",
            }
        )

    score = min(0.99, sum(r["weight"] for r in reasons))
    return {
        "status": "ok",
        "feature": "matching.score-pair",
        "score": score if score >= 0.35 else 0,
        "reasons": reasons if score >= 0.35 else [],
        "method": "hybrid_ml_lite",
    }
