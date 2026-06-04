"""Fact-check generated narratives against Person / Event ground truth."""

from __future__ import annotations

import re
from typing import Any, Literal

from pydantic import BaseModel, Field


class FactCheckIssue(BaseModel):
    code: str
    severity: Literal["error", "warning", "info"] = "warning"
    message: str
    person_id: str | None = Field(default=None, alias="personId")
    field: str | None = None


class FactCheckWarning(BaseModel):
    kind: Literal["uncertainty", "assumption", "missing_source", "fact_mismatch"] = "fact_mismatch"
    message: str


class FactCheckResult(BaseModel):
    score: float = 1.0
    passed: bool = True
    issues: list[FactCheckIssue] = Field(default_factory=list)
    warnings: list[FactCheckWarning] = Field(default_factory=list)


_BIRTH_HINTS = re.compile(
    r"(родил(?:ся|ась)|рожд(?:ение|ения)|born|birth)",
    re.IGNORECASE,
)
_DEATH_HINTS = re.compile(
    r"(умер(?:ла)?|скончал(?:ся|ась)|погиб(?:ла)?|died|death|passed away)",
    re.IGNORECASE,
)
_YEAR_RE = re.compile(r"\b(1[6-9]\d{2}|20\d{2})\b")


def _year_from_value(value: Any) -> int | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    match = _YEAR_RE.search(text)
    return int(match.group(1)) if match else None


def _person_display_name(person: dict[str, Any]) -> str:
    parts = [
        str(person.get("givenName") or "").strip(),
        str(person.get("patronymic") or "").strip(),
        str(person.get("familyName") or "").strip(),
    ]
    return " ".join(p for p in parts if p).strip() or "Персона"


def _contains_token(haystack: str, token: str) -> bool:
    token = token.strip().lower()
    if len(token) < 2:
        return True
    return token in haystack


def _years_near_pattern(text: str, pattern: re.Pattern[str]) -> set[int]:
    years: set[int] = set()
    for match in pattern.finditer(text):
        start = max(0, match.start() - 40)
        end = min(len(text), match.end() + 40)
        window = text[start:end]
        years.update(int(y) for y in _YEAR_RE.findall(window))
    return years


def _issue_to_warning(issue: FactCheckIssue) -> FactCheckWarning:
    kind: Literal["uncertainty", "assumption", "missing_source", "fact_mismatch"] = "fact_mismatch"
    if issue.severity == "info":
        kind = "uncertainty"
    elif issue.code in ("missing_birth_year_in_narrative", "missing_death_year_in_narrative"):
        kind = "assumption"
    return FactCheckWarning(kind=kind, message=issue.message)


def _score_from_issues(issues: list[FactCheckIssue]) -> float:
    score = 1.0
    for issue in issues:
        if issue.severity == "error":
            score -= 0.25
        elif issue.severity == "warning":
            score -= 0.1
        else:
            score -= 0.05
    return max(0.0, min(1.0, round(score, 3)))


