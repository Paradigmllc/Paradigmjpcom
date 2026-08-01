from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

import video_factory.console_api as console_api
from video_factory.runtime_config import load_runtime_config, update_runtime_config
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
    assert "必要な時だけGPUを稼働" in page.text
    assert "console-gpu-lifecycle.js" in page.text
    assert "主要OSSエンジン" in page.text
    assert "console-projects.js" in page.text
    assert "console-runtime.js" in page.text
    assert "console-engine-catalog.js" in page.text
    assert "console-responsive.css" in page.text
    lifecycle_script = client.get("/console/console-gpu-lifecycle.js")
    assert lifecycle_script.status_code == 200
    assert "catch {" not in lifecycle_script.text
    assert "setInterval" not in lifecycle_script.text
    catalog_script = client.get("/console/console-engine-catalog.js")
    assert catalog_script.status_code == 200
    assert "catch {" not in catalog_script.text
    assert "setInterval" not in catalog_script.text
    assert 'target="_blank" rel="noopener noreferrer"' in catalog_script.text
    for asset in ("console-projects.js", "console-runtime.js"):
        response = client.get(f"/console/{asset}")
        assert response.status_code == 200
        assert "catch {" not in response.text
        assert "setInterval" not in response.text
    responsive_styles = client.get("/console/console-responsive.css")
    assert responsive_styles.status_code == 200
    assert "overflow-x: hidden" in responsive_styles.text

    catalog = client.get("/v1/engine-profiles", headers=_headers())
    assert catalog.status_code == 200
    assert catalog.json()["total"] == 40
    assert any(
        profile["id"] == "ltx-video" and profile["ready"] is False
        for profile in catalog.json()["profiles"]
    )

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

    lifecycle = client.get("/v1/gpu-lifecycle", headers=_headers())
    assert lifecycle.status_code == 200
    assert lifecycle.json()["lifecycle"]["phase"] == "not_checked"


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


def test_console_blocks_duplicate_or_destructive_managed_gpu_actions(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    workspace = tmp_path / "workspace"
    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(workspace))
    monkeypatch.setenv("VIDEO_FACTORY_API_KEY", "factory-test-key")
    update_runtime_config(
        workspace,
        {
            "vast_instance_id": 46258780,
            "gpu_lifecycle_enabled": True,
        },
    )
    client = TestClient(app)

    start = client.post(
        "/v1/vast/instances/46258780/state",
        headers=_headers(),
        json={"state": "running"},
    )
    create = client.post(
        "/v1/vast/instances",
        headers=_headers(),
        json={"offer_id": 123, "template_hash_id": "template-hash"},
    )
    destroy = client.delete(
        "/v1/vast/instances/46258780",
        headers=_headers(),
    )
    monkeypatch.setattr(
        console_api,
        "gpu_lifecycle_status",
        AsyncMock(
            return_value={
                "active_runs": [],
                "active_gpu_leases": ["worker-run"],
            }
        ),
    )
    stop = client.post(
        "/v1/vast/instances/46258780/state",
        headers=_headers(),
        json={"state": "stopped"},
    )

    assert start.status_code == 409
    assert stop.status_code == 409
    assert create.status_code == 409
    assert destroy.status_code == 409


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


def test_console_lists_persisted_run_history(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    workspace = tmp_path / "workspace"
    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(workspace))
    monkeypatch.setenv("VIDEO_FACTORY_API_KEY", "factory-test-key")
    runs = workspace / "runs"
    runs.mkdir(parents=True)
    run_id = "2c9248b4-7758-4002-b6e9-fecb5470686a"
    (runs / f"{run_id}.json").write_text(
        json.dumps(
            {
                "run_id": run_id,
                "status": "completed",
                "created_at": "2026-08-01T00:00:00+00:00",
                "updated_at": "2026-08-01T00:10:00+00:00",
                "brief_path": "/data/video-factory/inbox/brief.json",
                "dry_run": False,
                "planner_provider": "deterministic",
                "auto_approve": False,
                "delivery_target": "local",
                "project_id": "production-readiness",
            }
        ),
        encoding="utf-8",
    )
    client = TestClient(app)

    response = client.get("/v1/runs?limit=10", headers=_headers())

    assert response.status_code == 200
    assert response.json()["runs"][0]["run_id"] == run_id
    assert response.json()["runs"][0]["project_id"] == "production-readiness"


def test_console_lists_profile_progress_and_error_events(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    workspace = tmp_path / "workspace"
    events = workspace / "events"
    events.mkdir(parents=True)
    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(workspace))
    monkeypatch.setenv("VIDEO_FACTORY_API_KEY", "factory-test-key")
    (events / "b4f369fd-dfb4-48ca-9816-6f763912b2d1.json").write_text(
        json.dumps(
            {
                "event_id": "b4f369fd-dfb4-48ca-9816-6f763912b2d1",
                "event_type": "profile_failed",
                "title": "OSSエンジン処理に失敗",
                "message": "安全停止しました。",
                "created_at": "2026-08-01T04:00:00+00:00",
                "profile_id": "ltx-video",
                "project_id": "demo-project",
                "state": "failed",
                "progress": 100,
                "error_message": "worker failed",
                "delivery_state": "delivered",
            }
        ),
        encoding="utf-8",
    )

    response = TestClient(app).get("/v1/engine-events", headers=_headers())

    assert response.status_code == 200
    assert response.json()["events"][0]["profile_id"] == "ltx-video"
    assert response.json()["events"][0]["error_message"] == "worker failed"


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
    assert runtime.vast_instance_id == 9001
    assert runtime.gpu_lifecycle_enabled is True
