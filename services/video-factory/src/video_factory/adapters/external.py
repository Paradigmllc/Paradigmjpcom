from __future__ import annotations

import time
from pathlib import Path
from typing import Literal

from ..commands import run_command
from ..io import write_json
from ..media import create_placeholder_clip
from ..models import Engine, EngineOutput, Shot
from .base import EngineAdapter, EngineContext


class ExternalCliAdapter(EngineAdapter):
    def __init__(self, engine: Engine, command: tuple[str, ...]) -> None:
        self.engine = engine
        self.command = command

    def run(self, shot: Shot, context: EngineContext) -> EngineOutput:
        started = time.monotonic()
        status: Literal["completed", "dry_run", "failed"]
        output = self.output_path(shot, context)
        generated = context.workspace.assets_generated / context.namespace
        generated.mkdir(parents=True, exist_ok=True)
        request_path = generated / f"{shot.id}-{self.engine.value}.json"
        write_json(
            request_path,
            {
                "shot": shot.model_dump(mode="json"),
                "deliverable": context.deliverable.model_dump(mode="json"),
                "brand": context.manifest.brand.model_dump(mode="json"),
                "rights": context.manifest.rights.model_dump(mode="json"),
            },
        )
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
            warnings = [f"{self.engine.value} command skipped in dry-run mode."]
        else:
            if not self.command:
                raise RuntimeError(f"No external command is configured for {self.engine.value}")
            run_command(
                [*self.command, "--request", str(request_path), "--output", str(output)],
                timeout=context.settings.external_timeout_seconds,
            )
            if not Path(output).is_file():
                raise RuntimeError(f"External adapter did not create output: {output}")
            status = "completed"
            warnings = []
        return EngineOutput(
            shot_id=shot.id,
            engine=self.engine,
            status=status,
            media_path=str(output),
            provenance={"request": str(request_path), "command": list(self.command)},
            warnings=warnings,
            elapsed_seconds=time.monotonic() - started,
        )
