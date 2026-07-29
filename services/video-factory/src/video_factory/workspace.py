from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ProjectWorkspace:
    root: Path
    assets_input: Path
    assets_generated: Path
    scenes_raw: Path
    scenes_normalized: Path
    hyperframes: Path
    master: Path
    qa: Path
    review: Path
    deliverables: Path

    @classmethod
    def create(cls, base: Path, project_id: str) -> ProjectWorkspace:
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,71}", project_id):
            raise ValueError("project_id must be a safe lowercase slug")
        root = base / "projects" / project_id
        workspace = cls(
            root=root,
            assets_input=root / "assets" / "input",
            assets_generated=root / "assets" / "generated",
            scenes_raw=root / "scenes" / "raw",
            scenes_normalized=root / "scenes" / "normalized",
            hyperframes=root / "hyperframes",
            master=root / "master",
            qa=root / "qa",
            review=root / "review",
            deliverables=root / "deliverables",
        )
        for path in workspace.__dict__.values():
            Path(path).mkdir(parents=True, exist_ok=True)
        return workspace


def slugify(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return normalized[:72] or "project"
