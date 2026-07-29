from pathlib import Path

import yaml
from fastapi.testclient import TestClient

from video_factory.web import app


def _prepare_registries(
    monkeypatch,
    tmp_path: Path,
    service_root: Path,
) -> tuple[Path, Path]:
    model_path = tmp_path / "config" / "model-registry.yaml"
    workflow_root = tmp_path / "workflows" / "comfyui"
    workflow_path = workflow_root / "registry.yaml"
    model_path.parent.mkdir(parents=True, exist_ok=True)
    workflow_root.mkdir(parents=True, exist_ok=True)
    model_path.write_text("version: 1\nmodels: []\n", encoding="utf-8")
    workflow_path.write_text(
        (service_root / "workflows" / "comfyui" / "registry.yaml").read_text(
            encoding="utf-8"
        ),
        encoding="utf-8",
    )
    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(tmp_path / "workspace"))
    monkeypatch.setenv("VIDEO_FACTORY_MODEL_REGISTRY", str(model_path))
    monkeypatch.setenv("COMFYUI_WORKFLOW_ROOT", str(workflow_root))
    monkeypatch.setenv("COMFYUI_WORKFLOW_REGISTRY", str(workflow_path))
    monkeypatch.delenv("COMFYUI_API_URL", raising=False)
    monkeypatch.delenv("COMFYUI_BASE_URL", raising=False)
    monkeypatch.delenv("VIDEO_FACTORY_API_KEY", raising=False)
    return model_path, workflow_path


def test_registry_gui_registers_audited_model(
    monkeypatch,
    tmp_path: Path,
    service_root: Path,
) -> None:
    model_path, _ = _prepare_registries(monkeypatch, tmp_path, service_root)
    client = TestClient(app)

    page = client.get("/console/registry.html")
    assert page.status_code == 200
    assert "Models &amp; Workflows" in page.text

    status = client.get("/v1/registry")
    assert status.status_code == 200
    assert status.json()["models"]["approved"] == 0

    response = client.post(
        "/v1/registry/models",
        json={
            "id": "wan22-ti2v-5b",
            "engine": "comfyui",
            "model_family": "Wan 2.2 TI2V-5B",
            "exact_artifact": "wan22-ti2v-5b.safetensors",
            "sha256": "a" * 64,
            "code_license": "Apache-2.0",
            "model_license": "Apache-2.0 model card reviewed",
            "commercial_use": "approved",
            "regions": ["JP"],
            "approved_workflows": ["abstract-broll-t2v"],
            "reviewed_by": "Human Reviewer",
            "source_url": "https://example.com/model-card",
            "notes": "Fixture",
            "confirm_license_review": True,
        },
    )
    assert response.status_code == 200, response.text
    payload = yaml.safe_load(model_path.read_text(encoding="utf-8"))
    assert payload["models"][0]["id"] == "wan22-ti2v-5b"
    assert payload["models"][0]["commercial_use"] == "approved"
    assert payload["models"][0]["reviewed_at"]


def test_registry_gui_keeps_workflow_binding_fail_closed_without_comfyui(
    monkeypatch,
    tmp_path: Path,
    service_root: Path,
) -> None:
    _prepare_registries(monkeypatch, tmp_path, service_root)
    client = TestClient(app)

    response = client.post(
        "/v1/registry/workflows/abstract-broll-t2v/bind",
        json={
            "workflow_json": {"1": {"class_type": "SaveImage", "inputs": {}}},
            "reviewed_by": "Human Reviewer",
            "model_bindings": {},
            "confirm_license_review": True,
        },
    )
    assert response.status_code == 422
    assert "ComfyUI endpoint" in response.text