def fact_check_narrative(
    narrative: str,
    *,
    persons: list[dict[str, Any]] | None = None,
    events: list[dict[str, Any]] | None = None,
) -> FactCheckResult:
    text = (narrative or "").strip()
    lowered = text.lower()
    issues: list[FactCheckIssue] = []

    if not text:
        return FactCheckResult(
            score=0.0,
            passed=False,
            issues=[FactCheckIssue(code="empty_narrative", severity="warning", message="Текст рассказа пустой.")],
            warnings=[FactCheckWarning(kind="missing_source", message="Текст рассказа пустой — fact-check невозможен.")],
        )

    person_rows = [p for p in (persons or []) if isinstance(p, dict)]
    event_rows = [e for e in (events or []) if isinstance(e, dict)]

    narrative_years = {int(y) for y in _YEAR_RE.findall(text)}

    for person in person_rows:
        person_id = str(person.get("id") or "") or None
        display = _person_display_name(person)
        given = str(person.get("givenName") or "").strip()
        family = str(person.get("familyName") or "").strip()
        birth_year = _year_from_value(person.get("birthDate"))
        death_year = _year_from_value(person.get("deathDate"))
        is_living = person.get("isLiving")

        if given and not _contains_token(lowered, given):
            issues.append(
                FactCheckIssue(
                    code="missing_given_name",
                    severity="warning",
                    message=f"В тексте не найдено имя из Person: «{given}» ({display}).",
                    personId=person_id,
                    field="givenName",
                )
            )
        if family and not _contains_token(lowered, family):
            issues.append(
                FactCheckIssue(
                    code="missing_family_name",
                    severity="info",
                    message=f"В тексте не найдена фамилия из Person: «{family}» ({display}).",
                    personId=person_id,
                    field="familyName",
                )
            )

        if birth_year is not None:
            birth_context_years = _years_near_pattern(text, _BIRTH_HINTS)
            conflicting = {y for y in birth_context_years if y != birth_year}
            if conflicting:
                issues.append(
                    FactCheckIssue(
                        code="birth_year_conflict",
                        severity="error",
                        message=(
                            f"Конфликт даты рождения для {display}: в Person {birth_year}, "
                            f"в тексте рядом с «рожд*»: {sorted(conflicting)}."
                        ),
                        personId=person_id,
                        field="birthDate",
                    )
                )
            elif birth_year not in narrative_years and _BIRTH_HINTS.search(text):
                issues.append(
                    FactCheckIssue(
                        code="missing_birth_year_in_narrative",
                        severity="info",
                        message=f"У {display} в Person указан год рождения {birth_year}, но он не найден в тексте.",
                        personId=person_id,
                        field="birthDate",
                    )
                )

        if is_living is True and _DEATH_HINTS.search(text):
            issues.append(
                FactCheckIssue(
                    code="living_person_death_language",
                    severity="error",
                    message=f"Person {display} помечен как living, но в тексте есть формулировки о смерти.",
                    personId=person_id,
                    field="isLiving",
                )
            )

        if death_year is not None:
            death_context_years = _years_near_pattern(text, _DEATH_HINTS)
            conflicting = {y for y in death_context_years if y != death_year}
            if conflicting:
                issues.append(
                    FactCheckIssue(
                        code="death_year_conflict",
                        severity="error",
                        message=(
                            f"Конфликт даты смерти для {display}: в Person {death_year}, "
                            f"в тексте рядом с «умер*»: {sorted(conflicting)}."
                        ),
                        personId=person_id,
                        field="deathDate",
                    )
                )
            elif death_year not in narrative_years and _DEATH_HINTS.search(text):
                issues.append(
                    FactCheckIssue(
                        code="missing_death_year_in_narrative",
                        severity="info",
                        message=f"У {display} в Person указан год смерти {death_year}, но он не найден в тексте.",
                        personId=person_id,
                        field="deathDate",
                    )
                )
        elif is_living is False and birth_year is not None and narrative_years:
            upper = max(narrative_years)
            if upper < birth_year:
                issues.append(
                    FactCheckIssue(
                        code="timeline_year_before_birth",
                        severity="warning",
                        message=f"В тексте есть год {upper}, который раньше рождения {display} ({birth_year}).",
                        personId=person_id,
                        field="birthDate",
                    )
                )

    known_event_years: set[int] = set()
    for event in event_rows:
        for key in ("dateFrom", "dateTo", "date", "sortDate"):
            year = _year_from_value(event.get(key))
            if year is not None:
                known_event_years.add(year)

    if known_event_years and narrative_years:
        unknown = sorted(y for y in narrative_years if y not in known_event_years)
        if len(unknown) >= 3:
            issues.append(
                FactCheckIssue(
                    code="unknown_timeline_years",
                    severity="warning",
                    message=f"В тексте есть годы, которых нет в timeline/events: {unknown[:8]}.",
                    field="timeline",
                )
            )

    score = _score_from_issues(issues)
    passed = not any(i.severity == "error" for i in issues)
    warnings = [_issue_to_warning(i) for i in issues if i.severity in ("error", "warning")]
    return FactCheckResult(score=score, passed=passed, issues=issues, warnings=warnings)


def apply_fact_check_to_claims(claims: list[Any], result: FactCheckResult) -> list[Any]:
    if not result.issues:
        return claims
    note = "; ".join(i.message for i in result.issues[:4])
    updated: list[Any] = []
    for claim in claims:
        if getattr(claim, "is_assumption", False) or (isinstance(claim, dict) and claim.get("isAssumption")):
            if hasattr(claim, "model_copy"):
                updated.append(
                    claim.model_copy(
                        update={
                            "uncertainty": max(getattr(claim, "uncertainty", 0.0) or 0.0, 1.0 - result.score),
                            "uncertaintyNote": getattr(claim, "uncertainty_note", None) or note[:240],
                        }
                    )
                )
            else:
                updated.append(claim)
        else:
            updated.append(claim)
    return updated
