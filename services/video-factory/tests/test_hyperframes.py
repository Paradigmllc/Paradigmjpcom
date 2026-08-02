from pathlib import Path

import pytest

from video_factory.adapters.base import EngineContext
from video_factory.adapters.hyperframes import HyperFramesAdapter
from video_factory.models import ClientBrief, Engine
from video_factory.planner import deterministic_plan
from video_factory.settings import Settings
from video_factory.workspace import ProjectWorkspace


def test_hyperframes_dry_run_generates_project(
    example_brief: ClientBrief,
    settings: Settings,
    service_root: Path,
    tmp_path: Path,
) -> None:
    manifest = deterministic_plan(example_brief)
    shot = manifest.shots[0].model_copy(update={"engine": Engine.HYPERFRAMES})
    workspace = ProjectWorkspace.create(tmp_path, manifest.project_id)
    context = EngineContext(
        settings=settings,
        workspace=workspace,
        manifest=manifest,
        deliverable=manifest.primary_deliverable,
        dry_run=True,
    )
    output = HyperFramesAdapter(service_root / "templates" / "hyperframes").run(
        shot, context
    )
    assert Path(output.media_path or "").is_file()
    html = workspace.hyperframes / "default" / shot.id / "index.html"
    assert html.is_file()
    rendered = html.read_text(encoding="utf-8")
    assert example_brief.brand.name in rendered or shot.headline in rendered
    assert "data-no-timeline" in rendered
    assert 'id="scene-root"' in rendered
    assert "commercial" not in output.warnings
    assert f'class="scene clip {shot.template_id}' in rendered
    assert "@keyframes texture-drift" in rendered
    assert "@keyframes rule-fill" in rendered


def test_hyperframes_supports_all_commercial_templates(
    example_brief: ClientBrief,
    settings: Settings,
    service_root: Path,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = deterministic_plan(example_brief)
    workspace = ProjectWorkspace.create(tmp_path, manifest.project_id)
    context = EngineContext(
        settings=settings,
        workspace=workspace,
        manifest=manifest,
        deliverable=manifest.primary_deliverable,
        dry_run=True,
    )
    adapter = HyperFramesAdapter(service_root / "templates" / "hyperframes")

    def placeholder(output: str | Path, **_kwargs: object) -> Path:
        target = Path(output)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(b"preview")
        return target

    monkeypatch.setattr("video_factory.adapters.hyperframes.create_placeholder_clip", placeholder)
    for template_id in (
        "kinetic-type",
        "product-spotlight",
        "ui-focus",
        "data-proof",
        "social-cta",
    ):
        shot = manifest.shots[0].model_copy(
            update={"engine": Engine.HYPERFRAMES, "template_id": template_id}
        )
        output = adapter.run(shot, context)
        rendered = (
            workspace.hyperframes / "default" / shot.id / "index.html"
        ).read_text(encoding="utf-8")
        assert output.provenance["template"] == template_id
        assert f'class="scene clip {template_id}' in rendered
