from __future__ import annotations

import json
from pathlib import Path

import pytest
import yaml

from video_factory.io import file_sha256
from video_factory.workflow_registry import (
    WorkflowApproval,
    bind_workflow_contract,
    load_api_workflow,
    load_workflow_registry,
    registry_readiness,
)


def _write_registry(
    path: Path,
    workflow_file: str | None,
    *,
    enabled: bool,
    workflow_sha256: str | None = None,
    required_models: list[str] | None = None,
    model_bindings: dict[str, str] | None = None,
) -> None:
    record: dict[str, object] = {
        "id": "approved-test-workflow",
        "version": "1",
        "purpose": "Test approved workflow binding",
        "media_kind": "image",
        "approval": "approved_bound" if enabled else "approved_contract",
        "enabled": enabled,
        "workflow_file": workflow_file,
        "workflow_sha256": workflow_sha256,
        "required_nodes": ["SaveImage"],
        "required_models": required_models or [],
        "model_bindings": model_bindings or {},
        "required_rights": [],
    }
    if enabled:
        record.update(
            {
                "reviewed_by": "Test Reviewer",
                "reviewed_at": "2026-07-29T00:00:00+00:00",
                "bound_profile": "test",
            }
        )
    path.write_text(
        yaml.safe_dump(
            {"version": 1, "workflows": [record]},
            sort_keys=False,
        ),
        encoding="utf-8",
    )


def _workflow_payload(model: str | None = None) -> dict[str, object]:
    inputs: dict[str, object] = {"filename_prefix": "fixture"}
    if model:
        inputs["model"] = model
    return {"1": {"class_type": "SaveImage", "inputs": inputs}}


def test_registry_contract_is_fail_closed_until_bound(tmp_path: Path) -> None:
    root = tmp_path / "workflows"
    root.mkdir()
    registry_path = root / "registry.yaml"
    _write_registry(registry_path, None, enabled=False)

    registry = load_workflow_registry(registry_path)
    contract = registry.get("approved-test-workflow")
    assert contract.approval is WorkflowApproval.APPROVED_CONTRACT
    assert registry_readiness(registry, root)["ready"] is False
    with pytest.raises(ValueError, match="not enabled"):
        load_api_workflow(contract, root)


def test_registry_executes_only_sha_pinned_api_format_inside_root(tmp_path: Path) -> None:
    root = tmp_path / "workflows"
    api = root / "api"
    api.mkdir(parents=True)
    workflow_path = api / "approved.json"
    workflow_path.write_text(json.dumps(_workflow_payload()), encoding="utf-8")
    registry_path = root / "registry.yaml"
    _write_registry(
        registry_path,
        "api/approved.json",
        enabled=True,
        workflow_sha256=file_sha256(workflow_path),
    )

    registry = load_workflow_registry(registry_path)
    contract = registry.get("approved-test-workflow")
    path, payload = load_api_workflow(contract, root)
    assert path == workflow_path
    assert payload["1"]["class_type"] == "SaveImage"
    assert registry_readiness(registry, root)["ready"] is True

    workflow_path.write_text(json.dumps({"2": _workflow_payload()["1"]}), encoding="utf-8")
    with pytest.raises(ValueError, match="SHA-256 changed"):
        load_api_workflow(contract, root)


def test_registry_rejects_ui_format(tmp_path: Path) -> None:
    root = tmp_path / "workflows"
    api = root / "api"
    api.mkdir(parents=True)
    workflow_path = api / "ui.json"
    workflow_path.write_text(
        json.dumps({"nodes": [], "links": [], "version": 1}),
        encoding="utf-8",
    )
    registry_path = root / "registry.yaml"
    _write_registry(
        registry_path,
        "api/ui.json",
        enabled=True,
        workflow_sha256=file_sha256(workflow_path),
    )
    contract = load_workflow_registry(registry_path).get("approved-test-workflow")

    with pytest.raises(ValueError, match="UI-format"):
        load_api_workflow(contract, root)


def test_offline_binding_requires_explicit_model_artifact_and_records_review(
    tmp_path: Path,
) -> None:
    root = tmp_path / "workflows"
    root.mkdir()
    registry_path = root / "registry.yaml"
    _write_registry(
        registry_path,
        None,
        enabled=False,
        required_models=["approved-model-slot"],
    )
    source = tmp_path / "source.json"
    source.write_text(
        json.dumps(_workflow_payload("approved.safetensors")),
        encoding="utf-8",
    )

    bound = bind_workflow_contract(
        registry_path=registry_path,
        root=root,
        workflow_id="approved-test-workflow",
        source=source,
        reviewed_by="Human Reviewer",
        bound_profile="offline-test",
        model_bindings={"approved-model-slot": "approved.safetensors"},
        verify_endpoint=False,
    )

    assert bound.enabled is True
    assert bound.approval is WorkflowApproval.APPROVED_BOUND
    assert bound.workflow_sha256
    assert bound.reviewed_by == "Human Reviewer"
    assert load_api_workflow(bound, root)[0].is_file()
