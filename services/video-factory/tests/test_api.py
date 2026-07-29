from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from video_factory.api import app
from video_factory.io import load_data


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
