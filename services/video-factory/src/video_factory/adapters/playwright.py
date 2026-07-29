from __future__ import annotations

import json
import os
import time
from urllib.parse import urlparse

from ..commands import run_command
from ..media import create_placeholder_clip, normalize_clip
from ..models import Engine, EngineOutput, Shot
from .base import EngineAdapter, EngineContext


class PlaywrightAdapter(EngineAdapter):
    def run(self, shot: Shot, context: EngineContext) -> EngineOutput:
        started = time.monotonic()
        output = self.output_path(shot, context)
        target_url = str(
            shot.metadata.get("url")
            or next(iter(shot.metadata.get("reference_urls", [])), "")
        )
        if not target_url:
            raise ValueError(f"{shot.id} requires metadata.url or a reference URL")
        parsed = urlparse(target_url)
        if parsed.scheme not in {"http", "https"}:
            raise ValueError("Playwright capture accepts only http and https URLs")
        if (
            context.settings.playwright_allowed_hosts
            and (parsed.hostname or "").lower()
            not in context.settings.playwright_allowed_hosts
        ):
            raise ValueError(
                f"Playwright host is not allow-listed: {parsed.hostname}"
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
            return EngineOutput(
                shot_id=shot.id,
                engine=Engine.PLAYWRIGHT,
                status="dry_run",
                media_path=str(output),
                provenance={"url": target_url},
                warnings=["Browser capture skipped in dry-run mode."],
                elapsed_seconds=time.monotonic() - started,
            )

        actions = shot.metadata.get("playwright_actions", [])
        generated = context.workspace.assets_generated / context.namespace
        generated.mkdir(parents=True, exist_ok=True)
        actions_path = generated / f"{shot.id}-actions.json"
        actions_path.write_text(json.dumps(actions, ensure_ascii=False, indent=2), encoding="utf-8")
        raw = generated / f"{shot.id}.webm"
        environment = os.environ.copy()
        environment["PLAYWRIGHT_ALLOWED_HOSTS"] = ",".join(
            context.settings.playwright_allowed_hosts
        )
        if context.settings.playwright_chromium_executable:
            environment["PLAYWRIGHT_CHROMIUM_EXECUTABLE"] = (
                context.settings.playwright_chromium_executable
            )
        run_command(
            [
                context.settings.playwright_node,
                str(context.settings.playwright_capture_script),
                "--url",
                target_url,
                "--output",
                str(raw),
                "--actions",
                str(actions_path),
                "--width",
                str(context.deliverable.width),
                "--height",
                str(context.deliverable.height),
                "--duration-ms",
                str(int(shot.duration_seconds * 1000)),
            ],
            timeout=context.settings.external_timeout_seconds,
            environment=environment,
        )
        normalize_clip(
            raw,
            output,
            duration_seconds=shot.duration_seconds,
            width=context.deliverable.width,
            height=context.deliverable.height,
            fps=context.deliverable.fps,
        )
        return EngineOutput(
            shot_id=shot.id,
            engine=Engine.PLAYWRIGHT,
            status="completed",
            media_path=str(output),
            provenance={"url": target_url, "actions": str(actions_path)},
            elapsed_seconds=time.monotonic() - started,
        )
