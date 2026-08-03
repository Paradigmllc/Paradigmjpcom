from __future__ import annotations

import json
import mimetypes
from pathlib import Path
from typing import Annotated, Any
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import FileResponse

from .console_models import (
    RuntimeConfigRequest,
    VastCreateInstanceRequest,
    VastInstanceStateRequest,
    VastOfferSearchRequest,
)
from .doctor import doctor_report
from .engine_profile_service import engine_catalog_payload
from .gpu_lifecycle import ensure_gpu_ready, gpu_lifecycle_status, release_gpu_if_idle
from .runtime_config import load_runtime_config, update_runtime_config
from .settings import Settings
from .vast import (
    VastAPIError,
    VastClient,
    VastConfig,
    safe_vast_instance,
    vast_instance_connection,
)

router = APIRouter()

_ALLOWED_ARTIFACT_SUFFIXES = {
    ".json",
    ".txt",
    ".md",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".gif",
    ".mp4",
    ".mov",
    ".webm",
    ".wav",
    ".mp3",
    ".vtt",
    ".srt",
}


def require_console_api_key(
    x_api_key: Annotated[str | None, Header()] = None,
) -> None:
    settings = Settings.from_env()
    configured = settings.api_key
    if not configured and settings.environment == "production":
        raise HTTPException(status_code=503, detail="Video Factory API key is not configured")
    if configured and x_api_key != configured:
        raise HTTPException(status_code=401, detail="Invalid API key")


def _read_json(path: Path) -> Any | None:
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def _project_root(settings: Settings, project_id: str) -> Path:
    if not project_id or any(
        character not in "abcdefghijklmnopqrstuvwxyz0123456789-" for character in project_id
    ):
        raise HTTPException(status_code=422, detail="Invalid project ID")
    root = (settings.workspace / "projects" / project_id).resolve()
    projects_root = (settings.workspace / "projects").resolve()
    if not root.is_relative_to(projects_root):
        raise HTTPException(status_code=422, detail="Invalid project path")
    if not (root / "state.json").is_file():
        raise HTTPException(status_code=404, detail="Project not found")
    return root


def _artifact_rows(root: Path, project_id: str) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in _ALLOWED_ARTIFACT_SUFFIXES:
            continue
        relative = path.relative_to(root).as_posix()
        media_type, _ = mimetypes.guess_type(path.name)
        rows.append(
            {
                "name": path.name,
                "path": relative,
                "size": path.stat().st_size,
                "modified": path.stat().st_mtime,
                "media_type": media_type or "application/octet-stream",
                "url": f"/v1/projects/{project_id}/files/{relative}",
            }
        )
    return rows


def _project_summary(path: Path) -> dict[str, object] | None:
    state = _read_json(path / "state.json")
    if not isinstance(state, dict):
        return None
    manifest = _read_json(path / "shot-manifest.json")
    manifest_dict = manifest if isinstance(manifest, dict) else {}
    artifacts = _artifact_rows(path, path.name)
    previews = [item for item in artifacts if str(item.get("media_type", "")).startswith("video/")]
    return {
        "project_id": path.name,
        "project_name": manifest_dict.get("project_name") or path.name,
        "status": state.get("status"),
        "updated_at": state.get("updated_at"),
        "duration_seconds": manifest_dict.get("duration_seconds"),
        "deliverables": manifest_dict.get("deliverables", []),
        "artifact_count": len(artifacts),
        "preview": previews[-1] if previews else None,
    }


@router.get("/v1/console/bootstrap", dependencies=[Depends(require_console_api_key)])
def console_bootstrap() -> dict[str, object]:
    settings = Settings.from_env()
    runtime = load_runtime_config(settings.workspace)
    vast = VastConfig.from_workspace(settings.workspace)
    projects_root = settings.workspace / "projects"
    project_count = (
        sum(1 for path in projects_root.iterdir() if path.is_dir()) if projects_root.exists() else 0
    )
    return {
        "ok": True,
        "factory": settings.as_safe_dict(),
        "runtime": runtime.safe_dict(),
        "vast": vast.safe_dict(),
        "doctor": doctor_report(settings),
        "engine_catalog": engine_catalog_payload(settings),
        "project_count": project_count,
    }


