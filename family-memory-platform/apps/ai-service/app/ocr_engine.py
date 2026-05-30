"""Tesseract OCR for document images and PDFs (P2.1)."""

from __future__ import annotations

import io
import shutil
from typing import Any

import httpx
from PIL import Image

try:
    import fitz  # pymupdf
except ImportError:  # pragma: no cover
    fitz = None  # type: ignore

try:
    import pytesseract
except ImportError:  # pragma: no cover
    pytesseract = None  # type: ignore


def tesseract_available() -> bool:
    if pytesseract is None:
        return False
    if shutil.which("tesseract") is None:
        return False
    try:
        pytesseract.get_tesseract_version()
        return True
    except Exception:  # noqa: BLE001
        return False


def tesseract_lang(language: str) -> str:
    lang = (language or "ru").lower().strip()
    if lang in ("ru", "rus", "russian"):
        return "rus+eng"
    if lang in ("en", "eng", "english"):
        return "eng"
    if "+" in lang or len(lang) == 3:
        return lang
    return f"{lang}+eng"


def _is_pdf(content: bytes, mime_type: str | None) -> bool:
    if (mime_type or "").lower() == "application/pdf":
        return True
    return content[:4] == b"%PDF"


def _is_image(content: bytes, mime_type: str | None) -> bool:
    mime = (mime_type or "").lower()
    if mime.startswith("image/"):
        return True
    return content[:3] == b"\xff\xd8\xff" or content[:8] == b"\x89PNG\r\n\x1a\n"


async def fetch_document_bytes(download_url: str) -> bytes:
    async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
        response = await client.get(download_url)
        response.raise_for_status()
        return response.content


def _ocr_image(image: Image.Image, lang: str) -> tuple[str, float]:
    if pytesseract is None:
        raise RuntimeError("pytesseract is not installed")

    data = pytesseract.image_to_data(image, lang=lang, output_type=pytesseract.Output.DICT)
    texts: list[str] = []
    confidences: list[float] = []

    for index, text in enumerate(data["text"]):
        chunk = (text or "").strip()
        if not chunk:
            continue
        texts.append(chunk)
        try:
            conf = float(data["conf"][index])
            if conf >= 0:
                confidences.append(conf)
        except (ValueError, TypeError):
            pass

    full_text = " ".join(texts)
    avg_conf = sum(confidences) / len(confidences) / 100.0 if confidences else 0.0
    return full_text, avg_conf


def _pages_from_image(content: bytes, lang: str) -> list[dict[str, Any]]:
    image = Image.open(io.BytesIO(content))
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")
    text, confidence = _ocr_image(image, lang)
    return [
        {
            "page": 1,
            "blocks": [
                {
                    "blockId": "b1",
                    "text": text,
                    "bbox": None,
                    "confidence": round(confidence, 4),
                }
            ],
        }
    ]


def _pages_from_pdf(content: bytes, lang: str, dpi: int = 200) -> list[dict[str, Any]]:
    if fitz is None:
        raise RuntimeError("pymupdf is not installed")

    pages: list[dict[str, Any]] = []
    doc = fitz.open(stream=content, filetype="pdf")
    try:
        for page_index in range(len(doc)):
            page = doc[page_index]
            pix = page.get_pixmap(dpi=dpi)
            image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
            text, confidence = _ocr_image(image, lang)
            pages.append(
                {
                    "page": page_index + 1,
                    "blocks": [
                        {
                            "blockId": f"p{page_index + 1}-b1",
                            "text": text,
                            "bbox": None,
                            "confidence": round(confidence, 4),
                        }
                    ],
                }
            )
    finally:
        doc.close()
    return pages


def run_ocr_on_bytes(
    content: bytes,
    mime_type: str | None,
    language: str = "ru",
) -> dict[str, Any]:
    if not tesseract_available():
        raise RuntimeError("Tesseract OCR binary is not available")

    lang = tesseract_lang(language)

    if _is_pdf(content, mime_type):
        pages = _pages_from_pdf(content, lang)
    elif _is_image(content, mime_type):
        pages = _pages_from_image(content, lang)
    else:
        raise ValueError(f"Unsupported MIME type for OCR: {mime_type or 'unknown'}")

    confidences: list[float] = []
    for page in pages:
        for block in page.get("blocks", []):
            conf = block.get("confidence")
            if isinstance(conf, (int, float)) and conf > 0:
                confidences.append(float(conf))

    return {
        "pages": pages,
        "engine": "tesseract",
        "language": lang,
        "averageConfidence": round(sum(confidences) / len(confidences), 4) if confidences else 0.0,
    }


async def run_ocr_from_url(
    download_url: str,
    mime_type: str | None,
    language: str = "ru",
) -> dict[str, Any]:
    content = await fetch_document_bytes(download_url)
    return run_ocr_on_bytes(content, mime_type, language)
