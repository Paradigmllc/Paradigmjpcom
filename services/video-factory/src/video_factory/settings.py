from __future__ import annotations

import json
import os
import shlex
from dataclasses import dataclass
from pathlib import Path

from .runtime_config import load_runtime_config


@dataclass(frozen=True)
class Settings:
    workspace: Path
    api_key: str | None
    environment: str
    log_level: str
    planner_command: tuple[str, ...]
    external_timeout_seconds: int
    hyperframes_version: str
    hyperframes_npx: str
    hyperframes_render_quality: str
    master_compositor: str
    allow_ffmpeg_compositor_fallback: bool
    comfyui_base_url: str | None
    comfyui_api_key: str | None
    comfyui_profile: str
    comfyui_timeout_seconds: int
    comfyui_poll_seconds: float
    comfyui_min_vram_gb: float
    comfyui_workflow_root: Path
    comfyui_workflow_registry: Path
    comfyui_required_workflows: tuple[str, ...]
    comfyui_allow_unregistered_workflows: bool
    model_registry_path: Path
    production_region: str | None
    playwright_node: str
    playwright_capture_script: Path
    playwright_allowed_hosts: tuple[str, ...]
    playwright_chromium_executable: str | None
    external_commands: dict[str, tuple[str, ...]]
    rclone_remote: str | None
    rclone_base_path: str
    prefect_deployment_name: str
    queue_backend: str
    local_queue_workers: int
    gpu_lifecycle_enabled: bool
    gpu_start_timeout_seconds: int
    gpu_stop_timeout_seconds: int
    gpu_poll_seconds: float
    operator_event_url: str | None
    frameio_access_token: str | None
    frameio_create_file_url: str | None
    frameio_api_base_url: str
    frameio_timeout_seconds: float

    @classmethod
    def from_env(cls) -> Settings:
        def command(name: str) -> tuple[str, ...]:
            value = os.getenv(name, "").strip()
            return tuple(shlex.split(value)) if value else ()

        workspace = Path(
            os.getenv("VIDEO_FACTORY_WORKSPACE", "workspace")
        ).expanduser().resolve()
        runtime = load_runtime_config(workspace)
        environment = os.getenv("VIDEO_FACTORY_ENVIRONMENT", "local").strip().lower()
        api_key = (os.getenv("VIDEO_FACTORY_API_KEY") or "").strip() or None
        if api_key is None and environment == "production":
            for name in (
                "VIDEO_FACTORY_INTERNAL_API_KEY",
                "ADMIN_SCRIPT_SECRET",
                "ADMIN_PASSWORD",
            ):
                candidate = (os.getenv(name) or "").strip()
                if candidate:
                    api_key = candidate
                    break
        allowed_hosts = tuple(
            item.strip().lower()
            for item in os.getenv("PLAYWRIGHT_ALLOWED_HOSTS", "").split(",")
            if item.strip()
        )
        environment_comfyui_url = (
            os.getenv("COMFYUI_API_URL")
            or os.getenv("COMFYUI_BASE_URL")
            or ""
        ).rstrip("/") or None
        queue_backend = os.getenv("VIDEO_FACTORY_QUEUE_BACKEND", "auto").strip().lower()
        if queue_backend not in {"auto", "prefect", "local"}:
            raise ValueError(
                "VIDEO_FACTORY_QUEUE_BACKEND must be auto, prefect, or local"
            )
        local_queue_workers = int(os.getenv("VIDEO_FACTORY_LOCAL_QUEUE_WORKERS", "1"))
        if not 1 <= local_queue_workers <= 8:
            raise ValueError("VIDEO_FACTORY_LOCAL_QUEUE_WORKERS must be between 1 and 8")
        lifecycle_default = os.getenv(
            "VIDEO_FACTORY_GPU_LIFECYCLE_ENABLED",
            "true" if environment == "production" else "false",
        ).lower() in {"1", "true", "yes"}
        gpu_lifecycle_enabled = (
            runtime.gpu_lifecycle_enabled
            if runtime.gpu_lifecycle_enabled is not None
            else lifecycle_default
        )
        return cls(
            workspace=workspace,
            api_key=api_key,
            environment=environment,
            log_level=os.getenv("VIDEO_FACTORY_LOG_LEVEL", "INFO"),
            planner_command=command("VIDEO_FACTORY_PLANNER_COMMAND"),
            external_timeout_seconds=int(
                os.getenv("VIDEO_FACTORY_EXTERNAL_TIMEOUT_SECONDS", "1800")
            ),
            hyperframes_version=os.getenv("HYPERFRAMES_VERSION", "0.7.87"),
            hyperframes_npx=os.getenv("HYPERFRAMES_NPX", "npx"),
            hyperframes_render_quality=os.getenv("HYPERFRAMES_RENDER_QUALITY", "draft"),
            master_compositor=os.getenv("VIDEO_FACTORY_MASTER_COMPOSITOR", "hyperframes"),
            allow_ffmpeg_compositor_fallback=os.getenv(
                "VIDEO_FACTORY_ALLOW_FFMPEG_COMPOSITOR_FALLBACK", "false"
            ).lower()
            in {"1", "true", "yes"},
            comfyui_base_url=runtime.comfyui_base_url or environment_comfyui_url,
            comfyui_api_key=(
                runtime.comfyui_api_key
                or os.getenv("COMFYUI_API_KEY")
                or None
            ),
            comfyui_profile=os.getenv("COMFYUI_PROFILE", "local").strip().lower(),
            comfyui_timeout_seconds=int(os.getenv("COMFYUI_TIMEOUT_SECONDS", "1800")),
            comfyui_poll_seconds=float(os.getenv("COMFYUI_POLL_SECONDS", "3")),
            comfyui_min_vram_gb=float(os.getenv("COMFYUI_MIN_VRAM_GB", "16")),
            comfyui_workflow_root=Path(
                os.getenv("COMFYUI_WORKFLOW_ROOT", "workflows/comfyui")
            ).expanduser().resolve(),
            comfyui_workflow_registry=Path(
                os.getenv(
                    "COMFYUI_WORKFLOW_REGISTRY",
                    "workflows/comfyui/registry.yaml",
                )
            ).expanduser().resolve(),
            comfyui_required_workflows=tuple(
                item.strip()
                for item in os.getenv(
                    "COMFYUI_REQUIRED_WORKFLOWS",
                    "abstract-broll-t2v",
                ).split(",")
                if item.strip()
            ),
            comfyui_allow_unregistered_workflows=os.getenv(
                "COMFYUI_ALLOW_UNREGISTERED_WORKFLOWS", "false"
            ).lower()
            in {"1", "true", "yes"},
            model_registry_path=Path(
                os.getenv("VIDEO_FACTORY_MODEL_REGISTRY", "config/model-registry.yaml")
            ).expanduser().resolve(),
            production_region=(
                os.getenv("VIDEO_FACTORY_PRODUCTION_REGION") or ""
            ).strip()
            or None,
            playwright_node=os.getenv("PLAYWRIGHT_NODE", "node"),
            playwright_capture_script=Path(
                os.getenv(
                    "PLAYWRIGHT_CAPTURE_SCRIPT",
                    "tools/playwright-capture/capture.mjs",
                )
            ).expanduser().resolve(),
            playwright_allowed_hosts=allowed_hosts,
            playwright_chromium_executable=(
                os.getenv("PLAYWRIGHT_CHROMIUM_EXECUTABLE") or None
            ),
            external_commands={
                "blender": command("BLENDER_ADAPTER_COMMAND"),
                "manim": command("MANIM_ADAPTER_COMMAND"),
                "liveportrait": command("LIVEPORTRAIT_ADAPTER_COMMAND"),
                "musetalk": command("MUSETALK_ADAPTER_COMMAND"),
            },
            rclone_remote=os.getenv("RCLONE_REMOTE") or None,
            rclone_base_path=os.getenv(
                "RCLONE_BASE_PATH",
                "Paradigm/Video Production Subscription/01_Active Clients",
            ).strip("/"),
            prefect_deployment_name=os.getenv(
                "PREFECT_DEPLOYMENT_NAME",
                "paradigm-video-production/production-flow",
            ),
            queue_backend=queue_backend,
            local_queue_workers=local_queue_workers,
            gpu_lifecycle_enabled=gpu_lifecycle_enabled,
            gpu_start_timeout_seconds=int(
                os.getenv("VIDEO_FACTORY_GPU_START_TIMEOUT_SECONDS", "900")
            ),
            gpu_stop_timeout_seconds=int(
                os.getenv("VIDEO_FACTORY_GPU_STOP_TIMEOUT_SECONDS", "180")
            ),
            gpu_poll_seconds=float(os.getenv("VIDEO_FACTORY_GPU_POLL_SECONDS", "5")),
            operator_event_url=(
                os.getenv("VIDEO_FACTORY_OPERATOR_EVENT_URL")
                or (
                    "http://127.0.0.1:3000/api/video-factory/events"
                    if environment == "production"
                    else ""
                )
            ).strip()
            or None,
            frameio_access_token=os.getenv("FRAMEIO_ACCESS_TOKEN") or None,
            frameio_create_file_url=os.getenv("FRAMEIO_CREATE_FILE_URL") or None,
            frameio_api_base_url=os.getenv(
                "FRAMEIO_API_BASE_URL",
                "https://api.frame.io",
            ).rstrip("/"),
            frameio_timeout_seconds=float(os.getenv("FRAMEIO_TIMEOUT_SECONDS", "900")),
        )

    def as_safe_dict(self) -> dict[str, object]:
        data = self.__dict__.copy()
        data["api_key"] = "configured" if self.api_key else None
        data["comfyui_api_key"] = "configured" if self.comfyui_api_key else None
        data["frameio_access_token"] = (
            "configured" if self.frameio_access_token else None
        )
        data["workspace"] = str(self.workspace)
        data["comfyui_workflow_root"] = str(self.comfyui_workflow_root)
        data["comfyui_workflow_registry"] = str(self.comfyui_workflow_registry)
        data["model_registry_path"] = str(self.model_registry_path)
        data["playwright_capture_script"] = str(self.playwright_capture_script)
        return dict(json.loads(json.dumps(data, default=list)))
