from __future__ import annotations

import time
from pathlib import Path

import pytest

from video_factory import local_jobs
from video_factory.local_jobs import (
    load_local_job,
    reconcile_interrupted_local_jobs,
    submit_local_job,
)
from video_factory.models import PipelineResult
from video_factory.settings import Settings


def test_local_queue_persists_completion(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    workspace = tmp_path / "workspace"
    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(workspace))
    monkeypatch.setenv("VIDEO_FACTORY_QUEUE_BACKEND", "local")
    monkeypatch.setenv("VIDEO_FACTORY_LOCAL_QUEUE_WORKERS", "1")
    settings = Settings.from_env()
    brief_path = workspace / "inbox" / "brief.json"
    brief_path.parent.mkdir(parents=True)
    brief_path.write_text("{}\n", encoding="utf-8")

    def fake_flow(**_kwargs) -> PipelineResult:
        return PipelineResult(
            project_id="queued-project",
            status="draft_review_required",
            workspace=str(workspace / "projects" / "queued-project"),
            manifest_path=str(workspace / "projects" / "queued-project" / "manifest.json"),
        )

    monkeypatch.setattr(local_jobs, "production_flow", fake_flow)
    job = submit_local_job(
        settings,
        brief_path=brief_path,
        dry_run=False,
        planner_provider="deterministic",
        auto_approve=False,
        delivery_target="local",
    )

    loaded = None
    for _ in range(100):
        loaded = load_local_job(settings, job.run_id)
        if loaded and loaded.status in {"completed", "failed"}:
            break
        time.sleep(0.01)

    assert loaded is not None
    assert loaded.status == "completed"
    assert loaded.project_id == "queued-project"
    assert loaded.result is not None
    assert loaded.result["status"] == "draft_review_required"


def test_queue_settings_are_validated(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(tmp_path / "workspace"))
    monkeypatch.setenv("VIDEO_FACTORY_QUEUE_BACKEND", "invalid")

    with pytest.raises(ValueError, match="QUEUE_BACKEND"):
        Settings.from_env()


def test_startup_reconciliation_marks_interrupted_jobs_failed(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    workspace = tmp_path / "workspace"
    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(workspace))
    settings = Settings.from_env()
    runs = workspace / "runs"
    runs.mkdir(parents=True)
    run_id = "e8a2743a-4c93-460d-a5e4-b3cf56fdca8b"
    (runs / f"{run_id}.json").write_text(
        """{
  "run_id": "e8a2743a-4c93-460d-a5e4-b3cf56fdca8b",
  "status": "running",
  "created_at": "2026-08-01T00:00:00+00:00",
  "updated_at": "2026-08-01T00:01:00+00:00",
  "brief_path": "/data/video-factory/inbox/brief.json",
  "dry_run": false,
  "planner_provider": "deterministic",
  "auto_approve": false,
  "delivery_target": "local"
}
""",
        encoding="utf-8",
    )

    interrupted = reconcile_interrupted_local_jobs(settings)
    loaded = load_local_job(settings, run_id)

    assert len(interrupted) == 1
    assert loaded is not None
    assert loaded.status == "failed"
    assert loaded.error is not None
    assert "restarted" in loaded.error
