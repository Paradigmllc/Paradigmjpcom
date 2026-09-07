"""Explicit partial re-renders may reuse only verified, matching shot artifacts."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from .adapters.base import EngineContext
from .adapters.registry import AdapterRegistry
from .io import file_sha256, write_json
from .models import EngineOutput, Shot, ShotManifest
from .settings import Settings
from .workspace import ProjectWorkspace


def validate_rerender_selection(
    manifest: ShotManifest, shot_ids: list[str] | None,
) -> set[str] | None:
    if shot_ids is None:
        return None
    selected = set(shot_ids)
    known = {shot.id for shot in manifest.shots}
    if not selected or not selected.issubset(known):
        raise ValueError("再生成には既存のショットIDを1件以上指定してください。")
    return selected


def render_revision(context: EngineContext, service_root: Path) -> str:
    settings = context.settings
    files = [
        *sorted((service_root / "src" / "video_factory").rglob("*.py")),
        *sorted((service_root / "templates").rglob("*.j2")),
        *sorted(settings.comfyui_workflow_root.rglob("*.json")),
        settings.comfyui_workflow_registry, settings.model_registry_path,
        settings.engine_profile_catalog_path,
    ]
    # Hash command/configuration identities without recording credentials or endpoints.
    payload = {
        "files": [(str(path), file_sha256(path)) for path in files if path.is_file()],
        "hyperframes": [settings.hyperframes_version, settings.hyperframes_render_quality],
        "external_commands": settings.external_commands,
        "dry_run": context.dry_run,
    }
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()


def shot_identity(shot: Shot, context: EngineContext, revision: str) -> str:
    assets = []
    for asset in shot.source_assets:
        path = Path(asset)
        if not path.is_file():
            raise ValueError(f"{shot.id}: 再利用の検証に必要な素材がありません。")
        assets.append((asset, file_sha256(path)))
    payload = {
        "schema": 1, "revision": revision, "shot": shot.model_dump(mode="json"),
        "brand": context.manifest.brand.model_dump(mode="json"),
        "deliverable": context.deliverable.model_dump(mode="json"), "assets": assets,
    }
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()


def verified_output(receipt: Path, identity: str, expected: Path) -> EngineOutput:
    if not receipt.is_file() or not expected.is_file():
        raise ValueError("再利用するショットの検証記録または動画がありません。全ショットを再実行してください。")
    data = json.loads(receipt.read_text(encoding="utf-8"))
    if data.get("identity") != identity or data.get("artifact_sha256") != file_sha256(expected):
        raise ValueError("再利用するショットの入力・実装または動画が変更されています。全ショットを再実行してください。")
    output = EngineOutput.model_validate(data["output"])
    if output.status == "failed" or output.media_path != str(expected):
        raise ValueError("再利用するショットの成果物記録が一致しません。")
    return output.model_copy(update={
        "elapsed_seconds": 0,
        "provenance": {**output.provenance, "cache": "verified-explicit-revision"},
    })


def preflight_shot_reuse(
    manifest: ShotManifest, settings: Settings, service_root: Path,
    rerender_shot_ids: list[str] | None, *, dry_run: bool,
) -> None:
    if rerender_shot_ids is None:
        return
    workspace = ProjectWorkspace.create(settings.workspace, manifest.project_id)
    registry = AdapterRegistry(settings, service_root)
    for deliverable in manifest.deliverables:
        context = EngineContext(settings, workspace, manifest, deliverable, dry_run, deliverable.name)
        revision = render_revision(context, service_root)
        for shot in manifest.shots_for_language(deliverable.language):
            if shot.id in rerender_shot_ids:
                continue
            if shot.engine is None:
                raise ValueError(f"Shot was not routed: {shot.id}")
            verified_output(
                workspace.root / "shot-receipts" / deliverable.name / f"{shot.id}.json",
                shot_identity(shot, context, revision), registry.get(shot.engine).output_path(shot, context),
            )


def execute_shots(
    shots: list[Shot], context: EngineContext, registry: AdapterRegistry,
    service_root: Path, rerender_shot_ids: set[str] | None,
) -> list[EngineOutput]:
    revision = render_revision(context, service_root)
    identities = {shot.id: shot_identity(shot, context, revision) for shot in shots}
    receipts = context.workspace.root / "shot-receipts" / context.namespace
    receipts.mkdir(parents=True, exist_ok=True)
    cached: dict[str, EngineOutput] = {}
    # Check every untouched artifact BEFORE any paid/slow engine is dispatched.
    for shot in shots:
        if shot.engine is None:
            raise ValueError(f"Shot was not routed: {shot.id}")
        if rerender_shot_ids is not None and shot.id not in rerender_shot_ids:
            cached[shot.id] = verified_output(
                receipts / f"{shot.id}.json", identities[shot.id],
                registry.get(shot.engine).output_path(shot, context),
            )
    outputs = []
    for shot in shots:
        if shot.id in cached:
            outputs.append(cached[shot.id])
            continue
        if shot.engine is None:
            raise ValueError(f"Shot was not routed: {shot.id}")
        output = registry.get(shot.engine).run(shot, context)
        if output.status == "failed" or not output.media_path or not Path(output.media_path).is_file():
            raise ValueError(f"{shot.id}: エンジンが有効な動画を返しませんでした。")
        receipt = receipts / f"{shot.id}.json"
        pending = receipt.with_suffix(".pending")
        write_json(pending, {"identity": identities[shot.id],
                            "artifact_sha256": file_sha256(output.media_path),
                            "output": output.model_dump(mode="json")})
        pending.replace(receipt)
        outputs.append(output)
    return outputs
