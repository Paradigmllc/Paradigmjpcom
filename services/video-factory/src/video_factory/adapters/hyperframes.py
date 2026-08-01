from __future__ import annotations

import json
import time
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, StrictUndefined, select_autoescape

from ..commands import run_command
from ..media import create_placeholder_clip
from ..models import Engine, EngineOutput, Shot
from .base import EngineAdapter, EngineContext


class HyperFramesAdapter(EngineAdapter):
    def __init__(self, template_root: Path) -> None:
        self.template_root = template_root
        self.environment = Environment(
            loader=FileSystemLoader(str(template_root)),
            undefined=StrictUndefined,
            autoescape=select_autoescape(["html", "xml"]),
        )

    def run(self, shot: Shot, context: EngineContext) -> EngineOutput:
        started = time.monotonic()
        project = context.workspace.hyperframes / context.namespace / shot.id
        project.mkdir(parents=True, exist_ok=True)
        template = self.environment.get_template("basic-launch/index.html.j2")
        rendered = template.render(
            project_name=context.manifest.project_name,
            composition_id=shot.id,
            language=shot.language,
            duration_seconds=shot.duration_seconds,
            width=context.deliverable.width,
            height=context.deliverable.height,
            fps=context.deliverable.fps,
            eyebrow=shot.title,
            headline=shot.headline or shot.title,
            body=shot.body or shot.purpose,
            brand=context.manifest.brand.model_dump(mode="json"),
        )
        (project / "index.html").write_text(rendered, encoding="utf-8")
        (project / "meta.json").write_text(
            json.dumps(
                {
                    "duration": shot.duration_seconds,
                    "width": context.deliverable.width,
                    "height": context.deliverable.height,
                    "fps": context.deliverable.fps,
                },
                indent=2,
            ),
            encoding="utf-8",
        )
        frame_source = self.template_root / "basic-launch" / "frame.md"
        (project / "frame.md").write_text(
            frame_source.read_text(encoding="utf-8"), encoding="utf-8"
        )

        output = self.output_path(shot, context)
        if context.dry_run:
            create_placeholder_clip(
                output,
                duration_seconds=shot.duration_seconds,
                width=context.deliverable.width,
                height=context.deliverable.height,
                fps=context.deliverable.fps,
                label=shot.title,
            )
            status = "dry_run"
            warnings = [
                "HyperFrames project generated; render replaced with mock media "
                "in dry-run mode."
            ]
        else:
            package = f"hyperframes@{context.settings.hyperframes_version}"
            run_command(
                [context.settings.hyperframes_npx, "--yes", package, "check", ".", "--json"],
                cwd=project,
                timeout=context.settings.external_timeout_seconds,
            )
            run_command(
                [
                    context.settings.hyperframes_npx,
                    "--yes",
                    package,
                    "render",
                    "-c",
                    "index.html",
                    "-o",
                    str(output),
                    "--quality",
                    context.settings.hyperframes_render_quality,
                ],
                cwd=project,
                timeout=context.settings.external_timeout_seconds,
            )
            status = "completed"
            warnings = []

        return EngineOutput(
            shot_id=shot.id,
            engine=Engine.HYPERFRAMES,
            status=status,
            media_path=str(output),
            provenance={
                "version": context.settings.hyperframes_version,
                "project": str(project),
                "template": "basic-launch",
            },
            warnings=warnings,
            elapsed_seconds=time.monotonic() - started,
        )
