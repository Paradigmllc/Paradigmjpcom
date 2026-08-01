from __future__ import annotations

from fastapi.testclient import TestClient

from video_factory.comfy_proxy import app


def test_proxy_fails_closed_without_configuration(monkeypatch) -> None:
    monkeypatch.delenv("COMFYUI_UPSTREAM_URL", raising=False)
    monkeypatch.delenv("COMFYUI_PROXY_API_KEY", raising=False)
    monkeypatch.delenv("COMFYUI_API_KEY", raising=False)
    response = TestClient(app).get("/proxy/health")
    assert response.status_code == 503


def test_proxy_requires_key_before_upstream_access(monkeypatch) -> None:
    monkeypatch.setenv("COMFYUI_UPSTREAM_URL", "http://127.0.0.1:65534")
    monkeypatch.setenv("COMFYUI_PROXY_API_KEY", "x" * 32)
    response = TestClient(app).get("/system_stats")
    assert response.status_code == 401


def test_proxy_blocks_unapproved_routes(monkeypatch) -> None:
    monkeypatch.setenv("COMFYUI_UPSTREAM_URL", "http://127.0.0.1:65534")
    monkeypatch.setenv("COMFYUI_PROXY_API_KEY", "x" * 32)
    response = TestClient(app).get(
        "/manager/install",
        headers={"X-Api-Key": "x" * 32},
    )
    assert response.status_code == 404
