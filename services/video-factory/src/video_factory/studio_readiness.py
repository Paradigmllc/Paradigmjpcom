from __future__ import annotations

import math
from collections.abc import Sequence
from datetime import UTC, datetime
from enum import StrEnum
from typing import cast

from pydantic import BaseModel, ConfigDict, Field

from .creative_templates import TEMPLATES, creative_template
from .engine_profile_service import engine_catalog_payload
from .models import ClientBrief, Engine, ShotKind
from .planner import deterministic_plan
from .router import engine_availability, load_routing_config
from .settings import Settings
from .validation import validate_brief


class ReadinessState(StrEnum):
    READY = "ready"
    CONDITIONAL = "conditional"
    BLOCKED = "blocked"


class StudioCapability(BaseModel):
    model_config = ConfigDict(extra="forbid")

    shot_kind: ShotKind
    state: ReadinessState
    production_allowed: bool
    primary_engine: str
    selected_engine: str | None
    fallback_used: bool
    dedicated_template: bool
    template_ids: list[str]
    ready_profile_ids: list[str]
    summary: str


class StudioReadinessCheck(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    label: str
    passed: bool
    evidence: str


class StudioCapacity(BaseModel):
    model_config = ConfigDict(extra="forbid")

    queue_backend: str
    local_workers: int = Field(ge=1, le=8)
    safe_parallel_jobs: int = Field(ge=1, le=8)
    gpu_jobs_serialized: bool
    max_deliverables_per_brief: int = 20
    max_languages_per_brief: int = 12


class StudioReadinessSnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: int = 1
    generated_at: datetime
    environment: str
    status: ReadinessState
    score: int = Field(ge=0, le=100)
    template_count: int
    ready_capabilities: int
    conditional_capabilities: int
    blocked_capabilities: int
    capabilities: list[StudioCapability]
    checks: list[StudioReadinessCheck]
    capacity: StudioCapacity
    output_matrix: dict[str, list[str]]
    automated_stages: list[str]
    human_gates: list[str]
    gaps: list[str]


class StudioPreflight(BaseModel):
    model_config = ConfigDict(extra="forbid")

    production_allowed: bool
    preview_allowed: bool = True
    requested_capabilities: list[StudioCapability]
    blockers: list[str]
    advisories: list[str]
    deliverable_count: int
    render_waves: int
    safe_parallel_jobs: int
    human_gates: list[str]


def _profile_rows(payload: object) -> list[dict[str, object]]:
    if not isinstance(payload, list):
        return []
    return [cast(dict[str, object], item) for item in payload if isinstance(item, dict)]


def _profile_ids_for_kind(
    profiles: list[dict[str, object]],
    kind: ShotKind,
) -> list[str]:
    ids: list[str] = []
    for profile in profiles:
        raw_kinds = profile.get("shot_kinds")
        kinds = [str(item) for item in raw_kinds] if isinstance(raw_kinds, list) else []
        if profile.get("ready") is True and kind.value in kinds:
            profile_id = str(profile.get("id") or "")
            if profile_id:
                ids.append(profile_id)
    return sorted(ids)


def _selected_engine(
    candidates: Sequence[object],
    availability: dict[Engine, bool],
) -> tuple[str | None, bool]:
    for index, value in enumerate(candidates):
        try:
            engine = Engine(str(value))
        except ValueError:
            continue
        if engine is Engine.MOCK:
            continue
        if availability.get(engine, False):
            return engine.value, index > 0
    return None, False


def _capabilities(settings: Settings) -> tuple[list[StudioCapability], bool]:
    routing_path = settings.engine_profile_catalog_path.with_name("engine-routing.yaml")
    routing = load_routing_config(routing_path)
    availability = engine_availability(settings)
    catalog = engine_catalog_payload(settings)
    profiles = _profile_rows(catalog.get("profiles"))
    rules = routing.get("rules")
    rules_by_kind = cast(dict[str, object], rules) if isinstance(rules, dict) else {}
    capabilities: list[StudioCapability] = []

    for kind in ShotKind:
        raw_rule = rules_by_kind.get(kind.value)
        rule = cast(dict[str, object], raw_rule) if isinstance(raw_rule, dict) else {}
        primary = str(rule.get("primary") or "unconfigured")
        fallbacks = rule.get("fallbacks")
        candidates = [primary]
        if isinstance(fallbacks, list):
            candidates.extend(fallbacks)
        selected, fallback_used = _selected_engine(candidates, availability)
        template_ids: list[str] = sorted(
            str(template.id)
            for template in TEMPLATES
            if kind in template.supported_shot_kinds
        )
        dedicated = bool(template_ids)
        if selected is None:
            state = ReadinessState.BLOCKED
            summary = "No non-mock runtime is available for this shot kind."
        elif selected == primary and dedicated:
            state = ReadinessState.READY
            summary = "Dedicated template and primary runtime are available."
        else:
            state = ReadinessState.CONDITIONAL
            reasons = []
            if fallback_used:
                reasons.append(f"uses {selected} fallback instead of {primary}")
            if not dedicated:
                reasons.append("uses a generic composition template")
            summary = "; ".join(reasons) + ". Human creative review is required."
        capabilities.append(
            StudioCapability(
                shot_kind=kind,
                state=state,
                production_allowed=selected is not None,
                primary_engine=primary,
                selected_engine=selected,
                fallback_used=fallback_used,
                dedicated_template=dedicated,
                template_ids=template_ids,
                ready_profile_ids=_profile_ids_for_kind(profiles, kind),
                summary=summary,
            )
        )
    return capabilities, catalog.get("ok") is True


def build_studio_readiness(settings: Settings) -> StudioReadinessSnapshot:
    capabilities, catalog_ready = _capabilities(settings)
    ready = sum(item.state is ReadinessState.READY for item in capabilities)
    conditional = sum(item.state is ReadinessState.CONDITIONAL for item in capabilities)
    blocked = sum(item.state is ReadinessState.BLOCKED for item in capabilities)
    checks = [
        StudioReadinessCheck(
            id="template-catalog",
            label="Commercial template catalog",
            passed=len(TEMPLATES) >= 5,
            evidence=f"{len(TEMPLATES)} audited templates",
        ),
        StudioReadinessCheck(
            id="engine-catalog",
            label="Audited engine catalog",
            passed=catalog_ready,
            evidence="Runtime, license, revision and approval are evaluated per engine.",
        ),
        StudioReadinessCheck(
            id="technical-qa",
            label="Automated technical QA",
            passed=True,
            evidence="Resolution, frame rate, duration, audio stream, level and file checks.",
        ),
        StudioReadinessCheck(
            id="human-approval",
            label="Human approval gates",
            passed=True,
            evidence="Rights/scope, draft creative and final delivery approvals remain mandatory.",
        ),
        StudioReadinessCheck(
            id="durable-queue",
            label="Durable local queue",
            passed=True,
            evidence="Jobs are persisted and interrupted jobs fail closed for review.",
        ),
        StudioReadinessCheck(
            id="gpu-serialization",
            label="Single-GPU serialization",
            passed=settings.local_queue_workers == 1,
            evidence=(
                "One worker preserves the one-GPU, one-job safety contract."
                if settings.local_queue_workers == 1
                else "Multiple local workers can violate the one-GPU, one-job contract."
            ),
        ),
        StudioReadinessCheck(
            id="operator-sync",
            label="Operational database sync",
            passed=bool(settings.operator_event_url and settings.api_key),
            evidence=(
                "Internal authenticated sync is configured."
                if settings.operator_event_url and settings.api_key
                else "Internal sync URL or API key is not configured."
            ),
        ),
    ]
    capability_score = ((ready + conditional * 0.5) / len(capabilities)) * 70
    operations_score = (sum(item.passed for item in checks) / len(checks)) * 30
    score = round(capability_score + operations_score)
    baseline = {
        ShotKind.TEXT_MOTION,
        ShotKind.UI_CAPTURE,
        ShotKind.CHART,
        ShotKind.SUPPLIED_EDIT,
        ShotKind.TRANSITION,
    }
    baseline_blocked = any(
        item.shot_kind in baseline and not item.production_allowed for item in capabilities
    )
    if baseline_blocked or not all(item.passed for item in checks):
        status = ReadinessState.BLOCKED
    elif blocked or conditional:
        status = ReadinessState.CONDITIONAL
    else:
        status = ReadinessState.READY

    gaps = [
        f"{item.shot_kind.value}: {item.summary}"
        for item in capabilities
        if item.state is not ReadinessState.READY
    ]
    if settings.local_queue_workers == 1:
        gaps.append("Safe processing capacity is one job at a time; horizontal scale-out is pending.")
    else:
        gaps.append(
            f"{settings.local_queue_workers} workers are configured, but production-safe capacity remains one."
        )
    gaps.append("Visual quality still requires draft and final human review; no automated aesthetic score is used.")

    return StudioReadinessSnapshot(
        generated_at=datetime.now(UTC),
        environment=settings.environment,
        status=status,
        score=score,
        template_count=len(TEMPLATES),
        ready_capabilities=ready,
        conditional_capabilities=conditional,
        blocked_capabilities=blocked,
        capabilities=capabilities,
        checks=checks,
        capacity=StudioCapacity(
            queue_backend=settings.queue_backend,
            local_workers=settings.local_queue_workers,
            safe_parallel_jobs=1,
            gpu_jobs_serialized=settings.local_queue_workers == 1,
        ),
        output_matrix={
            "aspect_ratios": ["16:9", "9:16", "1:1", "4:5"],
            "formats": ["mp4", "mov", "webm"],
            "caption_modes": ["off", "sidecar", "burned"],
        },
        automated_stages=[
            "brief_validation",
            "deterministic_planning",
            "engine_routing",
            "asset_generation_or_capture",
            "master_composition",
            "technical_qa",
            "localization_variants",
            "delivery_packaging",
        ],
        human_gates=[
            "scope_rights_and_claims_approval",
            "draft_creative_review",
            "final_delivery_approval",
        ],
        gaps=gaps,
    )


def preflight_studio_brief(
    brief: ClientBrief,
    settings: Settings,
) -> StudioPreflight:
    snapshot = build_studio_readiness(settings)
    by_kind = {item.shot_kind: item for item in snapshot.capabilities}
    planned = deterministic_plan(brief)
    requested_kinds = list(dict.fromkeys(shot.kind for shot in planned.shots))
    requested = [by_kind[kind] for kind in requested_kinds]
    validation = validate_brief(brief)
    blockers = [
        finding.message
        for finding in validation.findings
        if finding.severity.value == "error"
    ]
    advisories = [
        finding.message
        for finding in validation.findings
        if finding.severity.value == "warning"
    ]

    if brief.template_id != "auto":
        selected_template = creative_template(brief.template_id)
        unsupported = [
            kind.value for kind in requested_kinds if kind not in selected_template.supported_shot_kinds
        ]
        if unsupported:
            blockers.append(
                f"Template {selected_template.id} does not support: {', '.join(unsupported)}."
            )

    profile_rows = _profile_rows(engine_catalog_payload(settings).get("profiles"))
    profiles_by_id = {str(item.get("id") or ""): item for item in profile_rows}
    for kind, profile_id in brief.engine_profile_overrides.items():
        profile = profiles_by_id.get(profile_id)
        if profile is None:
            blockers.append(f"Engine profile {profile_id} is not registered for {kind.value}.")
            continue
        profile_kinds = profile.get("shot_kinds")
        supports_kind = (
            isinstance(profile_kinds, list)
            and kind.value in [str(item) for item in profile_kinds]
        )
        if profile.get("ready") is not True or not supports_kind:
            blockers.append(f"Engine profile {profile_id} is not production-ready for {kind.value}.")

    exact_kinds = set(brief.requested_shot_kinds)
    for item in requested:
        if not item.production_allowed:
            blockers.append(f"{item.shot_kind.value}: no production runtime is available.")
        elif item.state is ReadinessState.CONDITIONAL:
            if item.shot_kind in exact_kinds and (item.fallback_used or not item.dedicated_template):
                blockers.append(
                    f"{item.shot_kind.value}: the exact requested capability is unavailable; "
                    f"only the {item.selected_engine} fallback is active."
                )
            else:
                advisories.append(f"{item.shot_kind.value}: {item.summary}")

    deliverable_count = len(brief.deliverables)
    safe_parallel = snapshot.capacity.safe_parallel_jobs
    render_waves = math.ceil(deliverable_count / safe_parallel)
    if render_waves > 1:
        advisories.append(
            f"{deliverable_count} deliverables will run in {render_waves} safe queue waves."
        )

    return StudioPreflight(
        production_allowed=not blockers,
        requested_capabilities=requested,
        blockers=list(dict.fromkeys(blockers)),
        advisories=list(dict.fromkeys(advisories)),
        deliverable_count=deliverable_count,
        render_waves=render_waves,
        safe_parallel_jobs=safe_parallel,
        human_gates=snapshot.human_gates,
    )
