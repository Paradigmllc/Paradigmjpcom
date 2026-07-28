from __future__ import annotations

from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Engine(StrEnum):
    HYPERFRAMES = "hyperframes"
    PLAYWRIGHT = "playwright"
    COMFYUI = "comfyui"
    FFMPEG = "ffmpeg"
    BLENDER = "blender"
    MANIM = "manim"
    LIVEPORTRAIT = "liveportrait"
    MUSETALK = "musetalk"
    MOCK = "mock"


class ShotKind(StrEnum):
    TEXT_MOTION = "text_motion"
    UI_CAPTURE = "ui_capture"
    CHART = "chart"
    GENERATIVE = "generative"
    SUPPLIED_EDIT = "supplied_edit"
    THREE_D = "three_d"
    TECHNICAL_DIAGRAM = "technical_diagram"
    PORTRAIT_ANIMATION = "portrait_animation"
    LIP_SYNC = "lip_sync"
    TRANSITION = "transition"


class ReviewStatus(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    CHANGES_REQUESTED = "changes_requested"


class ReviewStage(StrEnum):
    DRAFT = "draft"
    FINAL = "final"


class LikenessConsent(StrEnum):
    GRANTED = "granted"
    NOT_GRANTED = "not_granted"
    NOT_APPLICABLE = "not_applicable"


class Severity(StrEnum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


class BrandSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=200)
    primary_color: str = Field(pattern=r"^#[0-9A-Fa-f]{6}$")
    accent_color: str = Field(pattern=r"^#[0-9A-Fa-f]{6}$")
    text_color: str = Field(default="#FFFFFF", pattern=r"^#[0-9A-Fa-f]{6}$")
    font_family: str = Field(default="Inter", min_length=1, max_length=100)
    logo_path: str | None = None


class RightsDeclaration(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_assets_cleared: bool
    ai_generation_allowed: bool
    likeness_consent: LikenessConsent
    voice_consent: LikenessConsent
    claims_approved_by_client: bool
    notes: str | None = None


class Approver(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=200)
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class DeliverableSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(pattern=r"^[a-z0-9][a-z0-9-]{1,79}$")
    language: str = Field(pattern=r"^[a-z]{2}(?:-[A-Z]{2})?$")
    aspect_ratio: Literal["16:9", "9:16", "1:1", "4:5"]
    width: int = Field(ge=320, le=7680)
    height: int = Field(ge=320, le=7680)
    fps: int = Field(default=30, ge=15, le=120)
    format: Literal["mp4", "mov", "webm"] = "mp4"

    @model_validator(mode="after")
    def dimensions_match_ratio(self) -> DeliverableSpec:
        expected = {
            "16:9": 16 / 9,
            "9:16": 9 / 16,
            "1:1": 1.0,
            "4:5": 4 / 5,
        }[self.aspect_ratio]
        actual = self.width / self.height
        if abs(actual - expected) > 0.02:
            raise ValueError("width and height do not match aspect_ratio")
        return self


class LocalizedSegmentCopy(BaseModel):
    model_config = ConfigDict(extra="forbid")

    headline: str | None = Field(default=None, max_length=500)
    body: str | None = Field(default=None, max_length=2000)


class LocalizationSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")

    objective: str = Field(min_length=10, max_length=2000)
    cta: str = Field(min_length=2, max_length=500)
    segment_overrides: dict[str, LocalizedSegmentCopy] = Field(default_factory=dict)
    reviewer: str | None = Field(default=None, max_length=200)


class ClientBrief(BaseModel):
    model_config = ConfigDict(extra="forbid")

    project_name: str = Field(min_length=3, max_length=120)
    objective: str = Field(min_length=10, max_length=2000)
    audience: str = Field(min_length=10, max_length=2000)
    platforms: list[str] = Field(min_length=1, max_length=12)
    duration_seconds: float = Field(ge=5, le=600)
    languages: list[str] = Field(min_length=1, max_length=12)
    brand: BrandSpec
    source_assets: list[str] = Field(default_factory=list, max_length=200)
    reference_urls: list[str] = Field(default_factory=list, max_length=50)
    rights: RightsDeclaration
    approver: Approver
    deliverables: list[DeliverableSpec] = Field(min_length=1, max_length=20)
    localizations: dict[str, LocalizationSpec] = Field(default_factory=dict)
    requested_shot_kinds: list[ShotKind] = Field(default_factory=list)
    notes: str | None = None

    @model_validator(mode="after")
    def cross_field_checks(self) -> ClientBrief:
        deliverable_languages = {item.language.split("-")[0] for item in self.deliverables}
        brief_languages = {item.split("-")[0] for item in self.languages}
        if not deliverable_languages.issubset(brief_languages):
            raise ValueError("every deliverable language must be declared in languages")
        names = [item.name for item in self.deliverables]
        if len(names) != len(set(names)):
            raise ValueError("deliverable names must be unique")
        primary_language = self.deliverables[0].language.split("-")[0]
        required_localizations = deliverable_languages - {primary_language}
        missing = required_localizations - {key.split("-")[0] for key in self.localizations}
        if missing:
            raise ValueError(
                "localized copy is required for non-primary deliverable languages: "
                + ", ".join(sorted(missing))
            )
        undeclared = {key.split("-")[0] for key in self.localizations} - brief_languages
        if undeclared:
            raise ValueError(
                "localizations contain undeclared languages: " + ", ".join(sorted(undeclared))
            )
        return self


class ValidationFinding(BaseModel):
    severity: Severity
    code: str
    message: str
    field: str | None = None


class ValidationReport(BaseModel):
    valid: bool
    findings: list[ValidationFinding]


class Shot(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(pattern=r"^shot-[0-9]{3}$")
    order: int = Field(ge=1)
    title: str = Field(min_length=1, max_length=200)
    purpose: str = Field(min_length=1, max_length=1000)
    kind: ShotKind
    duration_seconds: float = Field(gt=0, le=120)
    language: str
    headline: str = ""
    body: str = ""
    source_assets: list[str] = Field(default_factory=list)
    engine: Engine | None = None
    routing_reason: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class ShotManifest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    manifest_version: str = "1.0"
    project_id: str
    project_name: str
    brief_sha256: str
    duration_seconds: float
    primary_deliverable: DeliverableSpec
    deliverables: list[DeliverableSpec]
    brand: BrandSpec
    rights: RightsDeclaration
    approver: Approver
    shots: list[Shot]
    localized_shots: dict[str, list[Shot]] = Field(default_factory=dict)
    requires_human_review: bool = True

    @model_validator(mode="after")
    def duration_matches(self) -> ShotManifest:
        groups = {self.primary_deliverable.language: self.shots, **self.localized_shots}
        for language, shots in groups.items():
            total = round(sum(shot.duration_seconds for shot in shots), 3)
            if abs(total - self.duration_seconds) > 0.05:
                raise ValueError(
                    f"shot duration total {total} for {language} does not match "
                    f"{self.duration_seconds}"
                )
            if sorted(shot.order for shot in shots) != list(range(1, len(shots) + 1)):
                raise ValueError(f"shot order must be contiguous for {language}")
        return self

    def shots_for_language(self, language: str) -> list[Shot]:
        normalized = language.split("-")[0]
        primary = self.primary_deliverable.language.split("-")[0]
        if normalized == primary:
            return self.shots
        for key, shots in self.localized_shots.items():
            if key.split("-")[0] == normalized:
                return shots
        raise ValueError(f"No localized shot set for language: {language}")


class EngineOutput(BaseModel):
    shot_id: str
    engine: Engine
    status: Literal["completed", "dry_run", "failed"]
    media_path: str | None
    provenance: dict[str, Any] = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)
    elapsed_seconds: float = Field(ge=0)


class MediaProbe(BaseModel):
    path: str
    duration_seconds: float
    width: int
    height: int
    fps: float
    has_audio: bool
    codec: str | None = None


class QaCheck(BaseModel):
    name: str
    passed: bool
    expected: str | None = None
    actual: str | None = None
    message: str | None = None


class QaReport(BaseModel):
    passed: bool
    probe: MediaProbe | None
    checks: list[QaCheck]


class CreativeReview(BaseModel):
    model_config = ConfigDict(extra="forbid")

    project_id: str
    stage: ReviewStage
    revision: int = Field(default=1, ge=1)
    status: ReviewStatus
    reviewer: str | None = None
    reviewed_at: str | None = None
    notes: str | None = None
    master_path: str
    master_paths: dict[str, str] = Field(default_factory=dict)
    artifact_sha256: dict[str, str] = Field(default_factory=dict)
    qa_passed: bool


ProjectStatus = Literal[
    "production",
    "qa_failed",
    "draft_review_required",
    "draft_approved",
    "finalizing",
    "final_review_required",
    "final_approved",
    "delivered",
    "failed",
]


class ProjectState(BaseModel):
    model_config = ConfigDict(extra="allow")

    project_id: str
    status: ProjectStatus
    updated_at: str
    draft_review_path: str | None = None
    final_review_path: str | None = None
    master_paths: dict[str, str] = Field(default_factory=dict)
    qa_paths: dict[str, str] = Field(default_factory=dict)


class DeliveryItem(BaseModel):
    name: str
    local_path: str
    sha256: str
    remote_uri: str | None = None


class DeliveryRecord(BaseModel):
    project_id: str
    delivered_at: str
    target: str
    items: list[DeliveryItem]
    reviewer: str


class PipelineResult(BaseModel):
    project_id: str
    status: Literal[
        "draft_review_required",
        "final_review_required",
        "delivered",
        "failed",
    ]
    workspace: str
    manifest_path: str
    master_path: str | None = None
    master_paths: dict[str, str] = Field(default_factory=dict)
    qa_path: str | None = None
    review_path: str | None = None
    draft_review_path: str | None = None
    final_review_path: str | None = None
    delivery_path: str | None = None
    warnings: list[str] = Field(default_factory=list)
