from __future__ import annotations

import os
import shlex
from datetime import datetime
from enum import StrEnum
from pathlib import Path

import yaml
from pydantic import BaseModel, ConfigDict, Field, HttpUrl, model_validator

from .model_registry import ModelCommercialUse, load_model_registry
from .models import Engine, ShotKind, ShotManifest
from .workflow_registry import WorkflowApproval, load_workflow_registry


class EngineCategory(StrEnum):
    COMPOSITION = "composition"
    VIDEO = "video"
    IMAGE = "image"
    PEOPLE = "people"
    AUDIO = "audio"
    ENHANCEMENT = "enhancement"
    THREE_D = "three_d"


class EngineRuntime(StrEnum):
    BUILTIN = "builtin"
    COMFYUI = "comfyui"
    EXTERNAL_CLI = "external_cli"


class CommercialPolicy(StrEnum):
    ALLOWED = "allowed"
    REVIEW_REQUIRED = "review_required"
    NONCOMMERCIAL = "noncommercial"


class ProfileApproval(StrEnum):
    APPROVED = "approved"
    PENDING = "pending"
    BLOCKED = "blocked"


class InstallMode(StrEnum):
    BUNDLED = "bundled"
    ON_DEMAND = "on_demand"


class ExecutionTarget(StrEnum):
    CONTROL_PLANE = "control_plane"
    MANAGED_GPU = "managed_gpu"


class EngineProfile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(pattern=r"^[a-z0-9][a-z0-9-]{2,79}$")
    display_name: str = Field(min_length=2, max_length=100)
    category: EngineCategory
    summary: str = Field(min_length=10, max_length=500)
    capabilities: list[str] = Field(min_length=1, max_length=20)
    shot_kinds: list[ShotKind] = Field(min_length=1)
    runtime: EngineRuntime
    adapter: Engine
    source_url: HttpUrl
    revision: str = Field(pattern=r"^[a-f0-9]{40}$")
    code_license: str = Field(min_length=2, max_length=120)
    model_license: str = Field(min_length=2, max_length=240)
    commercial_policy: CommercialPolicy
    approval: ProfileApproval
    install_mode: InstallMode
    execution_target: ExecutionTarget | None = None
    gpu_required: bool = False
    min_vram_gb: float = Field(default=0, ge=0, le=192)
    recommended_vram_gb: float = Field(default=0, ge=0, le=192)
    workflow_ids: list[str] = Field(default_factory=list, max_length=20)
    model_ids: list[str] = Field(default_factory=list, max_length=40)
    command_env: str | None = Field(default=None, pattern=r"^[A-Z][A-Z0-9_]+$")
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None
    block_reason: str | None = Field(default=None, max_length=500)
    notes: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def enforce_fail_closed_contract(self) -> EngineProfile:
        if self.gpu_required and self.min_vram_gb <= 0:
            raise ValueError("GPU profiles must declare min_vram_gb")
        if self.recommended_vram_gb < self.min_vram_gb:
            raise ValueError("recommended_vram_gb must be >= min_vram_gb")
        if self.runtime is EngineRuntime.COMFYUI and not self.workflow_ids:
            raise ValueError("ComfyUI profiles must declare workflow_ids")
        if self.runtime is EngineRuntime.EXTERNAL_CLI and not self.command_env:
            raise ValueError("external_cli profiles must declare command_env")
        if self.execution_target is ExecutionTarget.CONTROL_PLANE and self.gpu_required:
            raise ValueError("GPU profiles cannot execute on the control plane")
        if self.approval is ProfileApproval.APPROVED:
            if self.commercial_policy is not CommercialPolicy.ALLOWED:
                raise ValueError("approved profiles must allow commercial use")
            if not self.reviewed_by or not self.reviewed_at:
                raise ValueError("approved profiles require reviewer and review time")
        if self.approval is ProfileApproval.BLOCKED and not self.block_reason:
            raise ValueError("blocked profiles must explain the block")
        return self


