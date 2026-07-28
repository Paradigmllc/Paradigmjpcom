from __future__ import annotations

import json
from pathlib import Path

import httpx

from video_factory.frameio import upload_frameio_file


def test_frameio_multipart_upload(tmp_path: Path) -> None:
    source = tmp_path / "review.mp4"
    source.write_bytes(b"abcdefghij")
    uploaded: list[bytes] = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "POST":
            payload = json.loads(request.content)
            assert payload["data"]["name"] == "review.mp4"
            assert payload["data"]["file_size"] == 10
            assert request.headers["authorization"] == "Bearer token"
            return httpx.Response(
                201,
                json={
                    "data": {
                        "media_type": "video/mp4",
                        "view_url": "https://next.frame.io/view/file-id",
                        "upload_urls": [
                            {"size": 4, "url": "https://upload.test/part-1"},
                            {"size": 6, "url": "https://upload.test/part-2"},
                        ],
                    }
                },
            )
        assert request.method == "PUT"
        assert request.headers["x-amz-acl"] == "private"
        assert request.headers["content-type"] == "video/mp4"
        uploaded.append(request.content)
        return httpx.Response(200)

    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        view_url = upload_frameio_file(
            source,
            access_token="token",
            create_file_url="https://api.frame.io/v4/create-local",
            client=client,
        )

    assert view_url == "https://next.frame.io/view/file-id"
    assert uploaded == [b"abcd", b"efghij"]
