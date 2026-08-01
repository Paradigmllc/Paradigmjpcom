from __future__ import annotations

import json
import os
from dataclasses import asdict, dataclass, replace
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


@dataclass(frozen=True)
class RuntimeConfig:
    schema_version: int = 3
    comfyui_base_url: str | None = None
    comfyui_api_key: str | None = None
    oss_worker_base_url: str | None = None
    oss_worker_api_key: str | None = None
    vast_api_key: str | None = None
    vast_template_hash: str | None = None
    vast_instance_id: int | None = None
    gpu_lifecycle_enabled: bool | None = None
    updated_at: str | None = None

    def safe_dict(self) -> dict[str, object]:
        return {
            "schema_version": self.schema_version,
            "comfyui_base_url": self.comfyui_base_url,
            "comfyui_api_key_configured": bool(self.comfyui_api_key),
            "oss_worker_base_url": self.oss_worker_base_url,
            "oss_worker_api_key_configured": bool(self.oss_worker_api_key),
            "vast_api_key_configured": bool(self.vast_api_key),
            "vast_template_hash": self.vast_template_hash,
            "vast_instance_id": self.vast_instance_id,
            "gpu_lifecycle_enabled": self.gpu_lifecycle_enabled,
            "updated_at": self.updated_at,
        }


def runtime_config_path(workspace: Path) -> Path:
    return workspace / "config" / "runtime.json"


def _normalize_url(value: str | None, *, label: str) -> str | None:
    if value is None:
        return None
    normalized = value.strip().rstrip("/")
    if not normalized:
        return None
    parsed = urlparse(normalized)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError(f"{label} must be an absolute http or https URL")
    if parsed.username or parsed.password:
        raise ValueError(f"Credentials must not be embedded in the {label}")
    return normalized


def load_runtime_config(workspace: Path) -> RuntimeConfig:
    path = runtime_config_path(workspace)
    if not path.exists():
        return RuntimeConfig()
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"Runtime configuration is unreadable: {error}") from error
    if not isinstance(payload, dict):
        raise ValueError("Runtime configuration must be a JSON object")
    return RuntimeConfig(
        schema_version=int(payload.get("schema_version", 1)),
        comfyui_base_url=_normalize_url(payload.get("comfyui_base_url"), label="ComfyUI URL"),
        comfyui_api_key=(
            str(payload["comfyui_api_key"]) if payload.get("comfyui_api_key") else None
        ),
        oss_worker_base_url=_normalize_url(
            payload.get("oss_worker_base_url"), label="OSS worker URL"
        ),
        oss_worker_api_key=(
            str(payload["oss_worker_api_key"]) if payload.get("oss_worker_api_key") else None
        ),
        vast_api_key=str(payload["vast_api_key"]) if payload.get("vast_api_key") else None,
        vast_template_hash=(
            str(payload["vast_template_hash"]).strip()
            if payload.get("vast_template_hash")
            else None
        ),
        vast_instance_id=(
            int(payload["vast_instance_id"])
            if payload.get("vast_instance_id") is not None
            else None
        ),
        gpu_lifecycle_enabled=(
            bool(payload["gpu_lifecycle_enabled"])
            if payload.get("gpu_lifecycle_enabled") is not None
            else None
        ),
        updated_at=str(payload["updated_at"]) if payload.get("updated_at") else None,
    )


def save_runtime_config(workspace: Path, config: RuntimeConfig) -> RuntimeConfig:
    path = runtime_config_path(workspace)
    path.parent.mkdir(parents=True, exist_ok=True)
    updated = replace(config, updated_at=datetime.now(UTC).isoformat())
    temporary = path.with_suffix(".tmp")
    temporary.write_text(
        json.dumps(asdict(updated), indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    os.chmod(temporary, 0o600)
    temporary.replace(path)
    os.chmod(path, 0o600)
    return updated


def update_runtime_config(workspace: Path, updates: dict[str, Any]) -> RuntimeConfig:
    current = load_runtime_config(workspace)
    values = asdict(current)
    if "comfyui_base_url" in updates:
        values["comfyui_base_url"] = _normalize_url(
            updates["comfyui_base_url"], label="ComfyUI URL"
        )
    if "oss_worker_base_url" in updates:
        values["oss_worker_base_url"] = _normalize_url(
            updates["oss_worker_base_url"], label="OSS worker URL"
        )
    for key in (
        "comfyui_api_key",
        "oss_worker_api_key",
        "vast_api_key",
        "vast_template_hash",
    ):
        if key in updates:
            value = updates[key]
            values[key] = str(value).strip() if value else None
    if "vast_instance_id" in updates:
        value = updates["vast_instance_id"]
        values["vast_instance_id"] = int(value) if value is not None else None
    if "gpu_lifecycle_enabled" in updates:
        value = updates["gpu_lifecycle_enabled"]
        values["gpu_lifecycle_enabled"] = bool(value) if value is not None else None
    values["schema_version"] = 3
    values["updated_at"] = current.updated_at
    return save_runtime_config(workspace, RuntimeConfig(**values))