def resolved_execution_target(profile: EngineProfile) -> ExecutionTarget:
    if profile.execution_target is not None:
        return profile.execution_target
    if profile.runtime is EngineRuntime.COMFYUI or profile.gpu_required:
        return ExecutionTarget.MANAGED_GPU
    return ExecutionTarget.CONTROL_PLANE


def resolved_adapter(profile: EngineProfile) -> Engine:
    if (
        profile.runtime is EngineRuntime.EXTERNAL_CLI
        and resolved_execution_target(profile) is ExecutionTarget.MANAGED_GPU
    ):
        return Engine.OSS
    return profile.adapter


def selected_profiles(
    manifest: ShotManifest,
    catalog: EngineProfileCatalog,
) -> list[EngineProfile]:
    profile_ids = {
        str(shot.metadata.get("engine_profile_id") or "").strip()
        for shots in [manifest.shots, *manifest.localized_shots.values()]
        for shot in shots
        if str(shot.metadata.get("engine_profile_id") or "").strip()
    }
    return [catalog.get(profile_id) for profile_id in sorted(profile_ids)]


def manifest_requires_managed_gpu(
    manifest: ShotManifest,
    catalog: EngineProfileCatalog,
) -> bool:
    if any(
        shot.engine is Engine.COMFYUI
        for shots in [manifest.shots, *manifest.localized_shots.values()]
        for shot in shots
    ):
        return True
    return any(
        resolved_execution_target(profile) is ExecutionTarget.MANAGED_GPU
        for profile in selected_profiles(manifest, catalog)
    )


def required_managed_oss_profiles(
    manifest: ShotManifest,
    catalog: EngineProfileCatalog,
) -> tuple[tuple[str, str], ...]:
    return tuple(
        (profile.id, profile.revision)
        for profile in selected_profiles(manifest, catalog)
        if profile.runtime is EngineRuntime.EXTERNAL_CLI
        and resolved_execution_target(profile) is ExecutionTarget.MANAGED_GPU
    )


