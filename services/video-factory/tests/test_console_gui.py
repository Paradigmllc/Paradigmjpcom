from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

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
