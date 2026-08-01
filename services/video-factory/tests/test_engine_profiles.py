from __future__ import annotations

from pathlib import Path

import pytest

from video_factory.engine_profiles import (
    CommercialPolicy,
    EngineProfileCatalog,
    ProfileApproval,
    catalog_status,
    load_engine_profile_catalog,
)
from video_factory.models import ClientBrief, Engine, ShotKind
from video_factory.planner import deterministic_plan
from video_factory.router import RoutingError, route_manifest
from video_factory.settings import Settings


def test_major_oss_catalog_is_immutable_and_excludes_new_wan_profiles(
    service_root: Path,
) -> None:
    catalog = load_engine_profile_catalog(
        service_root / "config" / "engine-profiles.yaml"
    )

    assert len(catalog.profiles) == 40
    assert len({profile.id for profile in catalog.profiles}) == 40
    assert all(len(profile.revision) == 40 for profile in catalog.profiles)
    assert not any("wan" in profile.id for profile in catalog.profiles)
    assert {
        "ltx-video",
        "hunyuan-video-1-5",
        "cogvideox",
        "mochi-1",
        "framepack",
        "skyreels-v3",
        "nvidia-cosmos-3",
        "pyramid-flow",
        "open-sora-plan",
        "videocrafter2",
        "dynamicrafter",
        "whisper",
        "liveportrait",
        "real-esrgan",
        "triposr",
    }.issubset({profile.id for profile in catalog.profiles})


def test_noncommercial_and_oversized_profiles_are_fail_closed(
    service_root: Path,
) -> None:
    catalog = load_engine_profile_catalog(
        service_root / "config" / "engine-profiles.yaml"
    )

    for profile_id in (
        "wav2lip",
        "f5-tts",
        "fish-speech",
        "musicgen",
        "codeformer",
        "open-sora-plan",
        "videocrafter2",
        "dynamicrafter",
    ):
        profile = catalog.get(profile_id)
        assert profile.commercial_policy is CommercialPolicy.NONCOMMERCIAL
        assert profile.approval is ProfileApproval.BLOCKED
        assert profile.block_reason

    open_sora = catalog.get("open-sora")
    assert open_sora.approval is ProfileApproval.BLOCKED
    assert open_sora.min_vram_gb == 48
    assert "24GB" in (open_sora.block_reason or "")
    cosmos = catalog.get("nvidia-cosmos-3")
    assert cosmos.approval is ProfileApproval.BLOCKED
    assert cosmos.min_vram_gb == 80


def test_catalog_readiness_requires_runtime_workflow_model_and_worker(
    service_root: Path,
) -> None:
    catalog = load_engine_profile_catalog(
        service_root / "config" / "engine-profiles.yaml"
    )
    availability = dict.fromkeys(Engine, True)
    result = catalog_status(
        catalog,
        availability=availability,
        workflow_registry_path=service_root / "workflows" / "comfyui" / "registry.yaml",
        model_registry_path=service_root / "config" / "model-registry.yaml",
        available_vram_gb=24,
    )

    assert result["total"] == 40
    assert result["ready"] == 3
    profiles = {str(item["id"]): item for item in result["profiles"]}
    assert profiles["hyperframes"]["ready"] is True
    assert profiles["ltx-video"]["ready"] is False
    assert "workflow is not approved and bound: ltx-video-t2v" in profiles["ltx-video"]["reasons"]
    assert profiles["open-sora"]["ready"] is False
    assert any("below 48.0GB" in str(reason) for reason in profiles["open-sora"]["reasons"])
    assert any("BLENDER_ADAPTER_COMMAND" in str(reason) for reason in profiles["blender"]["reasons"])


def test_pending_profile_cannot_route_production_but_preview_uses_mock(
    example_brief: ClientBrief,
    settings: Settings,
    service_root: Path,
) -> None:
    brief = example_brief.model_copy(
        update={
            "requested_shot_kinds": [ShotKind.GENERATIVE],
            "engine_profile_overrides": {ShotKind.GENERATIVE: "ltx-video"},
        }
    )
    manifest = deterministic_plan(brief)

    with pytest.raises(RoutingError, match="ltx-video is not production ready"):
        route_manifest(
            manifest,
            settings,
            service_root / "config" / "engine-routing.yaml",
            dry_run=False,
        )

    preview = route_manifest(
        manifest,
        settings,
        service_root / "config" / "engine-routing.yaml",
        dry_run=True,
    )
    assert all(shot.engine is Engine.MOCK for shot in preview.shots)


def test_catalog_schema_rejects_approved_noncommercial_profile(
    service_root: Path,
) -> None:
    catalog = load_engine_profile_catalog(
        service_root / "config" / "engine-profiles.yaml"
    )
    payload = catalog.model_dump(mode="json")
    payload["profiles"][0]["commercial_policy"] = "noncommercial"

    with pytest.raises(ValueError, match="approved profiles must allow commercial use"):
        EngineProfileCatalog.model_validate(payload)
