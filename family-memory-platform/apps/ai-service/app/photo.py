"""Photo intelligence — MediaPipe face detection and metadata heuristics."""

from __future__ import annotations

import io
from typing import Any

import httpx
import numpy as np
from PIL import Image
from pydantic import BaseModel, Field

try:
    import mediapipe as mp
except ImportError:  # pragma: no cover
    mp = None  # type: ignore


class PhotoImageRequest(BaseModel):
    media_id: str | None = Field(default=None, alias="mediaId")
    image_url: str = Field(alias="imageUrl")
    taken_at: str | None = Field(default=None, alias="takenAt")


class PhotoSuggestRequest(PhotoImageRequest):
    face_tag_id: str | None = Field(default=None, alias="faceTagId")
    photo_year: int | None = Field(default=None, alias="photoYear")
    candidates: list[dict[str, Any]] = Field(default_factory=list)


async def fetch_image_bytes(image_url: str) -> tuple[np.ndarray, int, int]:
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.get(image_url)
        response.raise_for_status()
        raw = response.content

    image = Image.open(io.BytesIO(raw)).convert("RGB")
    width, height = image.size
    array = np.asarray(image)
    return array, width, height


def detect_faces_mediapipe(image: np.ndarray, width: int, height: int) -> list[dict[str, Any]]:
    if mp is None:
        return []

    mp_face = mp.solutions.face_detection
    faces: list[dict[str, Any]] = []

    with mp_face.FaceDetection(model_selection=1, min_detection_confidence=0.45) as detector:
        results = detector.process(image)
        if not results.detections:
            return faces

        for index, detection in enumerate(results.detections):
            box = detection.location_data.relative_bounding_box
            x = max(0.0, min(1.0, float(box.xmin)))
            y = max(0.0, min(1.0, float(box.ymin)))
            w = max(0.01, min(1.0 - x, float(box.width)))
            h = max(0.01, min(1.0 - y, float(box.height)))
            confidence = float(detection.score[0]) if detection.score else 0.5
            faces.append(
                {
                    "x": x,
                    "y": y,
                    "width": w,
                    "height": h,
                    "confidence": confidence,
                    "label": f"Face {index + 1}",
                }
            )

    return faces


def estimate_period(taken_at: str | None) -> dict[str, Any]:
    if taken_at and len(taken_at) >= 4:
        try:
            year = int(taken_at[:4])
            return {
                "estimatedYearFrom": year,
                "estimatedYearTo": year,
                "uncertaintyNotes": "Derived from media takenAt metadata.",
            }
        except ValueError:
            pass
    return {
        "estimatedYearFrom": None,
        "estimatedYearTo": None,
        "uncertaintyNotes": "Photo year unknown — add takenAt or confirm manually.",
    }


def extract_context_stub(width: int, height: int) -> dict[str, Any]:
    orientation = "portrait" if height >= width else "landscape"
    return {
        "detectedObjects": ["person", "photograph"],
        "detectedClothingStyle": None,
        "aiDescription": f"Family photograph ({orientation}, {width}x{height}).",
        "uncertaintyNotes": "Context extraction uses lightweight heuristics in MVP.",
    }


def suggest_person_matches(payload: PhotoSuggestRequest) -> list[dict[str, Any]]:
    suggestions: list[dict[str, Any]] = []
    photo_year = payload.photo_year

    for candidate in payload.candidates:
        person_id = candidate.get("personId") or candidate.get("id")
        if not person_id:
            continue

        birth_year = candidate.get("birthYear")
        death_year = candidate.get("deathYear")
        confidence = 0.35
        reasons: list[str] = []

        if candidate.get("hasAvatar"):
            confidence += 0.2
            reasons.append("has_avatar")

        if photo_year and birth_year and photo_year < int(birth_year) - 2:
            confidence -= 0.25
            reasons.append("born_after_photo")
        elif photo_year and death_year and photo_year > int(death_year) + 2:
            confidence -= 0.25
            reasons.append("died_before_photo")
        elif photo_year and birth_year:
            confidence += 0.25
            reasons.append("lifespan_overlap")

        suggestions.append(
            {
                "personId": person_id,
                "givenName": candidate.get("givenName", ""),
                "familyName": candidate.get("familyName"),
                "patronymic": candidate.get("patronymic"),
                "confidence": max(0.05, min(0.98, confidence)),
                "reasons": reasons or ["candidate_pool"],
            }
        )

    suggestions.sort(key=lambda item: item["confidence"], reverse=True)
    return suggestions[:8]