@router.get("/v1/projects", dependencies=[Depends(require_console_api_key)])
def list_projects(limit: int = Query(default=100, ge=1, le=500)) -> dict[str, object]:
    settings = Settings.from_env()
    root = settings.workspace / "projects"
    if not root.exists():
        return {"ok": True, "projects": []}
    items = [
        summary
        for path in sorted(
            root.iterdir(),
            key=lambda item: item.stat().st_mtime,
            reverse=True,
        )
        if path.is_dir() and (summary := _project_summary(path)) is not None
    ]
    return {"ok": True, "projects": items[:limit]}


@router.get(
    "/v1/projects/{project_id}/artifacts",
    dependencies=[Depends(require_console_api_key)],
)
def project_artifacts(project_id: str) -> dict[str, object]:
    settings = Settings.from_env()
    root = _project_root(settings, project_id)
    return {"ok": True, "artifacts": _artifact_rows(root, project_id)}


@router.get(
    "/v1/projects/{project_id}/files/{artifact_path:path}",
    dependencies=[Depends(require_console_api_key)],
)
def project_file(project_id: str, artifact_path: str) -> FileResponse:
    settings = Settings.from_env()
    root = _project_root(settings, project_id)
    target = (root / artifact_path).resolve()
    if not target.is_relative_to(root) or not target.is_file():
        raise HTTPException(status_code=404, detail="Artifact not found")
    if target.suffix.lower() not in _ALLOWED_ARTIFACT_SUFFIXES:
        raise HTTPException(status_code=415, detail="Artifact type is not previewable")
    media_type, _ = mimetypes.guess_type(target.name)
    return FileResponse(target, media_type=media_type, filename=target.name)


@router.get("/v1/runtime", dependencies=[Depends(require_console_api_key)])
def runtime_status() -> dict[str, object]:
    settings = Settings.from_env()
    runtime = load_runtime_config(settings.workspace)
    return {
        "ok": True,
        "runtime": runtime.safe_dict(),
        "effective_comfyui": {
            "base_url": settings.comfyui_base_url,
            "api_key_configured": bool(settings.comfyui_api_key),
            "profile": settings.comfyui_profile,
        },
        "effective_oss_worker": {
            "base_url": settings.oss_worker_base_url,
            "api_key_configured": bool(settings.oss_worker_api_key),
        },
        "vast": VastConfig.from_workspace(settings.workspace).safe_dict(),
    }


@router.get("/v1/gpu-lifecycle", dependencies=[Depends(require_console_api_key)])
async def lifecycle_status() -> dict[str, object]:
    settings = Settings.from_env()
    return {"ok": True, "lifecycle": await gpu_lifecycle_status(settings)}


@router.post(
    "/v1/gpu-lifecycle/reconcile",
    dependencies=[Depends(require_console_api_key)],
)
async def reconcile_gpu_lifecycle() -> dict[str, object]:
    settings = Settings.from_env()
    state = await release_gpu_if_idle(settings)
    return {"ok": state.get("phase") != "error", "lifecycle": state}


@router.post(
    "/v1/gpu-lifecycle/prepare-maintenance",
    dependencies=[Depends(require_console_api_key)],
)
async def prepare_gpu_maintenance() -> dict[str, object]:
    """Start only the configured managed GPU for authenticated registry maintenance."""
    settings = Settings.from_env()
    if not settings.gpu_lifecycle_enabled:
        raise HTTPException(
            status_code=409,
            detail="Managed GPU lifecycle is not enabled.",
        )
    try:
        state = await ensure_gpu_ready(
            settings,
            run_id="managed-workflow-maintenance",
        )
    except (OSError, RuntimeError, TimeoutError, ValueError, VastAPIError) as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    return {"ok": state.get("phase") == "ready", "lifecycle": state}


