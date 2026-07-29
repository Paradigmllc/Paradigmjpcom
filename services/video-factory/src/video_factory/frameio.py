from __future__ import annotations

import mimetypes
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

import httpx


class FrameIOError(RuntimeError):
    pass


def _response_data(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict) or not isinstance(payload.get("data"), dict):
        raise FrameIOError("Frame.io returned an unexpected response")
    return payload["data"]


def upload_frameio_file(
    path: Path,
    *,
    access_token: str,
    create_file_url: str,
    api_base_url: str = "https://api.frame.io",
    timeout_seconds: float = 300.0,
    client: httpx.Client | None = None,
) -> str:
    """Upload one local file through Frame.io V4 pre-signed part URLs."""
    if not path.is_file():
        raise FrameIOError(f"Delivery file does not exist: {path}")
    if not access_token or not create_file_url:
        raise FrameIOError("Frame.io access token and create-file URL are required")

    owns_client = client is None
    http = client or httpx.Client(timeout=httpx.Timeout(timeout_seconds))
    try:
        create_url = (
            create_file_url
            if create_file_url.startswith(("http://", "https://"))
            else urljoin(api_base_url.rstrip("/") + "/", create_file_url.lstrip("/"))
        )
        response = http.post(
            create_url,
            headers={"Authorization": f"Bearer {access_token}"},
            json={"data": {"name": path.name, "file_size": path.stat().st_size}},
        )
        response.raise_for_status()
        data = _response_data(response.json())
        upload_urls = data.get("upload_urls")
        if not isinstance(upload_urls, list) or not upload_urls:
            raise FrameIOError("Frame.io did not return upload URLs")

        content_type = str(
            data.get("media_type")
            or mimetypes.guess_type(path.name)[0]
            or "application/octet-stream"
        )
        with path.open("rb") as handle:
            for part in upload_urls:
                if not isinstance(part, dict) or not part.get("url"):
                    raise FrameIOError("Frame.io returned an invalid upload part")
                expected_size = int(part.get("size") or 0)
                chunk = handle.read(expected_size) if expected_size > 0 else handle.read()
                if expected_size > 0 and len(chunk) != expected_size:
                    raise FrameIOError("Frame.io upload-part sizes do not match the source file")
                upload = http.put(
                    str(part["url"]),
                    content=chunk,
                    headers={"content-type": content_type, "x-amz-acl": "private"},
                )
                upload.raise_for_status()
            if handle.read(1):
                raise FrameIOError(
                    "Frame.io upload URLs did not cover the complete source file"
                )

        view_url = data.get("view_url")
        if not isinstance(view_url, str) or not view_url:
            raise FrameIOError("Frame.io did not return a review URL")
        return view_url
    finally:
        if owns_client:
            http.close()
