"""Serialize local submissions/edits and freeze the inputs a queued run will read."""
from __future__ import annotations

import fcntl
import shutil
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from .io import load_data
from .settings import Settings
from .workspace import slugify


@contextmanager
def submission_guard(settings: Settings) -> Iterator[None]:
    root = settings.workspace / "runs"
    root.mkdir(parents=True, exist_ok=True)
    with (root / ".submission.lock").open("a") as lock:
        fcntl.flock(lock.fileno(), fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(lock.fileno(), fcntl.LOCK_UN)


def input_project_id(brief_path: Path) -> str | None:
    payload = load_data(brief_path)
    name = payload.get("project_name") if isinstance(payload, dict) else None
    return slugify(name) if isinstance(name, str) and name.strip() else None


def snapshot_inputs(
    settings: Settings, run_id: str, brief_path: Path, manifest_path: Path | None,
) -> tuple[Path, Path | None]:
    root = settings.workspace / "runs" / "inputs" / run_id
    root.mkdir(parents=True, exist_ok=False)
    suffix = brief_path.suffix.lower() if brief_path.suffix.lower() in {".yaml", ".yml"} else ".json"
    brief = root / f"brief{suffix}"
    shutil.copyfile(brief_path, brief)
    manifest = root / "shot-manifest.json" if manifest_path else None
    if manifest is not None and manifest_path is not None:
        shutil.copyfile(manifest_path, manifest)
    return brief, manifest