@router.put("/v1/runtime", dependencies=[Depends(require_console_api_key)])
def configure_runtime(request: RuntimeConfigRequest) -> dict[str, object]:
    settings = Settings.from_env()
    if settings.environment == "production":
        endpoints = (
            ("ComfyUI", request.comfyui_base_url),
            ("OSS worker", request.oss_worker_base_url),
        )
        for label, endpoint in endpoints:
            if endpoint and urlparse(endpoint.strip()).scheme.lower() != "https":
                raise HTTPException(
                    status_code=422,
                    detail=f"Production {label} endpoints must use HTTPS",
                )
    updates: dict[str, Any] = {}
    for field in (
        "comfyui_base_url",
        "comfyui_api_key",
        "oss_worker_base_url",
        "oss_worker_api_key",
        "vast_api_key",
        "vast_template_hash",
        "gpu_lifecycle_enabled",
    ):
        if field in request.model_fields_set:
            updates[field] = getattr(request, field)
    if request.clear_comfyui_api_key:
        updates["comfyui_api_key"] = None
    if request.clear_oss_worker_api_key:
        updates["oss_worker_api_key"] = None
    if request.clear_vast_api_key:
        updates["vast_api_key"] = None
    try:
        runtime = update_runtime_config(settings.workspace, updates)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return {
        "ok": True,
        "runtime": runtime.safe_dict(),
        "vast": VastConfig.from_workspace(settings.workspace).safe_dict(),
    }


@router.get("/v1/vast/status", dependencies=[Depends(require_console_api_key)])
def vast_status() -> dict[str, object]:
    settings = Settings.from_env()
    return {"ok": True, **VastConfig.from_workspace(settings.workspace).safe_dict()}


@router.get("/v1/vast/templates", dependencies=[Depends(require_console_api_key)])
async def vast_templates(
    query: str = Query(default="ComfyUI", max_length=100),
    recommended_only: bool = True,
    ssh_only: bool = True,
) -> dict[str, object]:
    settings = Settings.from_env()
    client = VastClient(VastConfig.from_workspace(settings.workspace))
    try:
        templates = await client.search_templates(
            query=query,
            recommended_only=recommended_only,
            ssh_only=ssh_only,
        )
    except VastAPIError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    return {"ok": True, "templates": templates}


@router.post("/v1/vast/offers/search", dependencies=[Depends(require_console_api_key)])
async def vast_offers(request: VastOfferSearchRequest) -> dict[str, object]:
    settings = Settings.from_env()
    client = VastClient(VastConfig.from_workspace(settings.workspace))
    try:
        offers = await client.search_offers(
            gpu_names=request.gpu_names,
            min_gpu_ram_mb=int(request.min_gpu_ram_gb * 1024),
            min_reliability=request.min_reliability,
            verified=request.verified,
            instance_type=request.instance_type,
            max_hourly_price=request.max_hourly_price,
            limit=request.limit,
        )
    except VastAPIError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    return {"ok": True, "offers": offers}


@router.get("/v1/vast/instances", dependencies=[Depends(require_console_api_key)])
async def vast_instances() -> dict[str, object]:
    settings = Settings.from_env()
    client = VastClient(VastConfig.from_workspace(settings.workspace))
    try:
        instances = await client.list_instances()
    except VastAPIError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    return {
        "ok": True,
        "instances": [safe_vast_instance(instance) for instance in instances],
    }


