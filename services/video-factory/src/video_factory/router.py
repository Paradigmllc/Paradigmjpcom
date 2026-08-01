from __future__ import annotations

import shutil
from pathlib import Path
from typing import Any

import yaml

from .engine_profiles import assert_profile_routable, load_engine_profile_catalog
from .models import Engine, ShotManifest
from .settings import Settings
from .workflow_registry import load_workflow_registry, registry_readiness


class RoutingError(RuntimeError):
    pass


def _comfyui_available(settings: Settings) -> bool:
    if not settings.comfyui_base_url or not settings.comfyui_workflow_registry.is_file():
        return False
    try:
        registry = load_workflow_registry(settings.comfyui_workflow_registry)
        readiness = registry_readiness(registry, settings.comfyui_workflow_root)
    except (ValueError, FileNotFoundError):
        return False
    return bool(readiness["ready"])


def engine_availability(settings: Settings, *, dry_run: bool = False) -> dict[Engine, bool]:
    return {
        Engine.MOCK: True,
        Engine.FFMPEG: shutil.which("ffmpeg") is not None and shutil.which("ffprobe") is not None,
        Engine.HYPERFRAMES: shutil.which(settings.hyperframes_npx) is not None,
        Engine.PLAYWRIGHT: (
            shutil.which(settings.playwright_node) is not None
            and settings.playwright_capture_script.exists()
        ),
        Engine.COMFYUI: _comfyui_available(settings),
        Engine.BLENDER: bool(settings.external_commands.get("blender")),
        Engine.MANIM: bool(settings.external_commands.get("manim")),
        Engine.LIVEPORTRAIT: bool(settings.external_commands.get("liveportrait")),
        Engine.MUSETALK: bool(settings.external_commands.get("musetalk")),
        Engine.OSS: True,
    }


def load_routing_config(path: str | Path) -> dict[str, Any]:
    data = yaml.safe_load(Path(path).read_text(encoding="utf-8"))
    if not isinstance(data, dict) or not isinstance(data.get("rules"), dict):
        raise RoutingError("Routing configuration must contain a rules mapping")
    return data


def route_manifest(
    manifest: ShotManifest,
    settings: Settings,
    routing_path: str | Path,
    *,
    dry_run: bool = False,
) -> ShotManifest:
    config = load_routing_config(routing_path)
    availability = engine_availability(settings, dry_run=dry_run)
    routed = manifest.model_copy(deep=True)
    try:
        profile_catalog = load_engine_profile_catalog(
            settings.engine_profile_catalog_path
        )
    except (OSError, ValueError) as error:
        raise RoutingError(f"Engine profile catalog is invalid: {error}") from error

    shot_groups = [routed.shots, *routed.localized_shots.values()]
    for shots in shot_groups:
        for shot in shots:
            rule = config["rules"].get(shot.kind.value)
            if not isinstance(rule, dict):
                raise RoutingError(f"No routing rule for shot kind: {shot.kind.value}")
            profile_id = str(shot.metadata.get("engine_profile_id") or "").strip()
            profile = None
            if profile_id and not dry_run:
                try:
                    profile = profile_catalog.get(profile_id)
                    assert_profile_routable(
                        profile,
                        shot_kind=shot.kind,
                        availability=availability,
                        workflow_registry_path=settings.comfyui_workflow_registry,
                        model_registry_path=settings.model_registry_path,
                    )
                except (KeyError, ValueError) as error:
                    raise RoutingError(str(error)) from error
                candidates: list[object] = [profile.adapter.value]
                if profile.workflow_ids:
                    shot.metadata["comfyui_workflow_id"] = profile.workflow_ids[0]
            else:
                candidates = [rule.get("primary"), *(rule.get("fallbacks") or [])]
            selected: Engine | None = None
            rejected: list[str] = []
            for value in candidates:
                try:
                    engine = Engine(str(value))
                except ValueError as error:
                    raise RoutingError(f"Unknown engine in routing config: {value}") from error
                if dry_run and engine is not Engine.MOCK:
                    rejected.append(f"{engine.value}:dry-run")
                    continue
                if availability.get(engine, False):
                    selected = engine
                    break
                rejected.append(f"{engine.value}:unavailable")
            if selected is None:
                raise RoutingError(
                    f"No available engine for {shot.id} ({shot.kind.value}); "
                    f"tried {', '.join(rejected)}"
                )
            shot.engine = selected
            shot.routing_reason = (
                f"selected={selected.value}; "
                f"profile={profile.id if profile else 'default'}; "
                f"candidates={','.join(str(item) for item in candidates)}; "
                f"rejected={','.join(rejected) or 'none'}"
            )
    return routed
