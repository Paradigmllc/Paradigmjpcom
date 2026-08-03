from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Any

import pytest

import video_factory.gpu_lifecycle as gpu_lifecycle
from video_factory.gpu_lifecycle import (
    ensure_gpu_ready,
    gpu_lifecycle_status,
    release_gpu_if_idle,
    run_lifecycle,
)
from video_factory.gpu_lifecycle_state import (
    acquire_gpu_lease,
    find_managed_instance,
    lifecycle_lock,
    release_gpu_lease,
)
from video_factory.runtime_config import load_runtime_config, update_runtime_config
from video_factory.settings import Settings
from video_factory.vast import VastClient


def _instance(state: dict[str, str]) -> dict[str, Any]:
    return {
        "id": 46258780,
        "label": "paradigm-comfyui-wan22-test",
        "actual_status": state["actual_status"],
        "intended_status": state["intended_status"],
        "cur_state": state["cur_state"],
        "gpu_name": "RTX 3090",
        "dph_total": 0.1317222222,
        "public_ipaddr": "203.0.113.10",
        "template_hash_id": "template-hash",
        "extra_env": [["COMFY_PROXY_KEY", "p" * 64]],
        "ports": {"18189/tcp": [{"HostPort": "48189"}]},
    }


def _settings(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> Settings:
    workspace = tmp_path / "workspace"
    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(workspace))
    monkeypatch.setenv("VIDEO_FACTORY_ENVIRONMENT", "production")
    monkeypatch.setenv("VIDEO_FACTORY_GPU_POLL_SECONDS", "0.001")
    monkeypatch.setenv("VIDEO_FACTORY_GPU_START_TIMEOUT_SECONDS", "1")
    monkeypatch.setenv("VIDEO_FACTORY_GPU_STOP_TIMEOUT_SECONDS", "1")
    monkeypatch.delenv("VIDEO_FACTORY_OPERATOR_EVENT_URL", raising=False)
    update_runtime_config(
        workspace,
        {
            "vast_api_key": "vast-secret",
            "vast_instance_id": 46258780,
            "comfyui_api_key": "p" * 64,
            "gpu_lifecycle_enabled": True,
        },
    )
    return Settings.from_env()