@router.post(
    "/v1/vast/instances/{instance_id}/adopt",
    dependencies=[Depends(require_console_api_key)],
)
async def adopt_vast_instance(instance_id: int) -> dict[str, object]:
    settings = Settings.from_env()
    client = VastClient(VastConfig.from_workspace(settings.workspace))
    try:
        instances = await client.list_instances()
        instance = next(
            (
                item
                for item in instances
                if int(item.get("id") or item.get("instance_id") or 0) == instance_id
            ),
            None,
        )
        if instance is None:
            raise ValueError("Vast.ai instance was not found")
        connection = vast_instance_connection(instance)
        async with httpx.AsyncClient(
            timeout=15.0,
            headers={
                "Authorization": f"Bearer {connection.api_key}",
                "X-API-Key": connection.api_key,
            },
        ) as proxy:
            response = await proxy.get(f"{connection.base_url}/__video_factory/status")
            response.raise_for_status()
            payload = response.json()
        if not isinstance(payload, dict):
            raise ValueError("Managed ComfyUI proxy returned an invalid status")
        runtime = update_runtime_config(
            settings.workspace,
            {
                "comfyui_base_url": connection.base_url,
                "comfyui_api_key": connection.api_key,
                "vast_template_hash": connection.template_hash,
                "vast_instance_id": connection.instance_id,
                "gpu_lifecycle_enabled": True,
            },
        )
    except VastAPIError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=502,
            detail=f"Managed ComfyUI proxy is unavailable: {error}",
        ) from error
    except (OSError, ValueError) as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return {
        "ok": True,
        "instance": safe_vast_instance(instance),
        "connection": connection.safe_dict(),
        "runtime": runtime.safe_dict(),
        "provisioning": {
            "ready": bool(payload.get("ready")),
            "phase": payload.get("phase"),
            "detail": payload.get("detail"),
            "missing_nodes": payload.get("missing_nodes", []),
        },
        "workflow_manifest": {
            "models": payload.get("models", []),
            "workflows": payload.get("workflows", {}),
        },
    }


@router.post("/v1/vast/instances", dependencies=[Depends(require_console_api_key)])
async def create_vast_instance(request: VastCreateInstanceRequest) -> dict[str, object]:
    settings = Settings.from_env()
    runtime = load_runtime_config(settings.workspace)
    if settings.gpu_lifecycle_enabled and runtime.vast_instance_id:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Managed GPU {runtime.vast_instance_id} already exists. "
                "Video Factory will start it automatically for production runs."
            ),
        )
    client = VastClient(VastConfig.from_workspace(settings.workspace))
    try:
        result = await client.create_instance(
            request.offer_id,
            template_hash_id=request.template_hash_id,
            label=request.label,
            disk_gb=request.disk_gb,
            target_state=request.target_state,
            volume_id=request.volume_id,
            mount_path=request.mount_path,
            env=request.env,
            onstart=request.onstart,
            runtype=request.runtype,
        )
    except VastAPIError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    return {"ok": True, "result": result}


@router.post(
    "/v1/vast/instances/{instance_id}/state",
    dependencies=[Depends(require_console_api_key)],
)
async def set_vast_instance_state(
    instance_id: int,
    request: VastInstanceStateRequest,
) -> dict[str, object]:
    settings = Settings.from_env()
    runtime = load_runtime_config(settings.workspace)
    if settings.gpu_lifecycle_enabled and runtime.vast_instance_id == instance_id:
        if request.state == "running":
            raise HTTPException(
                status_code=409,
                detail="Managed GPU starts automatically when a production run begins.",
            )
        lifecycle = await gpu_lifecycle_status(settings)
        if lifecycle.get("active_runs") or lifecycle.get("active_gpu_leases"):
            raise HTTPException(
                status_code=409,
                detail="Managed GPU cannot be stopped while production runs or GPU leases are active.",
            )
    client = VastClient(VastConfig.from_workspace(settings.workspace))
    try:
        result = await client.set_instance_state(instance_id, request.state)
    except VastAPIError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    return {"ok": True, "result": result}


@router.delete(
    "/v1/vast/instances/{instance_id}",
    dependencies=[Depends(require_console_api_key)],
)
async def destroy_vast_instance(instance_id: int) -> dict[str, object]:
    settings = Settings.from_env()
    runtime = load_runtime_config(settings.workspace)
    if settings.gpu_lifecycle_enabled and runtime.vast_instance_id == instance_id:
        raise HTTPException(
            status_code=409,
            detail=(
                "Managed Video Factory GPU cannot be destroyed while automatic "
                "lifecycle control is enabled."
            ),
        )
    client = VastClient(VastConfig.from_workspace(settings.workspace))
    try:
        result = await client.destroy_instance(instance_id)
    except VastAPIError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    return {"ok": True, "result": result}
