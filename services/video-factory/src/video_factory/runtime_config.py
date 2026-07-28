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
    schema_version: int = 1
    comfyui_base_url: str | None = None
    comfyui_api_key: str | None = None
    vast_api_key: str | None = None
    vast_template_hash: str | None = None
    updated_at: str | None = None

    def safe_dict(self) -> dict[str, object]:
        return {
            "schema_version": self.schema_version,
            "comfyui_base_url": self.comfyui_base_url,
            "comfyui_api_key_configured": bool(self.comfyui_api_key),
            "vast_api_key_configured": bool(self.vast_api_key),
            "vast_template_hash": self.vast_template_hash,
            "updated_at": self.updated_at,
        }


def runtime_config_path(workspace: Path) -> Path:
    return workspace / "config" / "runtime.json"


def _normalize_url(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().rstrip("/")
    if not normalized:
        return None
    parsed = urlparse(normalized)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("ComfyUI URL must be an absolute http or https URL")
    if parsed.username or parsed.password:
        raise ValueError("Credentials must not be embedded in the ComfyUI URL")
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
        comfyui_base_url=_normalize_url(payload.get("comfyui_base_url")),
        comfyui_api_key=(
            str(payload["comfyui_api_key"])
            if payload.get("comfyui_api_key")
            else None
        ),
        vast_api_key=str(payload["vast_api_key"]) if payload.get("vast_api_key") else None,
        vast_template_hash=(
            str(payload["vast_template_hash"]).strip()
            if payload.get("vast_template_hash")
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
        values["comfyui_base_url"] = _normalize_url(updates["comfyui_base_url"])
    for key in ("comfyui_api_key", "vast_api_key", "vast_template_hash"):
        if key in updates:
            value = updates[key]
            values[key] = str(value).strip() if value else None
    values["updated_at"] = current.updated_at
    return save_runtime_config(workspace, RuntimeConfig(**values))
