from __future__ import annotations

from pathlib import Path

from ..models import Engine
from ..settings import Settings
from .base import EngineAdapter
from .comfyui import ComfyUIAdapter
from .external import ExternalCliAdapter
from .ffmpeg import FFmpegAdapter
from .hyperframes import HyperFramesAdapter
from .mock import MockAdapter
from .playwright import PlaywrightAdapter


class AdapterRegistry:
    def __init__(self, settings: Settings, service_root: Path) -> None:
        self.adapters: dict[Engine, EngineAdapter] = {
            Engine.MOCK: MockAdapter(),
            Engine.FFMPEG: FFmpegAdapter(),
            Engine.HYPERFRAMES: HyperFramesAdapter(service_root / "templates" / "hyperframes"),
            Engine.PLAYWRIGHT: PlaywrightAdapter(),
            Engine.COMFYUI: ComfyUIAdapter(),
            Engine.BLENDER: ExternalCliAdapter(
                Engine.BLENDER, settings.external_commands.get("blender", ())
            ),
            Engine.MANIM: ExternalCliAdapter(
                Engine.MANIM, settings.external_commands.get("manim", ())
            ),
            Engine.LIVEPORTRAIT: ExternalCliAdapter(
                Engine.LIVEPORTRAIT, settings.external_commands.get("liveportrait", ())
            ),
            Engine.MUSETALK: ExternalCliAdapter(
                Engine.MUSETALK, settings.external_commands.get("musetalk", ())
            ),
        }

    def get(self, engine: Engine) -> EngineAdapter:
        try:
            return self.adapters[engine]
        except KeyError as error:
            raise KeyError(f"No adapter is registered for {engine.value}") from error
