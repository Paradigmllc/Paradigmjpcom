from pathlib import Path
from unittest.mock import Mock

import pytest

from video_factory.adapters.base import EngineContext
from video_factory.adapters.ffmpeg import FFmpegAdapter
from video_factory.adapters.mock import MockAdapter
from video_factory.models import ClientBrief, Engine
from video_factory.planner import deterministic_plan
from video_factory.settings import Settings
from video_factory.shot_execution import execute_shots
from video_factory.workspace import ProjectWorkspace


def context_for(example: ClientBrief, settings: Settings, tmp_path: Path) -> EngineContext:
    manifest = deterministic_plan(example).model_copy(deep=True)
    return EngineContext(settings=settings, workspace=ProjectWorkspace.create(tmp_path, 'cache-qa'),
                         manifest=manifest, deliverable=manifest.primary_deliverable,
                         dry_run=True)


def test_partial_revision_requires_matching_artifact_before_dispatch(
    example_brief: ClientBrief, settings: Settings, tmp_path: Path, service_root: Path,
) -> None:
    context = context_for(example_brief, settings, tmp_path)
    context.deliverable.width = 320
    context.deliverable.height = 320
    context.deliverable.aspect_ratio = "1:1"
    shots = [shot.model_copy(update={'engine': Engine.MOCK, 'duration_seconds': .5})
             for shot in context.manifest.shots[:2]]
    registry = Mock()
    adapter = Mock(wraps=MockAdapter())
    registry.get.return_value = adapter
    execute_shots(shots, context, registry, service_root, None)
    adapter.run.reset_mock()
    result = execute_shots(shots, context, registry, service_root, {shots[0].id})
    assert adapter.run.call_count == 1
    assert result[1].provenance['cache'] == 'verified-explicit-revision'
    Path(result[1].media_path).write_bytes(b'corrupted')
    adapter.run.reset_mock()
    with pytest.raises(ValueError, match='変更'):
        execute_shots(shots, context, registry, service_root, {shots[0].id})
    adapter.run.assert_not_called()


def test_missing_receipts_do_not_silently_regenerate_other_shots(
    example_brief: ClientBrief, settings: Settings, tmp_path: Path, service_root: Path,
) -> None:
    context = context_for(example_brief, settings, tmp_path)
    shots = [shot.model_copy(update={'engine': Engine.MOCK}) for shot in context.manifest.shots]
    registry = Mock()
    registry.get.return_value = Mock(wraps=MockAdapter())
    with pytest.raises(ValueError, match='検証記録'):
        execute_shots(shots, context, registry, service_root, {shots[0].id})
    registry.get.return_value.run.assert_not_called()


def test_production_ffmpeg_never_substitutes_missing_assets(
    example_brief: ClientBrief, settings: Settings, tmp_path: Path,
) -> None:
    from dataclasses import replace
    context = replace(context_for(example_brief, settings, tmp_path), dry_run=False)
    shot = context.manifest.shots[0].model_copy(update={'source_assets': []})
    with pytest.raises(ValueError, match='空動画'):
        FFmpegAdapter().run(shot, context)
