from __future__ import annotations

import time

from ..media import create_placeholder_clip
from ..models import Engine, EngineOutput, Shot
from .base import EngineAdapter, EngineContext


class MockAdapter(EngineAdapter):
    def run(self, shot: Shot, context: EngineContext) -> EngineOutput:
        started = time.monotonic()
        output = self.output_path(shot, context)
        create_placeholder_clip(
            output,
            duration_seconds=shot.duration_seconds,
            width=context.deliverable.width,
            height=context.deliverable.height,
            fps=context.deliverable.fps,
            label=shot.title,
        )
        return EngineOutput(
            shot_id=shot.id,
            engine=Engine.MOCK,
            status="dry_run" if context.dry_run else "completed",
            media_path=str(output),
            provenance={"placeholder": True, "shot_kind": shot.kind.value},
            warnings=["Mock media is never valid for client delivery."],
            elapsed_seconds=time.monotonic() - started,
        )
