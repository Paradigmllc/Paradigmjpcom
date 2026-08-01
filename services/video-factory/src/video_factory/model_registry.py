from __future__ import annotations

import os
from datetime import UTC, datetime
from enum import StrEnum
from pathlib import Path

import yaml
from pydantic import BaseModel, ConfigDict, Field, model_validator


class ModelCommercialUse(StrEnum):
    APPROVED = "approved"
    PENDING_REVIEW = "pending_review"
    PROHIBITED = "prohibited"


class ModelRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(pattern=r"^[a-z0-9][a-z0-9-]{2,99}$")
    engine: str = Field(min_length=2, max_length=40)
    model_family: str = Field(min_length=1, max_length=100)
    exact_artifact: str = Field(min_length=1, max_length=500)
    sha256: str = Field(min_length=1, max_length=128)
    code_license: str = Field(min_length=1, max_length=200)
    model_license: str = Field(min_length=1, max_length=500)
    commercial_use: ModelCommercialUse
    regions: list[str] = Field(default_factory=list)
    approved_workflows: list[str] = Field(default_factory=list)
    reviewed_by: str | None = None
    reviewed_at: str | None = None
    source_url: str | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def approved_requires_audit_record(self) -> ModelRecord:
        if self.commercial_use is ModelCommercialUse.APPROVED:
            if not self.reviewed_by or not self.reviewed_at:
                raise ValueError("approved models require reviewed_by and reviewed_at")
            if len(self.sha256) != 64 or any(
                character not in "0123456789abcdef" for character in self.sha256
            ):
                raise ValueError(
                    "approved model SHA-256 must be 64 lowercase hex characters"
                )
            if not self.approved_workflows:
                raise ValueError(
                    "approved models require at least one approved workflow"
                )
        return self


class ModelRegistry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: int = Field(ge=1)
    models: list[ModelRecord] = Field(default_factory=list, max_length=500)

    @model_validator(mode="after")
    def unique_records(self) -> ModelRegistry:
        ids = [item.id for item in self.models]
        artifacts = [item.exact_artifact for item in self.models]
        if len(ids) != len(set(ids)):
            raise ValueError("model ids must be unique")
        if len(artifacts) != len(set(artifacts)):
            raise ValueError("model exact_artifact values must be unique")
        return self

    def by_artifact(self, artifact: str) -> ModelRecord:
        for model in self.models:
            if model.exact_artifact == artifact:
                return model
        raise KeyError(f"Model artifact is not registered: {artifact}")


def load_model_registry(path: str | Path) -> ModelRegistry:
    source = Path(path)
    data = yaml.safe_load(source.read_text(encoding="utf-8"))
    return ModelRegistry.model_validate(data)


def write_model_registry(path: str | Path, registry: ModelRegistry) -> Path:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix(f"{target.suffix}.tmp")
    temporary.write_text(
        yaml.safe_dump(
            registry.model_dump(mode="json", exclude_none=True),
            sort_keys=False,
            allow_unicode=True,
        ),
        encoding="utf-8",
    )
    os.replace(temporary, target)
    return target


def upsert_model_record(
    path: str | Path,
    record: ModelRecord,
    *,
    stamp_approval: bool = False,
) -> ModelRecord:
    registry = load_model_registry(path)
    item = record
    if stamp_approval and item.commercial_use is ModelCommercialUse.APPROVED:
        item = item.model_copy(
            update={"reviewed_at": item.reviewed_at or datetime.now(UTC).isoformat()}
        )
        item = ModelRecord.model_validate(item.model_dump(mode="json"))

    conflicts = [
        existing
        for existing in registry.models
        if existing.exact_artifact == item.exact_artifact and existing.id != item.id
    ]
    if conflicts:
        raise ValueError(
            "Model artifact is already registered under another ID: "
            + conflicts[0].id
        )

    replaced = False
    models: list[ModelRecord] = []
    for existing in registry.models:
        if existing.id == item.id:
            models.append(item)
            replaced = True
        else:
            models.append(existing)
    if not replaced:
        models.append(item)
    models.sort(key=lambda model: model.id)
    updated = registry.model_copy(update={"models": models})
    write_model_registry(path, ModelRegistry.model_validate(updated.model_dump(mode="json")))
    return item


def assert_model_bindings_approved(
    bindings: dict[str, str],
    *,
    workflow_id: str,
    registry_path: str | Path,
    region: str | None,
) -> list[ModelRecord]:
    registry = load_model_registry(registry_path)
    approved: list[ModelRecord] = []
    for artifact in bindings.values():
        try:
            model = registry.by_artifact(artifact)
        except KeyError as error:
            raise ValueError(str(error)) from error
        if model.commercial_use is not ModelCommercialUse.APPROVED:
            raise ValueError(
                f"Model artifact is not commercially approved: {artifact} "
                f"({model.commercial_use.value})"
            )
        if workflow_id not in model.approved_workflows:
            raise ValueError(
                f"Model artifact is not approved for workflow {workflow_id}: {artifact}"
            )
        if region and model.regions and region not in model.regions:
            raise ValueError(
                f"Model artifact is not approved for region {region}: {artifact}"
            )
        approved.append(model)
    return approved


def model_registry_readiness(path: str | Path) -> dict[str, object]:
    source = Path(path)
    if not source.is_file():
        return {
            "exists": False,
            "ready": False,
            "models": [],
            "error": f"Missing registry: {source}",
        }
    try:
        registry = load_model_registry(source)
    except (OSError, ValueError) as error:
        return {"exists": True, "ready": False, "models": [], "error": str(error)}
    records = [
        {
            "id": item.id,
            "artifact": item.exact_artifact,
            "model_family": item.model_family,
            "code_license": item.code_license,
            "model_license": item.model_license,
            "commercial_use": item.commercial_use.value,
            "regions": item.regions,
            "approved_workflows": item.approved_workflows,
            "reviewed_by": item.reviewed_by,
            "reviewed_at": item.reviewed_at,
            "source_url": item.source_url,
            "notes": item.notes,
        }
        for item in registry.models
    ]
    approved = [
        item
        for item in registry.models
        if item.commercial_use is ModelCommercialUse.APPROVED
    ]
    return {
        "exists": True,
        "ready": bool(approved),
        "total": len(registry.models),
        "approved": len(approved),
        "models": records,
    }
