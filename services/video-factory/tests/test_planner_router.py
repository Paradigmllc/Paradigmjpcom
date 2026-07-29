from pathlib import Path

from video_factory.models import ClientBrief, Engine
from video_factory.planner import deterministic_plan
from video_factory.router import route_manifest
from video_factory.settings import Settings


def test_planner_duration_and_order(example_brief: ClientBrief) -> None:
    manifest = deterministic_plan(example_brief)
    assert round(sum(item.duration_seconds for item in manifest.shots), 3) == 24
    assert [item.order for item in manifest.shots] == list(range(1, len(manifest.shots) + 1))
    ja_shots = manifest.shots_for_language("ja")
    assert len(ja_shots) == len(manifest.shots)
    assert ja_shots[0].headline.startswith("動画制作チーム")
    assert ja_shots[-1].headline == "最初の動画依頼から始める。"


def test_dry_run_routes_everything_to_mock(
    example_brief: ClientBrief, settings: Settings, service_root: Path
) -> None:
    manifest = deterministic_plan(example_brief)
    routed = route_manifest(
        manifest,
        settings,
        service_root / "config" / "engine-routing.yaml",
        dry_run=True,
    )
    all_shots = [routed.shots, *routed.localized_shots.values()]
    assert all(item.engine is Engine.MOCK for group in all_shots for item in group)
    assert all(
        "dry-run" in (item.routing_reason or "")
        for group in all_shots
        for item in group
    )
