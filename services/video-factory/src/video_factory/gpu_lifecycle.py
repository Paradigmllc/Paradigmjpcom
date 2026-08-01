from __future__ import annotations

import asyncio
import threading
import time
from collections.abc import Coroutine
from typing import Any, TypeVar

import httpx

from .gpu_lifecycle_state import (
    GpuLease,
    active_gpu_leases,
    active_local_runs,
    bootstrap_instance_id,
    find_managed_instance,
    hourly_price,
    instance_id,
    instance_status,
    intended_status,
    lifecycle_lock,
    lifecycle_state_path,
    read_json,
    release_gpu_lease,
    write_lifecycle_state,
)
from .operator_events import emit_operator_event
from .runtime_config import load_runtime_config, update_runtime_config
from .settings import Settings
from .vast import (
    VastAPIError,
    VastClient,
    VastConfig,
    safe_vast_instance,
    vast_instance_connection,
)

_T = TypeVar("_T")


async def _instances(settings: Settings) -> list[dict[str, Any]]:
    client = VastClient(VastConfig.from_workspace(settings.workspace))
    return await client.list_instances()


async def _proxy_status(instance: dict[str, Any]) -> dict[str, Any]:
    connection = vast_instance_connection(instance)
    async with httpx.AsyncClient(
        timeout=20.0,
        headers={
            "Authorization": f"Bearer {connection.api_key}",
            "X-API-Key": connection.api_key,
        },
    ) as client:
        response = await client.get(f"{connection.base_url}/__video_factory/status")
        response.raise_for_status()
        payload: Any = response.json()
    if not isinstance(payload, dict):
        raise ValueError("Managed ComfyUI proxy returned an invalid status")
    return payload


def _adopt_connection(settings: Settings, instance: dict[str, Any]) -> None:
    connection = vast_instance_connection(instance)
    update_runtime_config(
        settings.workspace,
        {
            "vast_instance_id": connection.instance_id,
            "comfyui_base_url": connection.base_url,
            "comfyui_api_key": connection.api_key,
            "vast_template_hash": connection.template_hash,
        },
    )


async def ensure_gpu_ready(settings: Settings, *, run_id: str | None) -> dict[str, object]:
    if not settings.gpu_lifecycle_enabled:
        return write_lifecycle_state(settings, phase="disabled", run_id=run_id, error=None)
    try:
        with lifecycle_lock(settings):
            instances = await _instances(settings)
            instance = find_managed_instance(settings, instances)
            managed_id = instance_id(instance)
            price = hourly_price(instance)
            status = instance_status(instance)
            if status != "running" or intended_status(instance) == "stopped":
                write_lifecycle_state(
                    settings,
                    phase="starting",
                    action="start_requested",
                    run_id=run_id,
                    managed_instance_id=managed_id,
                    instance=safe_vast_instance(instance),
                    hourly_price=price,
                    error=None,
                )
                await VastClient(
                    VastConfig.from_workspace(settings.workspace)
                ).set_instance_state(managed_id, "running")
                await emit_operator_event(
                    settings,
                    event_type="gpu_starting",
                    title="Video Factory GPUを起動中",
                    message=f"制作run {run_id or 'direct'} のためGPU {managed_id}を起動します。",
                    instance_id=managed_id,
                    run_id=run_id,
                    hourly_price=price,
                )

            deadline = time.monotonic() + settings.gpu_start_timeout_seconds
            last_detail = "Vast.ai instance is starting"
            while time.monotonic() < deadline:
                instances = await _instances(settings)
                instance = find_managed_instance(settings, instances)
                status = instance_status(instance)
                intended = intended_status(instance)
                if any(token in status for token in ("destroy", "error", "failed")):
                    raise RuntimeError(f"Managed GPU entered terminal state: {status}")
                if status == "running" and intended != "stopped":
                    try:
                        _adopt_connection(settings, instance)
                        proxy = await _proxy_status(instance)
                    except (httpx.HTTPError, ValueError) as error:
                        last_detail = f"ComfyUI proxy is starting: {error}"
                    else:
                        last_detail = str(proxy.get("detail") or proxy.get("phase") or "starting")
                        if proxy.get("ready") is True:
                            state = write_lifecycle_state(
                                settings,
                                phase="ready",
                                action="started",
                                run_id=run_id,
                                managed_instance_id=instance_id(instance),
                                instance=safe_vast_instance(instance),
                                provisioning={
                                    "ready": True,
                                    "phase": proxy.get("phase"),
                                    "detail": proxy.get("detail"),
                                },
                                hourly_price=hourly_price(instance),
                                error=None,
                            )
                            await emit_operator_event(
                                settings,
                                event_type="gpu_ready",
                                title="Video Factory GPU準備完了",
                                message=f"GPU {instance_id(instance)}で制作run {run_id or 'direct'}を開始します。",
                                instance_id=instance_id(instance),
                                run_id=run_id,
                                hourly_price=hourly_price(instance),
                            )
                            return state
                else:
                    last_detail = f"Vast.ai status={status}, intended={intended or 'unknown'}"
                write_lifecycle_state(
                    settings,
                    phase="starting",
                    action="waiting_for_ready",
                    run_id=run_id,
                    managed_instance_id=instance_id(instance),
                    instance=safe_vast_instance(instance),
                    hourly_price=hourly_price(instance),
                    detail=last_detail,
                    error=None,
                )
                await asyncio.sleep(settings.gpu_poll_seconds)
            raise TimeoutError(
                f"Managed GPU did not become ready within {settings.gpu_start_timeout_seconds}s: "
                f"{last_detail}"
            )
    except (VastAPIError, httpx.HTTPError, OSError, RuntimeError, TimeoutError, ValueError) as error:
        write_lifecycle_state(
            settings,
            phase="error",
            action="start_failed",
            run_id=run_id,
            error=str(error),
        )
        await emit_operator_event(
            settings,
            event_type="gpu_error",
            title="Video Factory GPU起動失敗",
            message=str(error),
            run_id=run_id,
        )
        raise


