from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, StrictUndefined, select_autoescape

from .commands import CommandError, run_command
from .io import write_json
from .media import assemble_clips
from .models import DeliverableSpec, ShotManifest
from .settings import Settings
from .workspace import ProjectWorkspace


class CompositorError(RuntimeError):
    pass


def _timeline(durations: list[float], clips: list[Path]) -> list[dict[str, Any]]:
    if len(durations) != len(clips):
        raise CompositorError("durations and clips must have equal length")
    position = 0.0
    timeline: list[dict[str, Any]] = []
    for source, duration in zip(clips, durations, strict=True):
        timeline.append(
            {
                "source": source,
                "filename": source.name,
                "start": round(position, 3),
                "duration": round(duration, 3),
            }
        )
        position += duration
    return timeline


def create_hyperframes_master_project(
    *,
    clips: list[Path],
    durations: list[float],
    manifest: ShotManifest,
    deliverable: DeliverableSpec,
    workspace: ProjectWorkspace,
    namespace: str,
    template_root: Path,
) -> Path:
    project = workspace.hyperframes / namespace / "master"
    assets = project / "assets"
    assets.mkdir(parents=True, exist_ok=True)
    timeline = _timeline(durations, clips)
    for item in timeline:
        source = Path(item["source"])
        target = assets / source.name
        if source.resolve() != target.resolve():
            shutil.copy2(source, target)

    environment = Environment(
        loader=FileSystemLoader(str(template_root)),
        undefined=StrictUndefined,
        autoescape=select_autoescape(["html", "xml"]),
    )
    template = environment.get_template("master/index.html.j2")
    rendered = template.render(
        project_name=manifest.project_name,
        language=namespace,
        total_duration=round(sum(durations), 3),
        width=deliverable.width,
        height=deliverable.height,
        fps=deliverable.fps,
        brand=manifest.brand.model_dump(mode="json"),
        clips=timeline,
    )
    (project / "index.html").write_text(rendered, encoding="utf-8")
    (project / "meta.json").write_text(
        json.dumps(
            {
                "duration": round(sum(durations), 3),
                "width": deliverable.width,
                "height": deliverable.height,
                "fps": deliverable.fps,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    write_json(
        project / "timeline.json",
        [
            {key: value for key, value in item.items() if key != "source"}
            for item in timeline
        ],
    )
    return project


def compose_master(
    *,
    clips: list[Path],
    durations: list[float],
    output: Path,
    manifest: ShotManifest,
    deliverable: DeliverableSpec,
    workspace: ProjectWorkspace,
    namespace: str,
    settings: Settings,
    service_root: Path,
    dry_run: bool,
) -> Path:
    compositor = settings.master_compositor.lower()
    if compositor not in {"hyperframes", "ffmpeg"}:
        raise CompositorError(f"Unsupported master compositor: {compositor}")

    project: Path | None = None
    if compositor == "hyperframes":
        project = create_hyperframes_master_project(
            clips=clips,
            durations=durations,
            manifest=manifest,
            deliverable=deliverable,
            workspace=workspace,
            namespace=namespace,
            template_root=service_root / "templates" / "hyperframes",
        )

    used = compositor
    if compositor == "hyperframes" and not dry_run:
        package = f"hyperframes@{settings.hyperframes_version}"
        try:
            run_command(
                [settings.hyperframes_npx, "--yes", package, "lint", ".", "--json"],
                cwd=project,
                timeout=settings.external_timeout_seconds,
            )
            run_command(
                [
                    settings.hyperframes_npx,
                    "--yes",
                    package,
                    "render",
                    "-c",
                    "index.html",
                    "-o",
                    str(output),
                    "--quality",
                    settings.hyperframes_render_quality,
                ],
                cwd=project,
                timeout=settings.external_timeout_seconds,
            )
        except CommandError:
            if not settings.allow_ffmpeg_compositor_fallback:
                raise
            used = "ffmpeg-fallback"
            assemble_clips(clips, output, deliverable, durations)
    else:
        used = "ffmpeg-dry-run" if dry_run and compositor == "hyperframes" else "ffmpeg"
        assemble_clips(clips, output, deliverable, durations)

    write_json(
        output.parent / f"{output.stem}-compositor.json",
        {
            "requested": compositor,
            "used": used,
            "namespace": namespace,
            "hyperframes_project": str(project) if project else None,
            "output": str(output),
        },
    )
    return output
