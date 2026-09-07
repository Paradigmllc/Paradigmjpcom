from dataclasses import replace
from unittest.mock import AsyncMock

import pytest

import video_factory.gpu_lifecycle as lifecycle
from video_factory.gpu_lifecycle_state import write_lifecycle_state
from video_factory.runtime_config import update_runtime_config


@pytest.mark.parametrize("actual", ["loading", "frozen", "rebooting", "unknown", "offline", "exited", None])
def test_nonrunning_is_not_stop_confirmation(actual, settings, monkeypatch):
    settings = replace(settings, gpu_lifecycle_enabled=True, gpu_stop_timeout_seconds=0.02,
                       gpu_poll_seconds=0.001)
    update_runtime_config(settings.workspace, {"vast_api_key": "fixture-key", "vast_instance_id": 42})
    instance = {"id": 42, "label": "paradigm-comfyui-fixture", "actual_status": actual,
                "intended_status": "running", "cur_state": "running"}
    stopped = {**instance, "actual_status": "exited", "intended_status": "stopped", "cur_state": "stopped"}
    snapshots = AsyncMock(side_effect=[[instance], [instance], [stopped]])
    action, event = AsyncMock(), AsyncMock()
    monkeypatch.setattr(lifecycle, "_instances", snapshots)
    monkeypatch.setattr(lifecycle.VastClient, "set_instance_state", action)
    monkeypatch.setattr(lifecycle, "emit_operator_event", event)
    result = lifecycle.run_lifecycle(lifecycle.release_gpu_if_idle(settings))
    action.assert_awaited_once_with(42, "stopped")
    assert snapshots.await_count == 3
    assert result["phase"] == "stopped"
    assert event.await_args.kwargs["event_type"] == "gpu_stopped"


def test_unconfirmed_stop_is_error_not_success(settings, monkeypatch):
    settings = replace(settings, gpu_lifecycle_enabled=True, gpu_stop_timeout_seconds=0.01,
                       gpu_poll_seconds=0.001)
    update_runtime_config(settings.workspace, {"vast_api_key": "fixture-key", "vast_instance_id": 42})
    instance = {"id": 42, "label": "paradigm-comfyui-fixture", "actual_status": "loading",
                "intended_status": "stopped", "cur_state": "running"}
    event = AsyncMock()
    monkeypatch.setattr(lifecycle, "_instances", AsyncMock(return_value=[instance]))
    monkeypatch.setattr(lifecycle, "emit_operator_event", event)
    write_lifecycle_state(settings, phase="starting")
    result = lifecycle.run_lifecycle(lifecycle.release_gpu_if_idle(settings))
    assert result["phase"] == "error"
    assert result["action"] == "stop_failed"
    assert "confirmation" in result["error"]
    assert event.await_args.kwargs["event_type"] == "gpu_error"


def test_missing_required_worker_profile_never_becomes_ready(settings, monkeypatch):
    settings = replace(settings, gpu_lifecycle_enabled=True, gpu_start_timeout_seconds=0.01,
                       gpu_poll_seconds=0.001)
    update_runtime_config(settings.workspace, {"vast_api_key": "fixture-key", "vast_instance_id": 42})
    instance = {"id": 42, "label": "paradigm-comfyui-fixture", "actual_status": "running",
                "intended_status": "running", "cur_state": "running"}
    event = AsyncMock()
    monkeypatch.setattr(lifecycle, "_instances", AsyncMock(return_value=[instance]))
    monkeypatch.setattr(lifecycle, "_adopt_connection", lambda *_: None)
    monkeypatch.setattr(lifecycle, "_proxy_status", AsyncMock(return_value={"ready": True}))
    monkeypatch.setattr(lifecycle, "_oss_worker_status", AsyncMock(return_value={"ok": True, "profiles": []}))
    monkeypatch.setattr(lifecycle, "emit_operator_event", event)
    with pytest.raises(TimeoutError, match="missing exact approved"):
        lifecycle.run_lifecycle(lifecycle.ensure_gpu_ready(
            settings, run_id="fixture", required_oss_profiles=(("approved-profile", "revision"),),
        ))
    assert event.await_args.kwargs["event_type"] == "gpu_error"
