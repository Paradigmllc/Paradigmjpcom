from __future__ import annotations

import stat
from pathlib import Path

import pytest

from video_factory.runtime_config import (
    load_runtime_config,
    runtime_config_path,
    update_runtime_config,
)
from video_factory.settings import Settings


def test_runtime_config_round_trip_and_masking(tmp_path: Path) -> None:
    workspace = tmp_path / "workspace"
    saved = update_runtime_config(
        workspace,
        {
            "comfyui_base_url": "https://gpu.example.test:8189/",
            "comfyui_api_key": "comfy-secret",
            "vast_api_key": "vast-secret",
            "vast_template_hash": "template-hash",
            "vast_instance_id": 46258780,
            "gpu_lifecycle_enabled": True,
        },
    )

    assert saved.comfyui_base_url == "https://gpu.example.test:8189"
    loaded = load_runtime_config(workspace)
    assert loaded.comfyui_api_key == "comfy-secret"
    assert loaded.vast_api_key == "vast-secret"
    assert loaded.vast_instance_id == 46258780
    assert loaded.gpu_lifecycle_enabled is True
    assert loaded.safe_dict()["comfyui_api_key_configured"] is True
    assert "comfy-secret" not in str(loaded.safe_dict())
    assert "vast-secret" not in str(loaded.safe_dict())

    mode = stat.S_IMODE(runtime_config_path(workspace).stat().st_mode)
    assert mode == 0o600


def test_settings_use_gui_runtime_overrides(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    workspace = tmp_path / "workspace"
    update_runtime_config(
        workspace,
        {
            "comfyui_base_url": "https://gui-worker.example.test",
            "comfyui_api_key": "gui-key",
        },
    )
    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(workspace))
    monkeypatch.setenv("COMFYUI_API_URL", "https://environment-worker.example.test")
    monkeypatch.setenv("COMFYUI_API_KEY", "environment-key")

    settings = Settings.from_env()

    assert settings.comfyui_base_url == "https://gui-worker.example.test"
    assert settings.comfyui_api_key == "gui-key"


def test_runtime_config_rejects_credential_bearing_url(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="Credentials"):
        update_runtime_config(
            tmp_path / "workspace",
            {"comfyui_base_url": "https://user:password@gpu.example.test"},
        )


def test_initial_production_profile_requires_only_bound_wan_workflow(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(tmp_path / "workspace"))
    monkeypatch.delenv("COMFYUI_REQUIRED_WORKFLOWS", raising=False)

    settings = Settings.from_env()

    assert settings.comfyui_required_workflows == ("abstract-broll-t2v",)


def test_production_uses_existing_internal_admin_secret_for_api_auth(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(tmp_path / "workspace"))
    monkeypatch.setenv("VIDEO_FACTORY_ENVIRONMENT", "production")
    monkeypatch.delenv("VIDEO_FACTORY_API_KEY", raising=False)
    monkeypatch.delenv("VIDEO_FACTORY_INTERNAL_API_KEY", raising=False)
    monkeypatch.setenv("ADMIN_SCRIPT_SECRET", "existing-internal-secret")

    settings = Settings.from_env()

    assert settings.api_key == "existing-internal-secret"
