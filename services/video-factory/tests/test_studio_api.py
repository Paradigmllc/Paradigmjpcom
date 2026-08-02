from __future__ import annotations

import json
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import video_factory.studio_api as studio_api
from video_factory.models import ClientBrief
from video_factory.planner import deterministic_plan
from video_factory.web import app


def _headers() -> dict[str, str]:
    return {"X-API-Key": "factory-test-key"}


def _create_project(workspace: Path, brief: ClientBrief) -> str:
    manifest = deterministic_plan(brief)
    root = workspace / "projects" / manifest.project_id
    root.mkdir(parents=True)
    (root / "brief.json").write_text(brief.model_dump_json(indent=2), encoding="utf-8")
    (root / "shot-manifest.json").write_text(
        manifest.model_dump_json(indent=2),
        encoding="utf-8",
    )
    (root / "state.json").write_text(
        json.dumps(
            {
                "project_id": manifest.project_id,
                "status": "draft_review_required",
                "updated_at": "2026-08-02T00:00:00+00:00",
                "dry_run": False,
            }
        ),
        encoding="utf-8",
    )
    return manifest.project_id


def test_studio_catalog_and_shot_revision(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    example_brief: ClientBrief,
) -> None:
    workspace = tmp_path / "workspace"
    project_id = _create_project(workspace, example_brief)
    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(workspace))
    monkeypatch.setenv("VIDEO_FACTORY_API_KEY", "factory-test-key")
    client = TestClient(app)

    catalog = client.get("/v1/studio/templates", headers=_headers())
    assert catalog.status_code == 200
    assert len(catalog.json()["templates"]) == 5

    readiness = client.get("/v1/studio/readiness", headers=_headers())
    assert readiness.status_code == 200
    assert len(readiness.json()["capabilities"]) == 10
    assert (
        readiness.json()["ready_capabilities"]
        + readiness.json()["conditional_capabilities"]
        + readiness.json()["blocked_capabilities"]
        == 10
    )

    response = client.patch(
        f"/v1/projects/{project_id}/shots/shot-001",
        headers=_headers(),
        json={
            "language": example_brief.deliverables[0].language,
            "headline": "売上につながる動画を、毎月。",
            "body": "Brand Kitと承認フローを保ったまま量産します。",
            "template_id": "kinetic-type",
            "reviewer": "Paradigm Producer",
        },
    )

    assert response.status_code == 200
    assert response.json()["shot"]["headline"] == "売上につながる動画を、毎月。"
    project = client.get(f"/v1/projects/{project_id}", headers=_headers()).json()
    assert project["state"]["status"] == "production"
    assert project["manifest"]["shots"][0]["template_id"] == "kinetic-type"
    assert project["revisions"][0]["reviewer"] == "Paradigm Producer"


def test_production_rerender_is_queued_with_manifest(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    example_brief: ClientBrief,
) -> None:
    workspace = tmp_path / "workspace"
    project_id = _create_project(workspace, example_brief)
    state_path = workspace / "projects" / project_id / "state.json"
    state = json.loads(state_path.read_text(encoding="utf-8"))
    state["status"] = "production"
    state_path.write_text(json.dumps(state), encoding="utf-8")
    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(workspace))
    monkeypatch.setenv("VIDEO_FACTORY_API_KEY", "factory-test-key")

    def submit(*_args: object, **kwargs: object) -> SimpleNamespace:
        assert kwargs["manifest_path"] == workspace / "projects" / project_id / "shot-manifest.json"
        assert kwargs["rerender_shot_ids"] == ["shot-001"]
        return SimpleNamespace(run_id="2c9248b4-7758-4002-b6e9-fecb5470686a")

    monkeypatch.setattr(studio_api, "submit_local_job", submit)
    response = TestClient(app).post(
        f"/v1/projects/{project_id}/rerender",
        headers=_headers(),
        json={"shot_ids": ["shot-001"], "dry_run": False},
    )

    assert response.status_code == 200
    assert response.json() == {
        "ok": True,
        "accepted": True,
        "run_id": "2c9248b4-7758-4002-b6e9-fecb5470686a",
        "backend": "local",
    }


def test_delivered_project_cannot_be_revised_or_rerendered(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    example_brief: ClientBrief,
) -> None:
    workspace = tmp_path / "workspace"
    project_id = _create_project(workspace, example_brief)
    state_path = workspace / "projects" / project_id / "state.json"
    state = json.loads(state_path.read_text(encoding="utf-8"))
    state["status"] = "delivered"
    state_path.write_text(json.dumps(state), encoding="utf-8")
    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(workspace))
    monkeypatch.setenv("VIDEO_FACTORY_API_KEY", "factory-test-key")
    client = TestClient(app)

    revision = client.patch(
        f"/v1/projects/{project_id}/shots/shot-001",
        headers=_headers(),
        json={"headline": "変更不可", "reviewer": "Paradigm Producer"},
    )
    rerender = client.post(
        f"/v1/projects/{project_id}/rerender",
        headers=_headers(),
        json={"shot_ids": ["shot-001"], "dry_run": False},
    )

    assert revision.status_code == 409
    assert rerender.status_code == 409
    manifest = json.loads(
        (workspace / "projects" / project_id / "shot-manifest.json").read_text(
            encoding="utf-8"
        )
    )
    assert manifest["shots"][0]["headline"] != "変更不可"
