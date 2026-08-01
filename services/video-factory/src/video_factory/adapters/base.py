from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path

from ..models import DeliverableSpec, EngineOutput, Shot, ShotManifest
from ..settings import Settings
from ..workspace import ProjectWorkspace


@dataclass(frozen=True)
class EngineContext:
    settings: Settings
    workspace: ProjectWorkspace
    manifest: ShotManifest
    deliverable: DeliverableSpec
    dry_run: bool
    namespace: str = "default"


class EngineAdapter(ABC):
    @abstractmethod
    def run(self, shot: Shot, context: EngineContext) -> EngineOutput:
        raise NotImplementedError

    @staticmethod
    def output_path(shot: Shot, context: EngineContext, suffix: str = ".mp4") -> Path:
        directory = context.workspace.scenes_raw / context.namespace
        directory.mkdir(parents=True, exist_ok=True)
        return directory / f"{shot.order:03d}-{shot.id}{suffix}"
