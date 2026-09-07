"""Editable creative inputs, without exposing engine or approval configuration."""
from __future__ import annotations

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field

from .models import Shot


class ShotRevisionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    language: str = Field(default="ja", pattern=r"^[a-z]{2}(?:-[A-Z]{2})?$")
    headline: str | None = Field(default=None, max_length=500)
    body: str | None = Field(default=None, max_length=2000)
    template_id: str | None = Field(default=None, pattern=r"^[a-z0-9][a-z0-9-]{2,79}$")
    prompt: str | None = Field(default=None, min_length=1, max_length=4000)
    narration: str | None = Field(default=None, max_length=2000)
    narration_path: str | None = Field(default=None, max_length=2000)
    reviewer: str = Field(min_length=2, max_length=200)


def replace_shot(shots: list[Shot], shot_id: str, updates: dict[str, object]) -> list[Shot]:
    if not any(shot.id == shot_id for shot in shots):
        raise HTTPException(status_code=404, detail="Shot not found")
    revised = []
    for shot in shots:
        if shot.id != shot_id:
            revised.append(shot)
            continue
        fields = dict(updates)
        metadata = dict(shot.metadata)
        for key in ("prompt", "narration", "narration_path"):
            if key in fields:
                metadata[key] = fields.pop(key)
        # New words must never silently retain the old recording. An absent
        # replacement is visible and blocks real production in audio preflight.
        if ("narration" in updates and updates["narration"] != shot.metadata.get("narration", "")
                and "narration_path" not in updates):
            metadata["narration_path"] = None
        revised.append(Shot.model_validate({
            **shot.model_dump(mode="json"), **fields, "metadata": metadata,
        }))
    return revised
