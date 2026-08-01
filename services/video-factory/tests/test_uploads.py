from pathlib import Path

from fastapi.testclient import TestClient

from video_factory.web import app


def test_browser_upload_persists_safe_source_asset(settings) -> None:
    client = TestClient(app)
    response = client.post(
        "/v1/uploads",
        files=[("files", ("../Client Launch 01.mp4", b"synthetic-video", "video/mp4"))],
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["ok"] is True
    assert len(payload["uploads"]) == 1
    uploaded = payload["uploads"][0]
    target = Path(uploaded["path"])
    assert target.is_file()
    assert target.read_bytes() == b"synthetic-video"
    assert target.is_relative_to(settings.workspace / "uploads")
    assert ".." not in target.name
    assert target.suffix == ".mp4"


def test_browser_upload_rejects_unsupported_source_asset(settings) -> None:
    client = TestClient(app)
    response = client.post(
        "/v1/uploads",
        files=[("files", ("payload.exe", b"not-media", "application/octet-stream"))],
    )
    assert response.status_code == 415
    assert "Unsupported source-asset type" in response.text
