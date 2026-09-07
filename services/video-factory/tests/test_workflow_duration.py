import pytest

from video_factory.workflow_duration import known_wan_duration, require_workflow_duration


def workflow():
    return {
        "latent": {"class_type": "Wan22ImageToVideoLatent", "inputs": {"length": 49}},
        "sampler": {"class_type": "KSampler", "inputs": {"latent_image": ["latent", 0]}},
        "decode": {"class_type": "VAEDecode", "inputs": {"samples": ["sampler", 0]}},
        "video": {"class_type": "CreateVideo", "inputs": {"images": ["decode", 0], "fps": 24}},
        "save": {"class_type": "SaveVideo", "inputs": {"video": ["video", 0]}},
    }


def test_fixed_native_length_rejected_before_provider_call():
    assert known_wan_duration(workflow()) == pytest.approx(49 / 24)
    with pytest.raises(ValueError, match="GPUを使う前"):
        require_workflow_duration(workflow(), 5, 24)
    require_workflow_duration(workflow(), 2, 24)


def test_unknown_graph_is_not_given_an_invented_duration():
    graph = workflow()
    graph["decode"]["class_type"] = "FrameInterpolation"
    assert known_wan_duration(graph) is None
    require_workflow_duration(graph, 5, 24)


def test_disconnected_long_latent_does_not_hide_actual_short_source():
    graph = workflow()
    graph["unused"] = {"class_type": "Wan22ImageToVideoLatent", "inputs": {"length": 241}}
    assert known_wan_duration(graph) == pytest.approx(49 / 24)


def test_pipeline_rejects_short_workflow_before_acquiring_gpu(example_brief, settings, monkeypatch):
    from pathlib import Path
    from unittest.mock import AsyncMock, Mock

    import video_factory.adapters.comfyui as comfyui
    import video_factory.pipeline as pipeline
    from video_factory.models import Engine, ValidationReport
    from video_factory.planner import deterministic_plan

    manifest = deterministic_plan(example_brief)
    manifest.shots = [shot.model_copy(update={"engine": Engine.COMFYUI}) for shot in manifest.shots]
    monkeypatch.setattr(pipeline, "validate_task", lambda _: (example_brief, ValidationReport(valid=True, findings=[])))
    monkeypatch.setattr(pipeline, "plan_task", lambda *_: manifest)
    monkeypatch.setattr(pipeline, "route_task", lambda *_: manifest)
    monkeypatch.setattr(comfyui, "_load_workflow", lambda *_: (Path("fixture.json"), workflow(), "fixture"))
    acquire, start = Mock(), AsyncMock()
    monkeypatch.setattr(pipeline, "acquire_gpu_lease", acquire)
    monkeypatch.setattr(pipeline, "ensure_gpu_ready", start)
    monkeypatch.setattr(pipeline, "release_gpu_if_idle", AsyncMock())
    with pytest.raises(ValueError, match="GPUを使う前"):
        pipeline.production_flow.fn("unused.json")
    acquire.assert_not_called()
    start.assert_not_called()
