from __future__ import annotations

import time
from pathlib import Path

from ..media import create_placeholder_clip, normalize_clip
from ..models import Engine, EngineOutput, Shot
from .base import EngineAdapter, EngineContext


class FFmpegAdapter(EngineAdapter):
    def run(self, shot: Shot, context: EngineContext) -> EngineOutput:
        started = time.monotonic()
        output = self.output_path(shot, context)
        existing = next((Path(item) for item in shot.source_assets if Path(item).is_file()), None)
        warnings: list[str] = []
        if existing is None:
            create_placeholder_clip(
                output,
                duration_seconds=shot.duration_seconds,
                width=context.deliverable.width,
                height=context.deliverable.height,
                fps=context.deliverable.fps,
                label=shot.title,
            )
            warnings.append("No readable source asset; generated a placeholder clip.")
        else:
            normalize_clip(
                existing,
                output,
                duration_seconds=shot.duration_seconds,
                width=context.deliverable.width,
                height=context.deliverable.height,
                fps=context.deliverable.fps,
                fit="cover" if shot.metadata.get("pet_movie_template_id") else "contain",
            )
        return EngineOutput(
            shot_id=shot.id,
            engine=Engine.FFMPEG,
            status="dry_run" if context.dry_run else "completed",
            media_path=str(output),
            provenance={"source": str(existing) if existing else None},
            warnings=warnings,
            elapsed_seconds=time.monotonic() - started,
        )
