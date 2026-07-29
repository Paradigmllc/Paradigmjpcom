from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from .console_api import require_console_api_key
from .model_registry import (
    ModelCommercialUse,
    ModelRecord,
    assert_model_bindings_approved,
    model_registry_readiness,
    upsert_model_record,
)
from .settings import Settings
from .workflow_registry import (
    bind_workflow_contract,
    disable_workflow_contract,
    load_workflow_registry,
    registry_readiness,
    validate_api_workflow_payload,
)

router = APIRouter()


class ModelRegistrationRequest(BaseModel):
    id: str = Field(pattern=r"^[a-z0-9][a-z0-9-]{2,99}$")
    engine: str = Field(default="comfyui", min_length=2, max_length=40)
    model_family: str = Field(min_length=1, max_length=100)
    exact_artifact: str = Field(min_length=1, max_length=500)
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    code_license: str = Field(min_length=1, max_length=200)
    model_license: str = Field(min_length=1, max_length=500)
    commercial_use: Literal["approved", "pending_review", "prohibited"]
    regions: list[str] = Field(default_factory=list, max_length=100)
    approved_workflows: list[str] = Field(default_factory=list, max_length=100)
    reviewed_by: str | None = Field(default=None, max_length=200)
    source_url: str | None = Field(default=None, max_length=2000)
    notes: str | None = Field(default=None, max_length=4000)
    confirm_license_review: bool = False


class WorkflowBindingRequest(BaseModel):
    workflow_json: dict[str, Any]
    reviewed_by: str = Field(min_length=2, max_length=200)
    model_bindings: dict[str, str] = Field(default_factory=dict, max_length=50)
    confirm_license_review: bool = False


@router.get("/v1/registry", dependencies=[Depends(require_console_api_key)])
def registry_status() -> dict[str, object]:
    settings = Settings.from_env()
    registry = load_workflow_registry(settings.comfyui_workflow_registry)
    contracts = [
        {
            "id": item.id,
            "version": item.version,
            "purpose": item.purpose,
            "media_kind": item.media_kind,
            "risk": item.risk.value,
            "approval": item.approval.value,
            "enabled": item.enabled,
            "required_models": item.required_models,
            "required_rights": item.required_rights,
            "model_bindings": item.model_bindings,
            "reviewed_by": item.reviewed_by,
            "reviewed_at": item.reviewed_at,
            "workflow_sha256": item.workflow_sha256,
            "error": None,
        }
        for item in registry.workflows
    ]
    readiness = registry_readiness(registry, settings.comfyui_workflow_root)
    readiness_by_id = {
        str(item.get("id")): item
        for item in readiness.get("workflows", [])
        if isinstance(item, dict)
    }
    for contract in contracts:
        detail = readiness_by_id.get(str(contract["id"]), {})
        contract["error"] = detail.get("error")
        contract["workflow_valid"] = detail.get("workflow_valid", False)
        contract["file_exists"] = detail.get("file_exists", False)
    return {
        "ok": True,
        "models": model_registry_readiness(settings.model_registry_path),
        "workflows": readiness,
        "contracts": contracts,
        "production_region": settings.production_region,
        "comfyui_configured": bool(settings.comfyui_base_url),
    }


@router.post("/v1/registry/models", dependencies=[Depends(require_console_api_key)])
def register_model(request: ModelRegistrationRequest) -> dict[str, object]:
    settings = Settings.from_env()
    commercial_use = ModelCommercialUse(request.commercial_use)
    if commercial_use is ModelCommercialUse.APPROVED:
        if not request.confirm_license_review:
            raise HTTPException(
                status_code=422,
                detail="Commercial approval requires the license-review confirmation.",
            )
        if not request.reviewed_by:
            raise HTTPException(status_code=422, detail="A human reviewer is required.")
        if not request.approved_workflows:
            raise HTTPException(
                status_code=422,
                detail="At least one approved workflow is required.",
            )

    try:
        record = ModelRecord(
            id=request.id,
            engine=request.engine,
            model_family=request.model_family,
            exact_artifact=request.exact_artifact,
            sha256=request.sha256,
            code_license=request.code_license,
            model_license=request.model_license,
            commercial_use=commercial_use,
            regions=sorted(set(request.regions)),
            approved_workflows=sorted(set(request.approved_workflows)),
            reviewed_by=request.reviewed_by,
            reviewed_at=(
                datetime.now(UTC).isoformat()
                if commercial_use is ModelCommercialUse.APPROVED
                else None
            ),
            source_url=request.source_url,
            notes=request.notes,
        )
        saved = upsert_model_record(settings.model_registry_path, record)
    except (OSError, ValueError) as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return {"ok": True, "model": saved.model_dump(mode="json")}


@router.post(
    "/v1/registry/workflows/{workflow_id}/bind",
    dependencies=[Depends(require_console_api_key)],
)
def bind_workflow(
    workflow_id: str,
    request: WorkflowBindingRequest,
) -> dict[str, object]:
    if not request.confirm_license_review:
        raise HTTPException(
            status_code=422,
            detail="Workflow binding requires the license-review confirmation.",
        )
    settings = Settings.from_env()
    if settings.environment == "production" and not settings.comfyui_base_url:
        raise HTTPException(
            status_code=422,
            detail="Configure the authenticated ComfyUI endpoint before binding.",
        )
    try:
        registry = load_workflow_registry(settings.comfyui_workflow_registry)
        registry.get(workflow_id)
        payload = validate_api_workflow_payload(
            request.workflow_json,
            label=f"GUI workflow {workflow_id}",
        )
        assert_model_bindings_approved(
            request.model_bindings,
            workflow_id=workflow_id,
            registry_path=settings.model_registry_path,
            region=settings.production_region,
        )
        imports = settings.workspace / "workflow-imports"
        imports.mkdir(parents=True, exist_ok=True)
        source = imports / f"{workflow_id}-{uuid.uuid4().hex}.json"
        source.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        bound = bind_workflow_contract(
            registry_path=settings.comfyui_workflow_registry,
            root=settings.comfyui_workflow_root,
            workflow_id=workflow_id,
            source=source,
            reviewed_by=request.reviewed_by,
            bound_profile=settings.comfyui_profile,
            model_bindings=request.model_bindings,
            base_url=settings.comfyui_base_url,
            api_key=settings.comfyui_api_key,
            verify_endpoint=True,
        )
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=502,
            detail=f"ComfyUI endpoint verification failed: {error}",
        ) from error
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    finally:
        if "source" in locals():
            Path(source).unlink(missing_ok=True)
    return {"ok": True, "workflow": bound.model_dump(mode="json")}


@router.post(
    "/v1/registry/workflows/{workflow_id}/disable",
    dependencies=[Depends(require_console_api_key)],
)
def disable_workflow(workflow_id: str) -> dict[str, object]:
    settings = Settings.from_env()
    try:
        disabled = disable_workflow_contract(
            settings.comfyui_workflow_registry,
            workflow_id,
        )
    except (OSError, ValueError, KeyError) as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return {"ok": True, "workflow": disabled.model_dump(mode="json")}
