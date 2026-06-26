"""Speech-to-text — optional Whisper + ffmpeg audio extract from video."""

from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from typing import Any

import httpx

from pydantic import BaseModel, Field


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


def whisper_enabled() -> bool:
    return _env_bool("WHISPER_ENABLED", False)


def ffmpeg_path() -> str:
    return os.getenv("FFMPEG_PATH") or "ffmpeg"


def ffmpeg_available() -> bool:
    return shutil.which(ffmpeg_path()) is not None


class SpeechTranscribeRequest(BaseModel):
    media_id: str | None = Field(default=None, alias="mediaId")
    download_url: str = Field(alias="downloadUrl")
    mime_type: str | None = Field(default=None, alias="mimeType")
    language: str = "ru"

    class Config:
        populate_by_name = True


async def _download_bytes(url: str) -> bytes:
    async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.content


def _extract_audio_wav(input_path: str, output_path: str) -> None:
    cmd = [
        ffmpeg_path(),
        "-y",
        "-i",
        input_path,
        "-vn",
        "-acodec",
        "pcm_s16le",
        "-ar",
        "16000",
        "-ac",
        "1",
        output_path,
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {proc.stderr[:500]}")


def _transcribe_whisper_local(wav_path: str, language: str) -> dict[str, Any]:
    try:
        import whisper  # type: ignore[import-untyped]
    except ImportError as exc:
        raise RuntimeError("openai-whisper not installed — pip install openai-whisper") from exc

    model_name = os.getenv("WHISPER_MODEL") or "base"
    model = whisper.load_model(model_name)
    result = model.transcribe(wav_path, language=language if language != "auto" else None)
    text = str(result.get("text") or "").strip()
    segments_raw = result.get("segments") or []
    segments = [
        {
            "startMs": int(float(seg.get("start", 0)) * 1000),
            "endMs": int(float(seg.get("end", 0)) * 1000),
            "text": str(seg.get("text") or "").strip(),
            "confidence": float(seg.get("avg_logprob", 0)) if seg.get("avg_logprob") is not None else 0.5,
        }
        for seg in segments_raw
        if isinstance(seg, dict)
    ]
    return {"text": text, "segments": segments, "engine": "whisper", "model": model_name}


async def transcribe_media(payload: SpeechTranscribeRequest) -> dict[str, Any]:
    """Download media, optionally extract audio from video, run Whisper or stub."""
    mime = (payload.mime_type or "").lower()
    is_video = mime.startswith("video/")

    try:
        raw = await _download_bytes(payload.download_url)
    except Exception as exc:  # noqa: BLE001
        return {
            "status": "error",
            "feature": "speech.transcribe",
            "message": f"Cannot download media: {exc}",
            "text": "",
            "segments": [],
            "engine": None,
        }

    with tempfile.TemporaryDirectory() as tmp:
        ext = ".mp4" if is_video else ".mp3"
        input_path = os.path.join(tmp, f"input{ext}")
        wav_path = os.path.join(tmp, "audio.wav")

        with open(input_path, "wb") as fh:
            fh.write(raw)

        audio_path = input_path
        if is_video:
            if not ffmpeg_available():
                return {
                    "status": "stub",
                    "feature": "speech.transcribe",
                    "message": "ffmpeg not found — install ffmpeg for video audio extraction",
                    "text": "",
                    "segments": [],
                    "engine": None,
                }
            try:
                _extract_audio_wav(input_path, wav_path)
                audio_path = wav_path
            except Exception as exc:  # noqa: BLE001
                return {
                    "status": "error",
                    "feature": "speech.transcribe",
                    "message": str(exc),
                    "text": "",
                    "segments": [],
                    "engine": None,
                }

        if whisper_enabled():
            try:
                result = _transcribe_whisper_local(audio_path, payload.language)
                return {
                    "status": "ok",
                    "feature": "speech.transcribe",
                    "mediaId": payload.media_id,
                    "text": result["text"],
                    "segments": result["segments"],
                    "engine": result["engine"],
                    "model": result.get("model"),
                    "message": None,
                }
            except Exception as exc:  # noqa: BLE001
                return {
                    "status": "error",
                    "feature": "speech.transcribe",
                    "message": str(exc),
                    "text": "",
                    "segments": [],
                    "engine": "whisper",
                }

        lang = payload.language
        placeholder = (
            "[STT stub — set WHISPER_ENABLED=true and install openai-whisper for real transcription.]"
            if lang == "en"
            else "[STT stub — включите WHISPER_ENABLED=true и установите openai-whisper.]"
        )
        return {
            "status": "stub",
            "feature": "speech.transcribe",
            "mediaId": payload.media_id,
            "text": placeholder,
            "segments": [{"startMs": 0, "endMs": 1000, "text": placeholder, "confidence": 0.2}],
            "engine": "stub",
            "message": "Whisper disabled — enable WHISPER_ENABLED",
        }
