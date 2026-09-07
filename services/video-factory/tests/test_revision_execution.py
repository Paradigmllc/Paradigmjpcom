from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest

import video_factory.local_jobs as jobs
import video_factory.pipeline as pipeline
from video_factory.io import write_model
from video_factory.job_inputs import input_project_id, snapshot_inputs
from video_factory.models import ClientBrief, Engine, PipelineResult, ValidationReport
from video_factory.planner import deterministic_plan
from video_factory.settings import Settings
from video_factory.workflow_duration import preflight_workflow_durations


def test_partial_render_routes_only_selected_shots_after_reuse_verification(
    example_brief: ClientBrief, tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(tmp_path / "workspace"))
    manifest = deterministic_plan(example_brief)
    for shots in [manifest.shots, *manifest.localized_shots.values()]:
        for shot in shots:
            shot.engine = Engine.HYPERFRAMES if shot.id == "shot-001" else Engine.COMFYUI
    path = tmp_path / "manifest.json"
    write_model(path, manifest)
    calls = []
    monkeypatch.setattr(pipeline, "validate_task", lambda _: (example_brief, ValidationReport(valid=True, findings=[])))
    monkeypatch.setattr(pipeline, "preflight_shot_reuse", lambda *_a, **_k: calls.append("reuse"))

    def durations(_manifest, _settings, **kwargs):
        assert calls == ["reuse"]
        assert kwargs["shot_ids"] == {"shot-001"}
        calls.append("durations")

    def run(**kwargs):
        assert len(kwargs["manifest"].shots) == len(manifest.shots)
        assert kwargs["rerender_shot_ids"] == {"shot-001"}
        calls.append("compose-all")
        return PipelineResult(project_id=manifest.project_id, status="draft_review_required",
                              workspace=str(tmp_path), manifest_path=str(path))

    monkeypatch.setattr(pipeline, "preflight_workflow_durations", durations)
    monkeypatch.setattr(pipeline, "_production_flow_impl", run)
    ensure = AsyncMock()
    release = AsyncMock()
    monkeypatch.setattr(pipeline, "ensure_gpu_ready", ensure)
    monkeypatch.setattr(pipeline, "release_gpu_if_idle", release)
    pipeline.production_flow.fn("brief.json", manifest_path=str(path), rerender_shot_ids=["shot-001"])
    ensure.assert_not_called()
    assert calls == ["reuse", "durations", "compose-all"]

    def corrupt(*_a, **_k):
        raise ValueError("Corrupt untouched artifact")

    monkeypatch.setattr(pipeline, "preflight_shot_reuse", corrupt)
    with pytest.raises(ValueError, match="Corrupt"):
        pipeline.production_flow.fn("brief.json", manifest_path=str(path), rerender_shot_ids=["shot-002"])
    ensure.assert_not_called()
    for selection in ([], ["shot-999"]):
        with pytest.raises(ValueError, match="ショットID"):
            pipeline.production_flow.fn("brief.json", manifest_path=str(path), rerender_shot_ids=selection)
    ensure.assert_not_called()


def test_workflow_preflight_skips_only_unselected_gpu_shots(
    example_brief: ClientBrief, tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
) -> None:
    import video_factory.adapters.comfyui as comfy

    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(tmp_path))
    manifest = deterministic_plan(example_brief)
    for shots in [manifest.shots, *manifest.localized_shots.values()]:
        for shot in shots:
            shot.engine = Engine.HYPERFRAMES if shot.id == "shot-001" else Engine.COMFYUI
    loader = MagicMock(side_effect=ValueError("Selected GPU must pass workflow approval"))
    monkeypatch.setattr(comfy, "_load_workflow", loader)
    preflight_workflow_durations(manifest, Settings.from_env(), dry_run=False, shot_ids={"shot-001"})
    loader.assert_not_called()
    with pytest.raises(ValueError, match="approval"):
        preflight_workflow_durations(manifest, Settings.from_env(), dry_run=False, shot_ids={"shot-002"})


def test_local_queue_freezes_inputs_rejects_duplicate_project_and_exposes_qa_failure(
    example_brief: ClientBrief, tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(tmp_path))
    settings = Settings.from_env()
    brief = tmp_path / "brief.json"
    manifest_path = tmp_path / "manifest.json"
    manifest = deterministic_plan(example_brief)
    write_model(brief, example_brief)
    write_model(manifest_path, manifest)
    original = manifest_path.read_bytes()
    monkeypatch.setattr(jobs, "_executor", lambda _: MagicMock())
    selected = ["shot-001"]
    job = jobs.submit_local_job(settings, brief_path=brief, dry_run=False,
                                planner_provider="deterministic", auto_approve=False,
                                delivery_target="local", manifest_path=manifest_path,
                                rerender_shot_ids=selected)
    selected.append("shot-002")
    manifest_path.write_text("Changed after enqueue")
    assert Path(job.manifest_path or "").read_bytes() == original
    assert job.brief_path != str(brief)
    assert job.rerender_shot_ids == ["shot-001"]
    assert job.project_id == manifest.project_id
    with pytest.raises(ValueError, match="生成待ち"):
        jobs.submit_local_job(settings, brief_path=brief, dry_run=False,
                              planner_provider="deterministic", auto_approve=False,
                              delivery_target="local")
    result = PipelineResult(project_id=manifest.project_id, status="failed", workspace=str(tmp_path),
                            manifest_path=str(manifest_path), qa_path=str(tmp_path / "qa.json"))
    monkeypatch.setattr(jobs, "production_flow", lambda **_: result)
    jobs._run_job(settings, job)
    persisted = jobs.load_local_job(settings, job.run_id)
    assert persisted is not None and persisted.status == "failed"
    assert persisted.error and "QA" in persisted.error
    assert persisted.result and persisted.result["qa_path"] == result.qa_path
    jobs.require_project_idle(settings, manifest.project_id)


def test_queue_preserves_yaml_brief_format(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    from video_factory.io import load_data

    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(tmp_path))
    original = tmp_path / "source.yaml"
    original.write_text("project_name: yaml-project\nobjective: Safe snapshot\n")
    assert input_project_id(original) == "yaml-project"
    frozen, manifest = snapshot_inputs(Settings.from_env(), "fixture-run", original, None)
    assert manifest is None and frozen.suffix == ".yaml"
    assert load_data(frozen)["project_name"] == "yaml-project"