async def release_gpu_if_idle(
    settings: Settings,
    *,
    completed_run_id: str | None = None,
    completed_lease: GpuLease | None = None,
) -> dict[str, object]:
    release_gpu_lease(completed_lease)
    if not settings.gpu_lifecycle_enabled:
        return write_lifecycle_state(
            settings,
            phase="disabled",
            run_id=completed_run_id,
            error=None,
        )
    try:
        with lifecycle_lock(settings):
            active, unreadable = active_local_runs(
                settings,
                exclude_run_id=completed_run_id,
            )
            active_leases, unreadable_leases = active_gpu_leases(settings)
            if active or unreadable or active_leases or unreadable_leases:
                return write_lifecycle_state(
                    settings,
                    phase="in_use",
                    action="kept_running",
                    run_id=completed_run_id,
                    active_runs=active,
                    active_gpu_leases=active_leases,
                    unreadable_run_files=unreadable,
                    unreadable_gpu_leases=unreadable_leases,
                    error=(
                        "Unreadable run or lease records prevented automatic GPU stop"
                        if unreadable or unreadable_leases
                        else None
                    ),
                )

            instances = await _instances(settings)
            instance = find_managed_instance(settings, instances)
            managed_id = instance_id(instance)
            price = hourly_price(instance)
            if instance_status(instance) != "running":
                return write_lifecycle_state(
                    settings,
                    phase="stopped",
                    action="already_stopped",
                    run_id=completed_run_id,
                    managed_instance_id=managed_id,
                    instance=safe_vast_instance(instance),
                    active_runs=[],
                    hourly_price=price,
                    error=None,
                )
            if intended_status(instance) != "stopped":
                await VastClient(
                    VastConfig.from_workspace(settings.workspace)
                ).set_instance_state(managed_id, "stopped")
            write_lifecycle_state(
                settings,
                phase="stopping",
                action="stop_requested",
                run_id=completed_run_id,
                managed_instance_id=managed_id,
                instance=safe_vast_instance(instance),
                active_runs=[],
                hourly_price=price,
                error=None,
            )

            deadline = time.monotonic() + settings.gpu_stop_timeout_seconds
            while time.monotonic() < deadline:
                instances = await _instances(settings)
                instance = find_managed_instance(settings, instances)
                if instance_status(instance) != "running":
                    state = write_lifecycle_state(
                        settings,
                        phase="stopped",
                        action="stopped",
                        run_id=completed_run_id,
                        managed_instance_id=managed_id,
                        instance=safe_vast_instance(instance),
                        active_runs=[],
                        hourly_price=hourly_price(instance),
                        error=None,
                    )
                    await emit_operator_event(
                        settings,
                        event_type="gpu_stopped",
                        title="Video Factory GPUを自動停止",
                        message=f"稼働中の制作がないためGPU {managed_id}を停止しました。",
                        instance_id=managed_id,
                        run_id=completed_run_id,
                        hourly_price=hourly_price(instance),
                    )
                    return state
                await asyncio.sleep(settings.gpu_poll_seconds)
            raise TimeoutError(
                f"Managed GPU {managed_id} remained running after the stop request"
            )
    except (VastAPIError, OSError, RuntimeError, TimeoutError, ValueError) as error:
        state = write_lifecycle_state(
            settings,
            phase="error",
            action="stop_failed",
            run_id=completed_run_id,
            error=str(error),
        )
        await emit_operator_event(
            settings,
            event_type="gpu_error",
            title="Video Factory GPU停止失敗",
            message=str(error),
            run_id=completed_run_id,
        )
        return state


async def gpu_lifecycle_status(settings: Settings) -> dict[str, object]:
    active, unreadable = active_local_runs(settings)
    active_leases, unreadable_leases = active_gpu_leases(settings)
    state = read_json(lifecycle_state_path(settings)) or {
        "schema_version": 1,
        "enabled": settings.gpu_lifecycle_enabled,
        "phase": "not_checked",
        "updated_at": None,
    }
    runtime = load_runtime_config(settings.workspace)
    return {
        **state,
        "enabled": settings.gpu_lifecycle_enabled,
        "managed_instance_id": runtime.vast_instance_id
        or bootstrap_instance_id(settings),
        "active_runs": active,
        "active_gpu_leases": active_leases,
        "unreadable_run_files": unreadable,
        "unreadable_gpu_leases": unreadable_leases,
        "start_timeout_seconds": settings.gpu_start_timeout_seconds,
        "stop_timeout_seconds": settings.gpu_stop_timeout_seconds,
        "poll_seconds": settings.gpu_poll_seconds,
    }


def run_lifecycle(coroutine: Coroutine[Any, Any, _T]) -> _T:
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coroutine)

    result: list[_T] = []
    errors: list[BaseException] = []

    def runner() -> None:
        try:
            result.append(asyncio.run(coroutine))
        except BaseException as error:
            errors.append(error)

    thread = threading.Thread(target=runner, name="video-factory-gpu-lifecycle")
    thread.start()
    thread.join()
    if errors:
        raise errors[0]
    return result[0]
