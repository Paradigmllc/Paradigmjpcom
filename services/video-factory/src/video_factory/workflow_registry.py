from __future__ import annotations

import json
import os
import shutil
from datetime import UTC, datetime
from enum import StrEnum
from pathlib import Path
from typing import Any

import httpx
import yaml
from pydantic import BaseModel, ConfigDict, Field, model_validator

from .io import file_sha256


class WorkflowRisk(StrEnum):
    STANDARD = "standard"
    RESTRICTED = "restricted"


class WorkflowApproval(StrEnum):
    APPROVED_CONTRACT = "approved_contract"
    APPROVED_BOUND = "approved_bound"
    DISABLED = "disabled"


class WorkflowContract(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(pattern=r"^[a-z0-9][a-z0-9-]{2,79}$")
    version: str = Field(min_length=1, max_length=40)
    purpose: str = Field(min_length=5, max_length=500)
    media_kind: str = Field(min_length=2, max_length=80)
    approval: WorkflowApproval
    enabled: bool = False
    risk: WorkflowRisk = WorkflowRisk.STANDARD
    workflow_file: str | None = None
    workflow_sha256: str | None = Field(default=None, pattern=r"^[a-f0-9]{64}$")
    required_nodes: list[str] = Field(default_factory=list)
    required_models: list[str] = Field(default_factory=list)
    model_bindings: dict[str, str] = Field(default_factory=dict)
    required_rights: list[str] = Field(default_factory=list)
    output_node_id: str | None = None
    reviewed_by: str | None = None
    reviewed_at: str | None = None
    bound_profile: str | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def enabled_requires_bound_approval(self) -> WorkflowContract:
        if self.enabled and self.approval is not WorkflowApproval.APPROVED_BOUND:
            raise ValueError("enabled workflows must have approved_bound status")
        if self.approval is WorkflowApproval.APPROVED_BOUND:
            missing = [
                name
                for name, value in {
                    "workflow_file": self.workflow_file,
                    "workflow_sha256": self.workflow_sha256,
                    "reviewed_by": self.reviewed_by,
                    "reviewed_at": self.reviewed_at,
                    "bound_profile": self.bound_profile,
                }.items()
                if not value
            ]
            if missing:
                raise ValueError(
                    "approved_bound workflows require: " + ", ".join(missing)
                )
        if self.risk is WorkflowRisk.RESTRICTED and not self.required_rights:
            raise ValueError("restricted workflows must declare required_rights")
        return self


class WorkflowRegistry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: int = Field(ge=1)
    workflows: list[WorkflowContract] = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def unique_ids(self) -> WorkflowRegistry:
        ids = [item.id for item in self.workflows]
        if len(ids) != len(set(ids)):
            raise ValueError("workflow ids must be unique")
        return self

    def get(self, workflow_id: str) -> WorkflowContract:
        for workflow in self.workflows:
            if workflow.id == workflow_id:
                return workflow
        raise KeyError(f"Unknown ComfyUI workflow contract: {workflow_id}")


def load_workflow_registry(path: str | Path) -> WorkflowRegistry:
    source = Path(path)
    data = yaml.safe_load(source.read_text(encoding="utf-8"))
    return WorkflowRegistry.model_validate(data)


def write_workflow_registry(path: str | Path, registry: WorkflowRegistry) -> Path:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix(f"{target.suffix}.tmp")
    temporary.write_text(
        yaml.safe_dump(
            registry.model_dump(mode="json", exclude_none=True),
            sort_keys=False,
            allow_unicode=True,
        ),
        encoding="utf-8",
    )
    os.replace(temporary, target)
    return target


def _safe_workflow_path(root: Path, value: str) -> Path:
    candidate = (root / value).resolve()
    resolved_root = root.resolve()
    if candidate != resolved_root and resolved_root not in candidate.parents:
        raise ValueError(f"Workflow file escapes workflow root: {value}")
    return candidate


def validate_api_workflow_payload(
    payload: object,
    *,
    label: str = "workflow",
) -> dict[str, Any]:
    if not isinstance(payload, dict) or not payload:
        raise ValueError(f"{label} must be a non-empty API-format object")
    if "nodes" in payload or "version" in payload:
        raise ValueError(f"UI-format workflow cannot be executed by the factory: {label}")
    invalid = [
        node_id
        for node_id, node in payload.items()
        if not isinstance(node, dict) or not isinstance(node.get("class_type"), str)
    ]
    if invalid:
        raise ValueError(
            f"Workflow contains non-API nodes ({', '.join(str(item) for item in invalid[:5])})"
        )
    return payload


def workflow_node_types(payload: dict[str, Any]) -> set[str]:
    return {
        str(node["class_type"])
        for node in payload.values()
        if isinstance(node, dict) and isinstance(node.get("class_type"), str)
    }


def load_api_workflow(
    contract: WorkflowContract,
    root: Path,
) -> tuple[Path, dict[str, Any]]:
    if not contract.enabled:
        raise ValueError(f"Workflow is not enabled: {contract.id}")
    if contract.approval is not WorkflowApproval.APPROVED_BOUND:
        raise ValueError(f"Workflow is not approved and bound: {contract.id}")
    if not contract.workflow_file:
        raise ValueError(f"Workflow has no bound file: {contract.id}")
    path = _safe_workflow_path(root, contract.workflow_file)
    if not path.is_file():
        raise FileNotFoundError(f"Workflow file is missing: {path}")
    if not contract.workflow_sha256:
        raise ValueError(f"Workflow has no approved SHA-256: {contract.id}")
    actual_sha256 = file_sha256(path)
    if actual_sha256 != contract.workflow_sha256:
        raise ValueError(
            f"Workflow SHA-256 changed after approval: {contract.id} "
            f"({actual_sha256} != {contract.workflow_sha256})"
        )
    payload = validate_api_workflow_payload(
        json.loads(path.read_text(encoding="utf-8")),
        label=str(path),
    )
    available_nodes = workflow_node_types(payload)
    missing_nodes = sorted(set(contract.required_nodes) - available_nodes)
    if missing_nodes:
        raise ValueError(
            f"Workflow is missing approved nodes for {contract.id}: {', '.join(missing_nodes)}"
        )
    serialized = json.dumps(payload, ensure_ascii=False)
    missing_models = sorted(
        artifact
        for artifact in contract.model_bindings.values()
        if artifact not in serialized
    )
    if missing_models:
        raise ValueError(
            f"Workflow does not reference approved model artifacts for {contract.id}: "
            + ", ".join(missing_models)
        )
    return path, payload


def _auth_headers(api_key: str | None) -> dict[str, str]:
    if not api_key:
        return {}
    return {"Authorization": f"Bearer {api_key}", "X-API-Key": api_key}


def validate_workflow_against_comfyui(
    payload: dict[str, Any],
    *,
    base_url: str,
    api_key: str | None,
    timeout_seconds: float = 15.0,
) -> dict[str, object]:
    node_types = workflow_node_types(payload)
    with httpx.Client(
        base_url=base_url.rstrip("/"),
        timeout=timeout_seconds,
        headers=_auth_headers(api_key),
    ) as client:
        stats_response = client.get("/system_stats")
        stats_response.raise_for_status()
        object_response = client.get("/object_info")
        object_response.raise_for_status()
    object_info = object_response.json()
    if not isinstance(object_info, dict):
        raise ValueError("ComfyUI /object_info did not return an object")
    missing_nodes = sorted(node_types - set(object_info))
    if missing_nodes:
        raise ValueError(
            "ComfyUI endpoint is missing workflow nodes: " + ", ".join(missing_nodes)
        )
    return {
        "reachable": True,
        "node_count": len(node_types),
        "nodes": sorted(node_types),
        "system_stats": stats_response.json(),
    }


def bind_workflow_contract(
    *,
    registry_path: str | Path,
    root: str | Path,
    workflow_id: str,
    source: str | Path,
    reviewed_by: str,
    bound_profile: str,
    model_bindings: dict[str, str],
    base_url: str | None = None,
    api_key: str | None = None,
    verify_endpoint: bool = True,
) -> WorkflowContract:
    registry_file = Path(registry_path)
    workflow_root = Path(root).resolve()
    source_path = Path(source).resolve()
    if not source_path.is_file():
        raise FileNotFoundError(f"Workflow source is missing: {source_path}")
    registry = load_workflow_registry(registry_file)
    contract = registry.get(workflow_id)
    payload = validate_api_workflow_payload(
        json.loads(source_path.read_text(encoding="utf-8")),
        label=str(source_path),
    )
    if verify_endpoint:
        if not base_url:
            raise ValueError(
                "COMFYUI_API_URL is required for endpoint-verified binding"
            )
        validate_workflow_against_comfyui(
            payload,
            base_url=base_url,
            api_key=api_key,
        )
    missing_bindings = sorted(set(contract.required_models) - set(model_bindings))
    if missing_bindings:
        raise ValueError(
            "Model bindings are required for: " + ", ".join(missing_bindings)
        )
    serialized = json.dumps(payload, ensure_ascii=False)
    missing_artifacts = sorted(
        value for value in model_bindings.values() if value not in serialized
    )
    if missing_artifacts:
        raise ValueError(
            "Workflow does not reference bound model artifacts: "
            + ", ".join(missing_artifacts)
        )

    destination_directory = workflow_root / "api"
    destination_directory.mkdir(parents=True, exist_ok=True)
    destination = destination_directory / f"{contract.id}-v{contract.version}.json"
    temporary = destination.with_suffix(".json.tmp")
    shutil.copyfile(source_path, temporary)
    os.replace(temporary, destination)
    relative = destination.relative_to(workflow_root).as_posix()
    node_types = sorted(workflow_node_types(payload))
    bound = contract.model_copy(
        update={
            "approval": WorkflowApproval.APPROVED_BOUND,
            "enabled": True,
            "workflow_file": relative,
            "workflow_sha256": file_sha256(destination),
            "required_nodes": node_types,
            "required_models": sorted(contract.required_models),
            "model_bindings": dict(sorted(model_bindings.items())),
            "reviewed_by": reviewed_by,
            "reviewed_at": datetime.now(UTC).isoformat(),
            "bound_profile": bound_profile,
        }
    )
    workflows = [bound if item.id == workflow_id else item for item in registry.workflows]
    write_workflow_registry(
        registry_file,
        registry.model_copy(update={"workflows": workflows}),
    )
    return bound


def disable_workflow_contract(
    registry_path: str | Path,
    workflow_id: str,
) -> WorkflowContract:
    registry_file = Path(registry_path)
    registry = load_workflow_registry(registry_file)
    contract = registry.get(workflow_id)
    disabled = contract.model_copy(update={"enabled": False})
    workflows = [
        disabled if item.id == workflow_id else item for item in registry.workflows
    ]
    write_workflow_registry(
        registry_file,
        registry.model_copy(update={"workflows": workflows}),
    )
    return disabled


def registry_readiness(registry: WorkflowRegistry, root: Path) -> dict[str, object]:
    items: list[dict[str, object]] = []
    for contract in registry.workflows:
        file_exists = False
        workflow_valid = False
        error: str | None = None
        if contract.workflow_file:
            try:
                path = _safe_workflow_path(root, contract.workflow_file)
                file_exists = path.is_file()
                if contract.enabled:
                    load_api_workflow(contract, root)
                    workflow_valid = True
            except (ValueError, FileNotFoundError, json.JSONDecodeError) as exc:
                error = str(exc)
        items.append(
            {
                "id": contract.id,
                "approval": contract.approval.value,
                "enabled": contract.enabled,
                "risk": contract.risk.value,
                "workflow_file": contract.workflow_file,
                "workflow_sha256": contract.workflow_sha256,
                "file_exists": file_exists,
                "workflow_valid": workflow_valid,
                "required_nodes": contract.required_nodes,
                "required_models": contract.required_models,
                "model_bindings": contract.model_bindings,
                "reviewed_by": contract.reviewed_by,
                "reviewed_at": contract.reviewed_at,
                "bound_profile": contract.bound_profile,
                "error": error,
            }
        )
    enabled = [item for item in items if item["enabled"]]
    return {
        "total": len(items),
        "approved_contracts": sum(
            item["approval"] == WorkflowApproval.APPROVED_CONTRACT.value
            for item in items
        ),
        "enabled": len(enabled),
        "ready": bool(enabled)
        and all(item["workflow_valid"] for item in enabled),
        "items": items,
    }
