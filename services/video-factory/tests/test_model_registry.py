from __future__ import annotations

from pathlib import Path

import pytest
import yaml

from video_factory.model_registry import (
    assert_model_bindings_approved,
    load_model_registry,
    model_registry_readiness,
)


def _write_registry(path: Path, *, status: str = "approved") -> None:
    record = {
        "id": "approved-video-model",
        "engine": "comfyui",
        "model_family": "fixture",
        "exact_artifact": "approved-video.safetensors",
        "sha256": "a" * 64 if status == "approved" else "REPLACE_WITH_SHA256",
        "code_license": "Apache-2.0",
        "model_license": "Reviewed fixture license",
        "commercial_use": status,
        "regions": ["JP", "US"],
        "approved_workflows": ["abstract-broll-t2v"],
        "reviewed_by": "Human Reviewer" if status == "approved" else None,
        "reviewed_at": "2026-07-29T00:00:00+00:00" if status == "approved" else None,
    }
    path.write_text(
        yaml.safe_dump({"version": 1, "models": [record]}, sort_keys=False),
        encoding="utf-8",
    )


def test_model_registry_approves_exact_artifact_workflow_and_region(tmp_path: Path) -> None:
    path = tmp_path / "models.yaml"
    _write_registry(path)
    records = assert_model_bindings_approved(
        {"approved-video-checkpoint": "approved-video.safetensors"},
        workflow_id="abstract-broll-t2v",
        registry_path=path,
        region="JP",
    )
    assert records[0].id == "approved-video-model"
    assert model_registry_readiness(path)["ready"] is True


def test_model_registry_rejects_unapproved_region_or_workflow(tmp_path: Path) -> None:
    path = tmp_path / "models.yaml"
    _write_registry(path)
    with pytest.raises(ValueError, match="not approved for region"):
        assert_model_bindings_approved(
            {"slot": "approved-video.safetensors"},
            workflow_id="abstract-broll-t2v",
            registry_path=path,
            region="EU",
        )
    with pytest.raises(ValueError, match="not approved for workflow"):
        assert_model_bindings_approved(
            {"slot": "approved-video.safetensors"},
            workflow_id="unknown-workflow",
            registry_path=path,
            region="JP",
        )


def test_pending_model_registry_remains_fail_closed(tmp_path: Path) -> None:
    path = tmp_path / "models.yaml"
    _write_registry(path, status="pending_review")
    registry = load_model_registry(path)
    assert registry.models[0].commercial_use.value == "pending_review"
    assert model_registry_readiness(path)["ready"] is False
    with pytest.raises(ValueError, match="not commercially approved"):
        assert_model_bindings_approved(
            {"slot": "approved-video.safetensors"},
            workflow_id="abstract-broll-t2v",
            registry_path=path,
            region="JP",
        )
