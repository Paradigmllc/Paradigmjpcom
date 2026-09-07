"""Read native frame limits only for a recognized, directly connected Wan graph."""
from __future__ import annotations

import math
from collections.abc import Mapping

from .models import Engine, ShotManifest
from .settings import Settings


def known_wan_duration(workflow: Mapping[str, object]) -> float | None:
    def upstream(node: dict[str, object], field: str, kind: str) -> dict[str, object] | None:
        inputs = node.get("inputs")
        edge = inputs.get(field) if isinstance(inputs, dict) else None
        if not isinstance(edge, list) or len(edge) != 2:
            return None
        parent = workflow.get(str(edge[0]))
        return parent if isinstance(parent, dict) and parent.get("class_type") == kind else None

    durations = []
    for node in workflow.values():
        if not isinstance(node, dict) or node.get("class_type") != "SaveVideo":
            continue
        video = upstream(node, "video", "CreateVideo")
        decoded = upstream(video, "images", "VAEDecode") if video else None
        sampler = upstream(decoded, "samples", "KSampler") if decoded else None
        latent = upstream(sampler, "latent_image", "Wan22ImageToVideoLatent") if sampler else None
        if not video or not latent:
            return None
        video_inputs, latent_inputs = video["inputs"], latent["inputs"]
        if not isinstance(video_inputs, dict) or not isinstance(latent_inputs, dict):
            return None
        fps, frames = video_inputs.get("fps"), latent_inputs.get("length")
        if not isinstance(fps, (float, int)) or not isinstance(frames, int):
            return None
        if not math.isfinite(fps) or fps <= 0 or frames <= 0:
            raise ValueError("Wan workflowのフレーム数またはFPSが無効です。")
        durations.append(frames / fps)
    return min(durations) if durations else None


def require_workflow_duration(workflow: Mapping[str, object], seconds: float, fps: int) -> None:
    available = known_wan_duration(workflow)
    if available is not None and seconds > available + 1 / fps + 1e-6:
        raise ValueError(
            f"このworkflowは最大{available:.3f}秒ですが、ショットには{seconds:.3f}秒必要です。"
            "GPUを使う前にショット尺または承認済みworkflowを見直してください。"
        )


def preflight_workflow_durations(manifest: ShotManifest, settings: Settings, *, dry_run: bool) -> None:
    if dry_run:
        return
    from .adapters.base import EngineContext
    from .adapters.comfyui import _load_workflow
    from .workspace import ProjectWorkspace
    workspace = ProjectWorkspace.create(settings.workspace, manifest.project_id)
    for deliverable in manifest.deliverables:
        context = EngineContext(settings, workspace, manifest, deliverable, False, deliverable.name)
        for shot in manifest.shots_for_language(deliverable.language):
            if shot.engine is Engine.COMFYUI:
                _, workflow, _ = _load_workflow(shot, context)
                require_workflow_duration(workflow, shot.duration_seconds, deliverable.fps)
