from __future__ import annotations

from pathlib import Path

import pytest

from video_factory.io import load_data
from video_factory.models import ReviewStage
from video_factory.pipeline import production_flow
from video_factory.review import approve_review, require_approved_review
from video_factory.state import transition_project_state


def test_review_rejects_artifact_changed_after_record_creation(
    example_brief_path: Path, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(tmp_path / "workspace"))
    result = production_flow(str(example_brief_path), dry_run=True)
    draft_path = Path(result.draft_review_path or "")
    master_path = Path(result.master_path or "")
    master_path.write_bytes(master_path.read_bytes() + b"tamper")

    with pytest.raises(ValueError, match="artifacts changed"):
        approve_review(
            draft_path,
            "Producer",
            expected_stage=ReviewStage.DRAFT,
        )


def test_final_review_cannot_be_used_as_draft_review(
    example_brief_path: Path, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(tmp_path / "workspace"))
    result = production_flow(
        str(example_brief_path),
        dry_run=True,
        auto_approve=True,
    )
    with pytest.raises(ValueError, match="Expected draft review"):
        require_approved_review(
            Path(result.final_review_path or ""),
            ReviewStage.DRAFT,
        )


def test_state_transition_rejects_skipping_final_approval(
    example_brief_path: Path, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(tmp_path / "workspace"))
    result = production_flow(str(example_brief_path), dry_run=True)
    state_path = Path(result.workspace) / "state.json"
    assert load_data(state_path)["status"] == "draft_review_required"

    with pytest.raises(ValueError, match="Invalid project state transition"):
        transition_project_state(state_path, "delivered")
