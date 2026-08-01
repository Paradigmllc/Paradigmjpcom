from __future__ import annotations

import shutil
from pathlib import Path
from typing import Any

import httpx

from .model_registry import model_registry_readiness
from .models import Engine
from .router import engine_availability
from .settings import Settings
from .workflow_registry import load_workflow_registry, registry_readiness


def _auth_headers(api_key: str | None) -> dict[str, str]:
    if not api_key:
        return {}
    return {"Authorization": f"Bearer {api_key}", "X-API-Key": api_key}


def _bytes_to_gb(value: object) -> float | None:
    if not isinstance(value, (str, bytes, int, float)):
        return None
    try:
        return round(float(value) / (1024**3), 2)
    except (TypeError, ValueError):
        return None


def _gpu_summary(payload: Any) -> list[dict[str, object]]:
    if not isinstance(payload, dict):
        return []
    devices = payload.get("devices")
    if not isinstance(devices, list):
        return []
    summaries: list[dict[str, object]] = []
    for item in devices:
        if not isinstance(item, dict):
            continue
        summaries.append(
            {
                "name": item.get("name") or item.get("type") or "unknown",
                "type": item.get("type"),
                "vram_total_gb": _bytes_to_gb(item.get("vram_total") or item.get("total_memory")),
                "vram_free_gb": _bytes_to_gb(item.get("vram_free") or item.get("free_memory")),
            }
        )
    return summaries


def _registry_status(settings: Settings) -> dict[str, object]:
    if not settings.comfyui_workflow_registry.is_file():
        return {
            "exists": False,
            "ready": False,
            "error": f"Missing registry: {settings.comfyui_workflow_registry}",
            "required": list(settings.comfyui_required_workflows),
        }
    try:
        registry = load_workflow_registry(settings.comfyui_workflow_registry)
        status = registry_readiness(registry, settings.comfyui_workflow_root)
    except (ValueError, OSError) as error:
        return {
            "exists": True,
            "ready": False,
            "error": str(error),
            "required": list(settings.comfyui_required_workflows),
        }
    raw_items = status.get("items")
    if not isinstance(raw_items, list):
        return {
            **status,
            "exists": True,
            "required": list(settings.comfyui_required_workflows),
            "error": "Workflow registry readiness omitted its item list",
            "required_ready": False,
        }
    items = {
        str(item["id"]): item for item in raw_items if isinstance(item, dict) and item.get("id")
    }
    missing = [item for item in settings.comfyui_required_workflows if item not in items]
    unready = [
        item
        for item in settings.comfyui_required_workflows
        if item in items and not (items[item]["enabled"] and items[item]["workflow_valid"])
    ]
    return {
        **status,
        "exists": True,
        "required": list(settings.comfyui_required_workflows),
        "missing_required": missing,
        "unready_required": unready,
        "required_ready": not missing and not unready,
    }


def doctor_report(settings: Settings) -> dict[str, object]:
    availability = engine_availability(settings)
    registry = _registry_status(settings)
    models = model_registry_readiness(settings.model_registry_path)
    comfy_status: dict[str, object] = {
        "configured": bool(settings.comfyui_base_url),
        "authenticated": bool(settings.comfyui_api_key),
        "profile": settings.comfyui_profile,
        "reachable": False,
        "gpu_devices": [],
        "min_vram_gb": settings.comfyui_min_vram_gb,
    }
    if settings.comfyui_base_url:
        try:
            response = httpx.get(
                f"{settings.comfyui_base_url}/system_stats",
                timeout=5.0,
                headers=_auth_headers(settings.comfyui_api_key),
            )
            comfy_status["reachable"] = response.is_success
            comfy_status["status_code"] = response.status_code
            if response.is_success:
                devices = _gpu_summary(response.json())
                comfy_status["gpu_devices"] = devices
                totals = [
                    value
                    for item in devices
                    if (value := item.get("vram_total_gb")) is not None
                    and isinstance(value, (int, float))
                ]
                comfy_status["vram_ready"] = (
                    bool(totals) and max(totals) >= settings.comfyui_min_vram_gb
                )
        except Exception as error:
            comfy_status["error"] = str(error)

    binaries = {
        name: shutil.which(name)
        for name in ("python", "ffmpeg", "ffprobe", "node", "npx", "uvx", "rclone")
    }
    core_ready = all(binaries[name] for name in ("python", "ffmpeg", "ffprobe", "node", "npx"))
    service_auth_ready = settings.environment != "production" or bool(settings.api_key)
    comfy_auth_ready = settings.environment != "production" or bool(settings.comfyui_api_key)
    production_ready = bool(
        core_ready
        and service_auth_ready
        and comfy_auth_ready
        and comfy_status.get("reachable")
        and comfy_status.get("vram_ready")
        and registry.get("required_ready")
        and models.get("ready")
        and availability[Engine.HYPERFRAMES]
    )

    return {
        "environment": settings.environment,
        "production_ready": production_ready,
        "workspace": str(settings.workspace),
        "workspace_parent_writable": _writable_parent(settings.workspace),
        "binaries": binaries,
        "engines": {engine.value: availability[engine] for engine in Engine},
        "comfyui": comfy_status,
        "workflow_registry": registry,
        "model_registry": models,
        "frameio": {
            "configured": bool(settings.frameio_access_token and settings.frameio_create_file_url)
        },
        "hyperframes_version": settings.hyperframes_version,
        "playwright_script": {
            "path": str(settings.playwright_capture_script),
            "exists": settings.playwright_capture_script.exists(),
        },
        "blocking_reasons": [
            reason
            for reason, blocked in (
                ("core binaries missing", not core_ready),
                ("production API authentication missing", not service_auth_ready),
                ("ComfyUI API authentication missing", not comfy_auth_ready),
                ("ComfyUI endpoint unavailable", not comfy_status.get("reachable")),
                ("GPU VRAM below requirement or not reported", not comfy_status.get("vram_ready")),
                ("required ComfyUI workflows are not bound", not registry.get("required_ready")),
                ("no commercially approved model artifacts", not models.get("ready")),
                ("HyperFrames CLI unavailable", not availability[Engine.HYPERFRAMES]),
            )
            if blocked
        ],
    }


def _writable_parent(path: Path) -> bool:
    candidate = path
    while not candidate.exists() and candidate != candidate.parent:
        candidate = candidate.parent
    return candidate.exists() and candidate.is_dir() and os_access_writable(candidate)


def os_access_writable(path: Path) -> bool:
    import os

    return os.access(path, os.W_OK)
