from __future__ import annotations

from dataclasses import replace

import pytest

import video_factory.studio_readiness as studio_readiness
from video_factory.models import ClientBrief, Engine, ShotKind
from video_factory.settings import Settings
from video_factory.studio_readiness import (
    ReadinessState,
    build_studio_readiness,
    preflight_studio_brief,
)


def _availability() -> dict[Engine, bool]:
    return {
        engine: engine in {Engine.HYPERFRAMES, Engine.FFMPEG, Engine.PLAYWRIGHT}
        for engine in Engine
    }


def _catalog() -> dict[str, object]:
    return {
        "ok": True,
        "profiles": [
            {
                "id": "hyperframes",
                "ready": True,
                "shot_kinds": ["text_motion", "chart", "transition"],
            },
            {
                "id": "ffmpeg",
                "ready": True,
                "shot_kinds": ["supplied_edit", "transition"],
            },
            {
                "id": "portrait-worker",
                "ready": False,
                "shot_kinds": ["portrait_animation"],
            },
        ],
    }


@pytest.fixture
def deterministic_runtime(
    monkeypatch: pytest.MonkeyPatch,
    settings: Settings,
) -> Settings:
    monkeypatch.setattr(studio_readiness, "engine_availability", lambda _settings: _availability())
    monkeypatch.setattr(studio_readiness, "engine_catalog_payload", lambda _settings: _catalog())
    return replace(
        settings,
        api_key="factory-key",
        operator_event_url="https://www.paradigmjp.com/api/video-factory/events",
        local_queue_workers=1,
    )


def test_readiness_reports_real_routes_and_scale_gaps(
    deterministic_runtime: Settings,
) -> None:
    snapshot = build_studio_readiness(deterministic_runtime)
    by_kind = {item.shot_kind: item for item in snapshot.capabilities}

    assert len(snapshot.capabilities) == 10
    assert snapshot.ready_capabilities == 5
    assert snapshot.conditional_capabilities == 3
    assert snapshot.blocked_capabilities == 2
    assert snapshot.status is ReadinessState.CONDITIONAL
    assert by_kind[ShotKind.TEXT_MOTION].state is ReadinessState.READY
    assert by_kind[ShotKind.GENERATIVE].selected_engine == "hyperframes"
    assert by_kind[ShotKind.GENERATIVE].fallback_used is True
    assert by_kind[ShotKind.PORTRAIT_ANIMATION].state is ReadinessState.BLOCKED
    assert any("one job at a time" in gap for gap in snapshot.gaps)
    assert snapshot.human_gates == [
        "scope_rights_and_claims_approval",
        "draft_creative_review",
        "final_delivery_approval",
    ]


def test_preflight_allows_audited_fallback_but_blocks_missing_people_runtime(
    deterministic_runtime: Settings,
    example_brief: ClientBrief,
) -> None:
    default_result = preflight_studio_brief(example_brief, deterministic_runtime)
    portrait_brief = example_brief.model_copy(
        update={"requested_shot_kinds": [ShotKind.PORTRAIT_ANIMATION]}
    )
    portrait_result = preflight_studio_brief(portrait_brief, deterministic_runtime)
    exact_generative_brief = example_brief.model_copy(
        update={"requested_shot_kinds": [ShotKind.GENERATIVE]}
    )
    exact_generative_result = preflight_studio_brief(
        exact_generative_brief,
        deterministic_runtime,
    )

    assert default_result.production_allowed is True
    assert any("generative" in item for item in default_result.advisories)
    assert default_result.render_waves == 3
    assert portrait_result.production_allowed is False
    assert any("portrait_animation" in item for item in portrait_result.blockers)
    assert exact_generative_result.production_allowed is False
    assert any("exact requested capability" in item for item in exact_generative_result.blockers)


def test_preflight_rejects_forced_template_that_cannot_cover_planned_shots(
    deterministic_runtime: Settings,
    example_brief: ClientBrief,
) -> None:
    brief = example_brief.model_copy(update={"template_id": "kinetic-type"})
    result = preflight_studio_brief(brief, deterministic_runtime)

    assert result.production_allowed is False
    assert any("kinetic-type does not support" in item for item in result.blockers)