def test_gpu_starts_for_run_and_stops_when_idle(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    settings = _settings(monkeypatch, tmp_path)
    instance_state = {
        "actual_status": "stopped",
        "intended_status": "stopped",
        "cur_state": "stopped",
    }
    actions: list[str] = []
    startup_polls = 0

    async def list_instances(_client: VastClient) -> list[dict[str, Any]]:
        nonlocal startup_polls
        snapshot = _instance(instance_state)
        if (
            instance_state["actual_status"] == "exited"
            and instance_state["intended_status"] == "running"
        ):
            startup_polls += 1
            instance_state.update(actual_status="running", cur_state="running")
        return [snapshot]

    async def set_state(
        _client: VastClient,
        _instance_id: int,
        state: str,
    ) -> dict[str, bool]:
        actions.append(state)
        actual_status = "exited" if state == "running" else state
        instance_state.update(actual_status=actual_status, intended_status=state, cur_state=state)
        return {"success": True}

    async def proxy_status(_instance_payload: dict[str, Any]) -> dict[str, Any]:
        return {"ready": True, "phase": "ready", "detail": "ComfyUI ready"}

    monkeypatch.setattr(VastClient, "list_instances", list_instances)
    monkeypatch.setattr(VastClient, "set_instance_state", set_state)
    monkeypatch.setattr(gpu_lifecycle, "_proxy_status", proxy_status)

    started = run_lifecycle(ensure_gpu_ready(settings, run_id="run-production"))
    stopped = run_lifecycle(
        release_gpu_if_idle(
            settings,
            completed_run_id="run-production",
        )
    )

    assert started["phase"] == "ready"
    assert started["detail"] == "ComfyUI ready"
    assert stopped["phase"] == "stopped"
    assert stopped["detail"] == (
        "The managed GPU is stopped; active compute billing is paused."
    )
    assert actions == ["running", "stopped"]
    assert startup_polls == 1
    runtime = load_runtime_config(settings.workspace)
    assert runtime.comfyui_base_url == "https://203.0.113.10:48189"
    assert runtime.vast_instance_id == 46258780


def test_lifecycle_lock_waits_without_blocking_the_event_loop(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    settings = _settings(monkeypatch, tmp_path)

    async def scenario() -> None:
        first_acquired = asyncio.Event()
        release_first = asyncio.Event()
        second_acquired = asyncio.Event()

        async def first() -> None:
            async with lifecycle_lock(
                settings,
                timeout_seconds=1,
                poll_seconds=0.001,
            ):
                first_acquired.set()
                await release_first.wait()

        async def second() -> None:
            await first_acquired.wait()
            async with lifecycle_lock(
                settings,
                timeout_seconds=1,
                poll_seconds=0.001,
            ):
                second_acquired.set()

        first_task = asyncio.create_task(first())
        second_task = asyncio.create_task(second())
        await first_acquired.wait()
        await asyncio.sleep(0.01)
        assert second_acquired.is_set() is False
        release_first.set()
        await asyncio.wait_for(asyncio.gather(first_task, second_task), timeout=1)
        assert second_acquired.is_set() is True

    asyncio.run(scenario())


def test_gpu_waits_for_proxy_metadata_after_vast_reports_running(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    settings = _settings(monkeypatch, tmp_path)
    calls = 0

    async def list_instances(_client: VastClient) -> list[dict[str, Any]]:
        nonlocal calls
        calls += 1
        instance = _instance(
            {
                "actual_status": "running",
                "intended_status": "running",
                "cur_state": "running",
            }
        )
        if calls < 3:
            instance["ports"] = {}
        return [instance]

    async def proxy_status(_instance_payload: dict[str, Any]) -> dict[str, Any]:
        return {"ready": True, "phase": "ready", "detail": "ComfyUI ready"}

    monkeypatch.setattr(VastClient, "list_instances", list_instances)
    monkeypatch.setattr(gpu_lifecycle, "_proxy_status", proxy_status)

    state = run_lifecycle(ensure_gpu_ready(settings, run_id="run-production"))

    assert state["phase"] == "ready"
    assert calls == 3


def test_stopped_gpu_is_migrated_from_existing_runtime_identity(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    settings = _settings(monkeypatch, tmp_path)
    update_runtime_config(
        settings.workspace,
        {
            "vast_instance_id": None,
            "comfyui_base_url": "https://203.0.113.10:48189",
            "vast_template_hash": "template-hash",
        },
    )
    stopped = _instance(
        {
            "actual_status": "exited",
            "intended_status": "stopped",
            "cur_state": "stopped",
        }
    )
    stopped["ports"] = {}
    stopped["extra_env"] = []

    selected = find_managed_instance(settings, [stopped])

    assert selected["id"] == 46258780
    assert load_runtime_config(settings.workspace).vast_instance_id == 46258780


def test_gpu_remains_running_while_another_job_is_queued(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    settings = _settings(monkeypatch, tmp_path)
    runs = settings.workspace / "runs"
    runs.mkdir(parents=True)
    (runs / "queued.json").write_text(
        json.dumps({"run_id": "next-run", "status": "queued"}),
        encoding="utf-8",
    )

    state = run_lifecycle(
        release_gpu_if_idle(settings, completed_run_id="finished-run")
    )

    assert state["phase"] == "in_use"
    assert state["action"] == "kept_running"
    assert state["active_runs"] == [{"run_id": "next-run", "status": "queued"}]


def test_dry_run_queue_does_not_keep_managed_gpu_running(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    settings = _settings(monkeypatch, tmp_path)
    runs = settings.workspace / "runs"
    runs.mkdir(parents=True)
    (runs / "preview.json").write_text(
        json.dumps(
            {"run_id": "preview-run", "status": "queued", "dry_run": True}
        ),
        encoding="utf-8",
    )
    instance_state = {
        "actual_status": "running",
        "intended_status": "running",
        "cur_state": "running",
    }

    async def list_instances(_client: VastClient) -> list[dict[str, Any]]:
        return [_instance(instance_state)]

    async def set_state(
        _client: VastClient,
        _instance_id: int,
        state: str,
    ) -> dict[str, bool]:
        instance_state.update(
            actual_status=state,
            intended_status=state,
            cur_state=state,
        )
        return {"success": True}

    monkeypatch.setattr(VastClient, "list_instances", list_instances)
    monkeypatch.setattr(VastClient, "set_instance_state", set_state)

    state = run_lifecycle(release_gpu_if_idle(settings))

    assert state["phase"] == "stopped"


def test_unreadable_run_record_fails_safe_without_stopping_gpu(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    settings = _settings(monkeypatch, tmp_path)
    runs = settings.workspace / "runs"
    runs.mkdir(parents=True)
    (runs / "damaged.json").write_text("{not-json", encoding="utf-8")

    state = run_lifecycle(release_gpu_if_idle(settings))
    status = run_lifecycle(gpu_lifecycle_status(settings))

    assert state["phase"] == "in_use"
    assert state["error"] == "Unreadable run or lease records prevented automatic GPU stop"
    assert state["detail"] == (
        "Unreadable run or lease records require operator review."
    )
    assert status["unreadable_run_files"]


def test_active_process_lease_prevents_cross_worker_stop(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    settings = _settings(monkeypatch, tmp_path)
    lease = acquire_gpu_lease(settings, "f4029619-d642-43b1-86ea-31d0ce812320")
    try:
        state = run_lifecycle(release_gpu_if_idle(settings))
        assert state["phase"] == "in_use"
        assert state["active_gpu_leases"] == [lease.lease_id]
    finally:
        release_gpu_lease(lease)
