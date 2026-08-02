from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

import video_factory.studio_readiness as studio_readiness
from video_factory import local_jobs
from video_factory.api import app
from video_factory.io import load_data
from video_factory.models import Engine, PipelineResult


def test_api_key_and_two_gate_review_delivery(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(tmp_path / "workspace"))
    monkeypatch.setenv("VIDEO_FACTORY_API_KEY", "test-secret")
    brief = load_data(Path(__file__).parents[1] / "examples/briefs/saas-launch.yaml")
    client = TestClient(app)

    unauthorized = client.post("/v1/briefs/validate", json=brief)
    assert unauthorized.status_code == 401

    headers = {"X-Api-Key": "test-secret"}
    validation = client.post("/v1/briefs/validate", json=brief, headers=headers)
    assert validation.status_code == 200
    assert validation.json()["valid"] is True

    preview = client.post(
        "/v1/runs/sync",
        json={"brief": brief, "dry_run": True},
        headers=headers,
    )
    assert preview.status_code == 200
    payload = preview.json()
    assert payload["status"] == "draft_review_required"
    project_id = payload["project_id"]

    project = client.get(f"/v1/projects/{project_id}", headers=headers)
    assert project.status_code == 200
    assert project.json()["state"]["status"] == "draft_review_required"

    premature_delivery = client.post(
        f"/v1/projects/{project_id}/deliver",
        json={"target": "local"},
        headers=headers,
    )
    assert premature_delivery.status_code == 422

    draft_approval = client.post(
        f"/v1/projects/{project_id}/reviews/draft/approve",
        json={"reviewer": "QA Producer", "notes": "Draft approved"},
        headers=headers,
    )
    assert draft_approval.status_code == 200
    assert draft_approval.json()["stage"] == "draft"
    assert draft_approval.json()["status"] == "approved"

    finalization = client.post(
        f"/v1/projects/{project_id}/finalize",
        headers=headers,
    )
    assert finalization.status_code == 200
    assert finalization.json()["stage"] == "final"
    assert finalization.json()["status"] == "pending"

    premature_delivery = client.post(
        f"/v1/projects/{project_id}/deliver",
        json={"target": "local"},
        headers=headers,
    )
    assert premature_delivery.status_code == 422

    final_approval = client.post(
        f"/v1/projects/{project_id}/reviews/final/approve",
        json={"reviewer": "Final Producer", "notes": "Final approved"},
        headers=headers,
    )
    assert final_approval.status_code == 200
    assert final_approval.json()["stage"] == "final"
    assert final_approval.json()["status"] == "approved"

    delivery = client.post(
        f"/v1/projects/{project_id}/deliver",
        json={"target": "local"},
        headers=headers,
    )
    assert delivery.status_code == 200
    assert len(delivery.json()["items"]) == 3

    completed = client.get(f"/v1/projects/{project_id}", headers=headers)
    assert completed.json()["state"]["status"] == "delivered"


def test_sync_production_is_rejected(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(tmp_path / "workspace"))
    monkeypatch.delenv("VIDEO_FACTORY_API_KEY", raising=False)
    brief = load_data(Path(__file__).parents[1] / "examples/briefs/saas-launch.yaml")
    client = TestClient(app)

    response = client.post(
        "/v1/runs/sync",
        json={"brief": brief, "dry_run": False},
    )
    assert response.status_code == 409


def test_production_preflight_blocks_unavailable_people_runtime_before_queue(
    tmp_path: Path,
    monkeypatch,
) -> None:
    workspace = tmp_path / "workspace"
    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(workspace))
    monkeypatch.setenv("VIDEO_FACTORY_QUEUE_BACKEND", "local")
    monkeypatch.setenv("VIDEO_FACTORY_API_KEY", "test-secret")
    monkeypatch.setattr(
        studio_readiness,
        "engine_availability",
        lambda _settings: {
            engine: engine in {Engine.HYPERFRAMES, Engine.FFMPEG, Engine.PLAYWRIGHT}
            for engine in Engine
        },
    )
    monkeypatch.setattr(
        studio_readiness,
        "engine_catalog_payload",
        lambda _settings: {"ok": True, "profiles": []},
    )
    brief = load_data(Path(__file__).parents[1] / "examples/briefs/saas-launch.yaml")
    brief["requested_shot_kinds"] = ["portrait_animation"]
    brief["rights"]["likeness_consent"] = "granted"

    response = TestClient(app).post(
        "/v1/runs",
        json={"brief": brief, "dry_run": False},
        headers={"X-Api-Key": "test-secret"},
    )

    assert response.status_code == 409
    detail = response.json()["detail"]
    assert detail["message"] == "Studio production preflight failed"
    assert any("portrait_animation" in blocker for blocker in detail["blockers"])
    assert not (workspace / "inbox").exists()


def test_async_run_request_id_is_idempotent(tmp_path: Path, monkeypatch) -> None:
    workspace = tmp_path / "workspace"
    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(workspace))
    monkeypatch.setenv("VIDEO_FACTORY_QUEUE_BACKEND", "local")
    monkeypatch.setenv("VIDEO_FACTORY_API_KEY", "test-secret")
    brief = load_data(Path(__file__).parents[1] / "examples/briefs/saas-launch.yaml")

    def fake_flow(**_kwargs) -> PipelineResult:
        return PipelineResult(
            project_id="hana-idempotent",
            status="draft_review_required",
            workspace=str(workspace / "projects" / "hana-idempotent"),
            manifest_path=str(workspace / "projects" / "hana-idempotent" / "manifest.json"),
        )

    monkeypatch.setattr(local_jobs, "production_flow", fake_flow)
    client = TestClient(app)
    request_id = "c735ae9c-6f99-4d6a-9cdb-ce63c75ef31f"
    payload = {"brief": brief, "request_id": request_id, "dry_run": True}
    headers = {"X-Api-Key": "test-secret"}

    first = client.post("/v1/runs", json=payload, headers=headers)
    replay = client.post("/v1/runs", json=payload, headers=headers)

    assert first.status_code == 200
    assert replay.status_code == 200
    assert first.json()["run_id"] == request_id
    assert replay.json() == {
        "accepted": True,
        "run_id": request_id,
        "backend": "local",
        "idempotent_replay": True,
    }
    assert len(list((workspace / "inbox").glob("*.json"))) == 1


def test_production_api_fails_closed_without_any_internal_key(
    tmp_path: Path,
    monkeypatch,
) -> None:
    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(tmp_path / "workspace"))
    monkeypatch.setenv("VIDEO_FACTORY_ENVIRONMENT", "production")
    for name in (
        "VIDEO_FACTORY_API_KEY",
        "VIDEO_FACTORY_INTERNAL_API_KEY",
        "ADMIN_SCRIPT_SECRET",
        "ADMIN_PASSWORD",
    ):
        monkeypatch.delenv(name, raising=False)

    response = TestClient(app).get("/v1/runs")

    assert response.status_code == 503
