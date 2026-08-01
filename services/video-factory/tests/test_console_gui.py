from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import video_factory.console_api as console_api
from video_factory.runtime_config import load_runtime_config
from video_factory.vast import VastClient
from video_factory.web import app


def _headers() -> dict[str, str]:
    return {"X-Api-Key": "factory-test-key"}


def test_console_static_app_and_runtime_secret_masking(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    workspace = tmp_path / "workspace"
    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(workspace))
    monkeypatch.setenv("VIDEO_FACTORY_API_KEY", "factory-test-key")
    client = TestClient(app)

    page = client.get("/console/")
    assert page.status_code == 200
    assert "Paradigm Video Factory" in page.text
    assert "CLIを使わず" in page.text

    registry_page = client.get("/console/registry.html")
    assert registry_page.status_code == 200
    assert 'id="registry-confirm-dialog"' in registry_page.text
    registry_script = client.get("/console/registry.js")
    assert registry_script.status_code == 200
    assert "window.confirm" not in registry_script.text
    assert "catch {" not in registry_script.text
    assert "confirmAction" in registry_script.text

    unauthorized = client.get("/v1/runtime")
    assert unauthorized.status_code == 401

    configured = client.put(
        "/v1/runtime",
        headers=_headers(),
        json={
            "vast_api_key": "vast-secret",
            "vast_template_hash": "template-hash",
            "comfyui_base_url": "https://gpu.example.test:8189",
            "comfyui_api_key": "comfy-secret",
        },
    )
    assert configured.status_code == 200
    serialized = configured.text
    assert "vast-secret" not in serialized
    assert "comfy-secret" not in serialized
    assert configured.json()["runtime"]["vast_api_key_configured"] is True

    status = client.get("/v1/runtime", headers=_headers())
    assert status.status_code == 200
    assert status.json()["effective_comfyui"]["base_url"] == "https://gpu.example.test:8189"


def test_console_rejects_plain_http_comfyui_in_production(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(tmp_path / "workspace"))
    monkeypatch.setenv("VIDEO_FACTORY_API_KEY", "factory-test-key")
    monkeypatch.setenv("VIDEO_FACTORY_ENVIRONMENT", "production")
    client = TestClient(app)

    response = client.put(
        "/v1/runtime",
        headers=_headers(),
        json={"comfyui_base_url": "http://203.0.113.10:48189"},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Production ComfyUI endpoints must use HTTPS"


def test_console_project_catalog_and_protected_artifacts(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    workspace = tmp_path / "workspace"
    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(workspace))
    monkeypatch.setenv("VIDEO_FACTORY_API_KEY", "factory-test-key")
    project = workspace / "projects" / "demo-project"
    master = project / "master"
    master.mkdir(parents=True)
    (project / "state.json").write_text(
        json.dumps(
            {
                "project_id": "demo-project",
                "status": "draft_review_required",
                "updated_at": "2026-07-29T00:00:00+00:00",
            }
        ),
        encoding="utf-8",
    )
    (project / "shot-manifest.json").write_text(
        json.dumps(
            {
                "project_name": "GUI Demo",
                "duration_seconds": 15,
                "deliverables": [],
            }
        ),
        encoding="utf-8",
    )
    (master / "preview.mp4").write_bytes(b"not-a-real-video")
    client = TestClient(app)

    catalog = client.get("/v1/projects", headers=_headers())
    assert catalog.status_code == 200
    assert catalog.json()["projects"][0]["project_id"] == "demo-project"
    assert catalog.json()["projects"][0]["preview"]["path"] == "master/preview.mp4"

    artifacts = client.get(
        "/v1/projects/demo-project/artifacts",
        headers=_headers(),
    )
    assert artifacts.status_code == 200
    assert artifacts.json()["artifacts"][0]["path"] == "master/preview.mp4"

    preview = client.get(
        "/v1/projects/demo-project/files/master/preview.mp4",
        headers=_headers(),
    )
    assert preview.status_code == 200
    assert preview.content == b"not-a-real-video"

    traversal = client.get(
        "/v1/projects/demo-project/files/%2E%2E/%2E%2E/runtime.json",
        headers=_headers(),
    )
    assert traversal.status_code in {404, 422}


def test_console_adopts_managed_vast_instance_without_exposing_proxy_key(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    workspace = tmp_path / "workspace"
    proxy_key = "p" * 64
    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(workspace))
    monkeypatch.setenv("VIDEO_FACTORY_API_KEY", "factory-test-key")

    async def list_instances(_client: VastClient) -> list[dict[str, object]]:
        return [
            {
                "id": 9001,
                "label": "paradigm-comfyui-wan22-test",
                "actual_status": "running",
                "gpu_name": "RTX 4090",
                "public_ipaddr": "203.0.113.10",
                "template_hash_id": "template-hash",
                "jupyter_token": "jupyter-secret",
                "extra_env": [["COMFY_PROXY_KEY", proxy_key]],
                "ports": {"18189/tcp": [{"HostPort": "48189"}]},
            }
        ]

    class ProxyResponse:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, object]:
            return {
                "ready": False,
                "phase": "waiting-for-comfyui",
                "detail": "ComfyUI is starting",
            }

    class ProxyClient:
        def __init__(self, **_kwargs: object) -> None:
            pass

        async def __aenter__(self) -> ProxyClient:
            return self

        async def __aexit__(
            self,
            _exc_type: object,
            _exc: object,
            _traceback: object,
        ) -> None:
            return None

        async def get(self, url: str) -> ProxyResponse:
            assert url == "https://203.0.113.10:48189/__video_factory/status"
            return ProxyResponse()

    monkeypatch.setattr(VastClient, "list_instances", list_instances)
    monkeypatch.setattr(console_api.httpx, "AsyncClient", ProxyClient)
    client = TestClient(app)

    response = client.post("/v1/vast/instances/9001/adopt", headers=_headers())

    assert response.status_code == 200
    serialized = response.text
    assert proxy_key not in serialized
    assert "jupyter-secret" not in serialized
    assert response.json()["runtime"]["comfyui_api_key_configured"] is True
    assert response.json()["provisioning"]["phase"] == "waiting-for-comfyui"
    runtime = load_runtime_config(workspace)
    assert runtime.comfyui_base_url == "https://203.0.113.10:48189"
    assert runtime.comfyui_api_key == proxy_key
