from __future__ import annotations

from urllib.parse import urlparse


def allowed_pet_movie_download_url(value: str) -> bool:
    parsed = urlparse(value)
    host = (parsed.hostname or "").lower()
    return parsed.scheme == "https" and host.endswith(".r2.cloudflarestorage.com")


def pet_movie_deliverables(plan: str, locale: str) -> list[dict[str, object]]:
    items: list[dict[str, object]] = [
        {"name": "vertical-1080p", "language": locale, "aspect_ratio": "9:16", "width": 1080, "height": 1920, "fps": 30, "format": "mp4"}
    ]
    if plan in {"story", "cinema"}:
        items.append({"name": "landscape-1080p", "language": locale, "aspect_ratio": "16:9", "width": 1920, "height": 1080, "fps": 30, "format": "mp4"})
    if plan == "cinema":
        items.append({"name": "square-1080p", "language": locale, "aspect_ratio": "1:1", "width": 1080, "height": 1080, "fps": 30, "format": "mp4"})
    return items