class EngineProfileCatalog(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: int = Field(ge=1)
    updated_at: datetime
    profiles: list[EngineProfile] = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def unique_profiles(self) -> EngineProfileCatalog:
        ids = [profile.id for profile in self.profiles]
        if len(ids) != len(set(ids)):
            raise ValueError("engine profile ids must be unique")
        return self

    def get(self, profile_id: str) -> EngineProfile:
        for profile in self.profiles:
            if profile.id == profile_id:
                return profile
        raise KeyError(f"Unknown engine profile: {profile_id}")


def load_engine_profile_catalog(path: str | Path) -> EngineProfileCatalog:
    source = Path(path)
    data = yaml.safe_load(source.read_text(encoding="utf-8"))
    return EngineProfileCatalog.model_validate(data)


def profile_external_command(profile: EngineProfile) -> tuple[str, ...]:
    if not profile.command_env:
        return ()
    value = os.getenv(profile.command_env, "").strip()
    return tuple(shlex.split(value)) if value else ()


def _workflow_reasons(profile: EngineProfile, workflow_path: Path) -> list[str]:
    if not profile.workflow_ids:
        return []
    if not workflow_path.is_file():
        return ["workflow registry is missing"]
    try:
        registry = load_workflow_registry(workflow_path)
    except (OSError, ValueError) as error:
        return [f"workflow registry is invalid: {error}"]
    reasons: list[str] = []
    for workflow_id in profile.workflow_ids:
        try:
            contract = registry.get(workflow_id)
        except KeyError:
            reasons.append(f"workflow is not registered: {workflow_id}")
            continue
        if not contract.enabled or contract.approval is not WorkflowApproval.APPROVED_BOUND:
            reasons.append(f"workflow is not approved and bound: {workflow_id}")
    return reasons


def _model_reasons(profile: EngineProfile, model_path: Path) -> list[str]:
    if not profile.model_ids:
        return []
    if not model_path.is_file():
        return ["model registry is missing"]
    try:
        registry = load_model_registry(model_path)
    except (OSError, ValueError) as error:
        return [f"model registry is invalid: {error}"]
    records = {record.id: record for record in registry.models}
    reasons: list[str] = []
    for model_id in profile.model_ids:
        record = records.get(model_id)
        if record is None:
            reasons.append(f"exact model artifact is not registered: {model_id}")
        elif record.commercial_use is not ModelCommercialUse.APPROVED:
            reasons.append(f"model is not commercially approved: {model_id}")
    return reasons


def profile_status(
    profile: EngineProfile,
    *,
    availability: dict[Engine, bool],
    workflow_registry_path: Path,
    model_registry_path: Path,
    available_vram_gb: float | None = None,
) -> dict[str, object]:
    reasons: list[str] = []
    if profile.approval is not ProfileApproval.APPROVED:
        reasons.append(profile.block_reason or f"profile approval is {profile.approval.value}")
    if profile.commercial_policy is not CommercialPolicy.ALLOWED:
        reasons.append(f"commercial policy is {profile.commercial_policy.value}")
    adapter = resolved_adapter(profile)
    if adapter is not Engine.OSS and not availability.get(adapter, False):
        reasons.append(f"runtime adapter is unavailable: {adapter.value}")
    if (
        profile.runtime is EngineRuntime.EXTERNAL_CLI
        and resolved_execution_target(profile) is ExecutionTarget.CONTROL_PLANE
        and not profile_external_command(profile)
    ):
        reasons.append(f"worker command is not configured: {profile.command_env}")
    if (
        profile.runtime is EngineRuntime.EXTERNAL_CLI
        and resolved_execution_target(profile) is ExecutionTarget.MANAGED_GPU
        and not availability.get(Engine.OSS, False)
    ):
        reasons.append("authenticated managed GPU OSS worker is unavailable")
    if available_vram_gb is not None and available_vram_gb < profile.min_vram_gb:
        reasons.append(f"VRAM {available_vram_gb:.1f}GB is below {profile.min_vram_gb:.1f}GB")
    reasons.extend(_workflow_reasons(profile, workflow_registry_path))
    reasons.extend(_model_reasons(profile, model_registry_path))
    unique_reasons = list(dict.fromkeys(reasons))
    ready = not unique_reasons
    return {
        **profile.model_dump(mode="json"),
        "resolved_adapter": adapter.value,
        "execution_target": resolved_execution_target(profile).value,
        "ready": ready,
        "state": "ready" if ready else "blocked",
        "reasons": unique_reasons,
    }


def catalog_status(
    catalog: EngineProfileCatalog,
    *,
    availability: dict[Engine, bool],
    workflow_registry_path: Path,
    model_registry_path: Path,
    available_vram_gb: float | None = None,
) -> dict[str, object]:
    profiles = [
        profile_status(
            profile,
            availability=availability,
            workflow_registry_path=workflow_registry_path,
            model_registry_path=model_registry_path,
            available_vram_gb=available_vram_gb,
        )
        for profile in catalog.profiles
    ]
    ready = sum(item["ready"] is True for item in profiles)
    return {
        "version": catalog.version,
        "updated_at": catalog.updated_at.isoformat(),
        "total": len(profiles),
        "ready": ready,
        "blocked": len(profiles) - ready,
        "profiles": profiles,
    }


def assert_profile_routable(
    profile: EngineProfile,
    *,
    shot_kind: ShotKind,
    availability: dict[Engine, bool],
    workflow_registry_path: Path,
    model_registry_path: Path,
) -> None:
    if shot_kind not in profile.shot_kinds:
        raise ValueError(f"Engine profile {profile.id} does not support {shot_kind.value}")
    status = profile_status(
        profile,
        availability=availability,
        workflow_registry_path=workflow_registry_path,
        model_registry_path=model_registry_path,
    )
    reasons = status["reasons"]
    if not isinstance(reasons, list):
        raise ValueError(f"Engine profile status is invalid: {profile.id}")
    if reasons:
        raise ValueError(
            f"Engine profile {profile.id} is not production ready: "
            + "; ".join(str(reason) for reason in reasons)
        )
