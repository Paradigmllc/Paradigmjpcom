from __future__ import annotations

import os
import re
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from .console_api import require_console_api_key
from .settings import Settings

router = APIRouter()

_ALLOWED_SUFFIXES = {
    ".aac",
    ".flac",
    ".gif",
    ".jpeg",
    ".jpg",
    ".m4a",
    ".mkv",
    ".mov",
    ".mp3",
    ".mp4",
    ".png",
    ".svg",
    ".wav",
    ".webm",
    ".webp",
}
_MAX_FILES = 20
_CHUNK_BYTES = 1024 * 1024


def _maximum_upload_bytes() -> int:
    raw = os.getenv("VIDEO_FACTORY_UPLOAD_MAX_BYTES", str(250 * 1024 * 1024))
    try:
        value = int(raw)
    except ValueError as error:
        raise RuntimeError("VIDEO_FACTORY_UPLOAD_MAX_BYTES must be an integer") from error
    return max(1024 * 1024, value)


def _safe_filename(value: str | None) -> str:
    original = Path(value or "asset").name
    stem = re.sub(r"[^A-Za-z0-9._-]+", "-", Path(original).stem).strip(".-_")
    suffix = Path(original).suffix.lower()
    if suffix not in _ALLOWED_SUFFIXES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported source-asset type: {suffix or 'no extension'}",
        )
    return f"{stem[:80] or 'asset'}{suffix}"


@router.post("/v1/uploads", dependencies=[Depends(require_console_api_key)])
async def upload_source_assets(
    files: Annotated[list[UploadFile], File(description="Video, image, or audio assets")],
) -> dict[str, object]:
    if not files:
        raise HTTPException(status_code=422, detail="Select at least one source asset")
    if len(files) > _MAX_FILES:
        raise HTTPException(status_code=422, detail=f"Upload at most {_MAX_FILES} files at once")

    settings = Settings.from_env()
    date_bucket = datetime.now(UTC).strftime("%Y/%m/%d")
    destination_root = settings.workspace / "uploads" / date_bucket
    destination_root.mkdir(parents=True, exist_ok=True)
    maximum_bytes = _maximum_upload_bytes()
    uploaded: list[dict[str, object]] = []

    for source in files:
        safe_name = _safe_filename(source.filename)
        stored_name = f"{uuid.uuid4().hex}-{safe_name}"
        destination = destination_root / stored_name
        temporary = destination.with_suffix(f"{destination.suffix}.part")
        size = 0
        try:
            with temporary.open("wb") as output:
                while chunk := await source.read(_CHUNK_BYTES):
                    size += len(chunk)
                    if size > maximum_bytes:
                        raise HTTPException(
                            status_code=413,
                            detail=(
                                f"{safe_name} exceeds the per-file upload limit "
                                f"of {maximum_bytes // (1024 * 1024)} MB"
                            ),
                        )
                    output.write(chunk)
            os.replace(temporary, destination)
            uploaded.append(
                {
                    "original_name": source.filename or safe_name,
                    "stored_name": stored_name,
                    "path": str(destination.resolve()),
                    "size": size,
                    "content_type": source.content_type or "application/octet-stream",
                }
            )
        except Exception:
            temporary.unlink(missing_ok=True)
            destination.unlink(missing_ok=True)
            raise
        finally:
            await source.close()

    return {"ok": True, "uploads": uploaded}
