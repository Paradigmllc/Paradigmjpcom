from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class RuntimeConfigRequest(BaseModel):
    comfyui_base_url: str | None = None
    comfyui_api_key: str | None = None
    vast_api_key: str | None = None
    vast_template_hash: str | None = None
    gpu_lifecycle_enabled: bool | None = None
    clear_comfyui_api_key: bool = False
    clear_vast_api_key: bool = False


class VastOfferSearchRequest(BaseModel):
    gpu_names: list[str] = Field(default_factory=lambda: ["RTX 4090"])
    min_gpu_ram_gb: float = Field(default=24, ge=8, le=192)
    min_reliability: float = Field(default=0.99, ge=0, le=1)
    verified: bool = True
    instance_type: Literal["on-demand", "ondemand", "bid"] = "on-demand"
    max_hourly_price: float | None = Field(default=None, gt=0, le=100)
    limit: int = Field(default=20, ge=1, le=100)


class VastCreateInstanceRequest(BaseModel):
    offer_id: int = Field(gt=0)
    template_hash_id: str | None = Field(default=None, max_length=128)
    label: str = Field(default="paradigm-comfyui", min_length=2, max_length=120)
    disk_gb: float = Field(default=80, ge=16, le=4096)
    target_state: Literal["running", "stopped"] = "running"
    volume_id: int | None = Field(default=None, gt=0)
    mount_path: str = Field(default="/workspace", pattern=r"^/[A-Za-z0-9_./-]+$")
    env: dict[str, str] = Field(default_factory=dict, max_length=100)
    onstart: str | None = Field(default=None, max_length=20_000)
    runtype: Literal[
        "ssh",
        "jupyter",
        "args",
        "ssh_proxy",
        "ssh_direct",
        "jupyter_proxy",
        "jupyter_direct",
    ] | None = None


class VastInstanceStateRequest(BaseModel):
    state: Literal["running", "stopped"]
