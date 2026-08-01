from pathlib import Path

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
    assert "@keyframes card-enter" in rendered
    assert "@keyframes progress-fill" in rendered
