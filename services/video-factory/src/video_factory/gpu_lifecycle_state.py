from __future__ import annotations

import fcntl
import json
import os
import threading
import uuid
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, TextIO

from .runtime_config import load_runtime_config, update_runtime_config
from .settings import Settings
from .vast import vast_instance_connection

ACTIVE_RUN_STATES = {"queued", "running"}
MANAGED_LABEL_PREFIX = "paradigm-comfyui"
_process_lock = threading.RLock()


@dataclass(frozen=True)
class GpuLease:
    lease_id: str
    path: Path
    handle: TextIO


def lifecycle_state_path(settings: Settings) -> Path:
    return _runtime_root(settings) / "gpu-lifecycle.json"


def _leases_root(settings: Settings) -> Path:
    root = _runtime_root(settings) / "gpu-leases"
    root.mkdir(parents=True, exist_ok=True)
    return root


def acquire_gpu_lease(settings: Settings, requested_id: str | None) -> GpuLease:
    try:
        lease_id = str(uuid.UUID(requested_id)) if requested_id else str(uuid.uuid4())
    except ValueError:
        lease_id = str(uuid.uuid5(uuid.NAMESPACE_URL, requested_id or "direct"))
    path = _leases_root(settings) / f"{lease_id}.lock"
    handle = path.open("a+", encoding="utf-8")
    try:
        fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        handle.seek(0)
        handle.truncate()
        json.dump(
            {
                "lease_id": lease_id,
                "pid": os.getpid(),
                "created_at": datetime.now(UTC).isoformat(),
            },
            handle,
        )
        handle.write("\n")
        handle.flush()
        os.fsync(handle.fileno())
        os.chmod(path, 0o600)
    except BaseException:
        handle.close()
        raise
    return GpuLease(lease_id=lease_id, path=path, handle=handle)


def release_gpu_lease(lease: GpuLease | None) -> None:
    if lease is None or lease.handle.closed:
        return
    fcntl.flock(lease.handle.fileno(), fcntl.LOCK_UN)
    lease.handle.close()
    try:
        lease.path.unlink()
    except FileNotFoundError:
        return


def active_gpu_leases(settings: Settings) -> tuple[list[str], list[str]]:
    active: list[str] = []
    unreadable: list[str] = []
    for path in sorted(_leases_root(settings).glob("*.lock")):
        handle = path.open("a+", encoding="utf-8")
        try:
            fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            active.append(path.stem)
            handle.close()
            continue
        try:
            fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
            handle.close()
            path.unlink()
        except OSError as error:
            unreadable.append(f"{path.name}: {error}")
            if not handle.closed:
                handle.close()
    return active, unreadable


def _runtime_root(settings: Settings) -> Path:
    root = settings.workspace / "runtime"
    root.mkdir(parents=True, exist_ok=True)
    return root


@contextmanager
def lifecycle_lock(settings: Settings) -> Iterator[None]:
    lock_path = _runtime_root(settings) / "gpu-lifecycle.lock"
    with _process_lock, lock_path.open("a+", encoding="utf-8") as handle:
        os.chmod(lock_path, 0o600)
        fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(handle.fileno(), fcntl.LOCK_UN)


def read_json(path: Path) -> dict[str, Any] | None:
    if not path.is_file():
        return None
    try:
        payload: Any = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"Unreadable lifecycle data {path.name}: {error}") from error
    return payload if isinstance(payload, dict) else None


def write_lifecycle_state(settings: Settings, **values: object) -> dict[str, object]:
    path = lifecycle_state_path(settings)
    current = read_json(path) or {}
    payload: dict[str, object] = {
        **current,
        "schema_version": 1,
        "enabled": settings.gpu_lifecycle_enabled,
        "updated_at": datetime.now(UTC).isoformat(),
        **values,
    }
    temporary = path.with_suffix(".tmp")
    temporary.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    os.chmod(temporary, 0o600)
    temporary.replace(path)
    os.chmod(path, 0o600)
    return payload


def active_local_runs(
    settings: Settings,
    *,
    exclude_run_id: str | None = None,
) -> tuple[list[dict[str, str]], list[str]]:
    root = settings.workspace / "runs"
    if not root.exists():
        return [], []
    active: list[dict[str, str]] = []
    unreadable: list[str] = []
    for path in sorted(root.glob("*.json")):
        try:
            payload: Any = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            unreadable.append(f"{path.name}: {error}")
            continue
        if not isinstance(payload, dict):
            unreadable.append(f"{path.name}: expected a JSON object")
            continue
        run_id = str(payload.get("run_id") or path.stem)
        status = str(payload.get("status") or "unknown")
        requires_gpu = payload.get("dry_run") is not True
        if run_id != exclude_run_id and status in ACTIVE_RUN_STATES and requires_gpu:
            active.append({"run_id": run_id, "status": status})
    return active, unreadable


def bootstrap_instance_id(settings: Settings) -> int | None:
    path = settings.workspace / "config" / ".vast-bootstrap-state.json"
    payload = read_json(path)
    value = payload.get("instance_id") if payload else None
    return int(value) if value is not None else None


def instance_id(instance: dict[str, Any]) -> int:
    return int(instance.get("id") or instance.get("instance_id") or 0)


def instance_status(instance: dict[str, Any]) -> str:
    return str(
        instance.get("actual_status")
        or instance.get("status")
        or instance.get("cur_state")
        or "unknown"
    ).lower()


def intended_status(instance: dict[str, Any]) -> str:
    return str(instance.get("intended_status") or instance.get("cur_state") or "").lower()


def hourly_price(instance: dict[str, Any]) -> float | None:
    value = instance.get("dph_total") or instance.get("total_hour")
    try:
        return float(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def find_managed_instance(
    settings: Settings,
    instances: list[dict[str, Any]],
) -> dict[str, Any]:
    runtime = load_runtime_config(settings.workspace)
    configured_id = runtime.vast_instance_id or bootstrap_instance_id(settings)
    if configured_id:
        match = next(
            (instance for instance in instances if instance_id(instance) == configured_id),
            None,
        )
        if match is None:
            raise ValueError(f"Managed Vast.ai instance {configured_id} was not found")
        label = str(match.get("label") or "")
        if not label.startswith(MANAGED_LABEL_PREFIX):
            raise ValueError("Configured Vast.ai instance is not a managed Video Factory GPU")
        if runtime.vast_instance_id != configured_id:
            update_runtime_config(settings.workspace, {"vast_instance_id": configured_id})
        return match

    candidates: list[dict[str, Any]] = []
    for instance in instances:
        if not str(instance.get("label") or "").startswith(MANAGED_LABEL_PREFIX):
            continue
        try:
            connection = vast_instance_connection(instance)
        except ValueError:
            continue
        if runtime.comfyui_api_key and connection.api_key == runtime.comfyui_api_key:
            candidates.append(instance)
    if len(candidates) != 1:
        raise ValueError(
            "A single managed Vast.ai GPU could not be identified; adopt it in the console"
        )
    selected = candidates[0]
    update_runtime_config(
        settings.workspace,
        {"vast_instance_id": instance_id(selected)},
    )
    return selected
