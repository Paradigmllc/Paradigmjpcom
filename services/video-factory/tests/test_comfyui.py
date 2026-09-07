from dataclasses import replace
from pathlib import Path
from unittest.mock import patch

import httpx
import pytest

from video_factory.adapters.base import EngineContext
from video_factory.adapters.comfyui import (
    ComfyUIAdapter,
    ComfyUIError,
    find_outputs,
    replace_placeholders,
    require_successful_history,
    upload_source_image,
)
from video_factory.models import ClientBrief, MediaProbe, Shot, ShotKind
from video_factory.planner import deterministic_plan
from video_factory.settings import Settings
from video_factory.workspace import ProjectWorkspace


def test_replace_placeholders_preserves_non_exact_strings() -> None:
    workflow = {
        "1": {
            "inputs": {
                "text": "{{prompt}}",
                "seed": "{{seed}}",
                "label": "prefix {{prompt}}",
            }
        }
    }
    result = replace_placeholders(workflow, {"prompt": "hello", "seed": 42})
    assert result["1"]["inputs"]["text"] == "hello"
    assert result["1"]["inputs"]["seed"] == 42
    assert result["1"]["inputs"]["label"] == "prefix {{prompt}}"


def test_find_outputs_handles_video_node_shapes() -> None:
    history = {
        "outputs": {
            "10": {
                "gifs": [
                    {"filename": "clip.mp4", "subfolder": "", "type": "output"}
                ]
            }
        }
    }
    assert find_outputs(history)[0]["filename"] == "clip.mp4"


@pytest.mark.parametrize("event,exception_type,reason", [
    ("execution_error", "torch.OutOfMemoryError", "GPU memory exhausted"),
    ("execution_error", "RuntimeError", "node execution failed"),
    ("execution_interrupted", "", "interrupted"),
])
def test_failed_history_rejects_partial_output_without_secrets(event, exception_type, reason):
    history = {"status": {"status_str": "error", "messages": [[event, {
        "exception_type": exception_type, "exception_message": "SECRET",
        "current_inputs": {"prompt": "PRIVATE"}, "traceback": ["TOKEN"],
    }]]}, "outputs": {"1": {"videos": [{"filename": "partial.mp4"}]}}}
    with pytest.raises(ComfyUIError, match=reason) as error:
        require_successful_history(history)
    assert all(value not in str(error.value) for value in ("SECRET", "PRIVATE", "TOKEN"))


def test_completed_empty_history_fails_but_running_and_legacy_remain_supported():
    with pytest.raises(ComfyUIError, match="without downloadable"):
        require_successful_history({"status": {"completed": True}, "outputs": {}})
    with pytest.raises(ComfyUIError, match="generation failed"):
        require_successful_history({"status": {"status_str": "error"}})
    require_successful_history({"status": {"completed": False}})
    require_successful_history({"outputs": {}})


def test_adapter_stops_on_first_failed_history_before_download_or_wait(
    tmp_path: Path, settings: Settings, example_brief: ClientBrief,
) -> None:
    manifest = deterministic_plan(example_brief)
    context = EngineContext(
        replace(settings, comfyui_base_url="https://gpu.test", comfyui_api_key="fixture"),
        ProjectWorkspace.create(tmp_path, "failed-history"), manifest,
        manifest.primary_deliverable, False,
    )
    paths = []

    def handler(request: httpx.Request) -> httpx.Response:
        paths.append(request.url.path)
        if request.url.path == "/prompt":
            return httpx.Response(200, json={"prompt_id": "failed-job"})
        if request.url.path == "/history/failed-job":
            return httpx.Response(200, json={"failed-job": {
                "status": {"status_str": "error"},
                "outputs": {"1": {"videos": [{"filename": "partial.mp4"}]}},
            }})
        raise AssertionError("Failure must not download partial media")

    client = httpx.Client(base_url="https://gpu.test", transport=httpx.MockTransport(handler))
    module = "video_factory.adapters.comfyui"
    with (
        patch(f"{module}._load_workflow", return_value=(tmp_path / "graph.json", {}, "fixture")),
        patch(f"{module}.httpx.Client", return_value=client),
        patch(f"{module}.time.sleep") as sleep,
        patch(f"{module}.normalize_clip") as normalize,
        pytest.raises(ComfyUIError, match="generation failed"),
    ):
        ComfyUIAdapter().run(manifest.shots[0], context)
    assert paths == ["/prompt", "/history/failed-job"]
    sleep.assert_not_called()
    normalize.assert_not_called()


def test_adapter_rejects_short_motion_before_normalization(
    tmp_path: Path, settings: Settings, example_brief: ClientBrief,
) -> None:
    manifest = deterministic_plan(example_brief)
    shot = manifest.shots[0].model_copy(update={"duration_seconds": 30})
    context = EngineContext(
        replace(settings, comfyui_base_url="https://gpu.test", comfyui_api_key="fixture"),
        ProjectWorkspace.create(tmp_path, "coverage-test"), manifest,
        manifest.primary_deliverable, False,
    )

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/prompt":
            return httpx.Response(200, json={"prompt_id": "fixture-job"})
        if request.url.path == "/history/fixture-job":
            return httpx.Response(200, json={"fixture-job": {"outputs": {
                "1": {"videos": [{"filename": "clip.mp4", "type": "output"}]}
            }}})
        if request.url.path == "/view":
            return httpx.Response(200, content=b"fixture-only")
        raise AssertionError(f"Unexpected route: {request.url.path}")

    client = httpx.Client(base_url="https://gpu.test", transport=httpx.MockTransport(handler))
    module = "video_factory.adapters.comfyui"
    native = MediaProbe(path="clip.mp4", duration_seconds=49/24, width=640,
                        height=360, fps=24, has_audio=False, codec="h264")
    with (
        patch(f"{module}._load_workflow", return_value=(tmp_path / "graph.json", {}, "fixture")),
        patch(f"{module}.httpx.Client", return_value=client),
        patch(f"{module}.probe_motion_source", return_value=native),
        patch(f"{module}.normalize_clip") as normalize,
        pytest.raises(ComfyUIError, match=r"素材 2\.042秒 / 必要 30\.000秒"),
    ):
        ComfyUIAdapter().run(shot, context)
    normalize.assert_not_called()
    assert (context.workspace.assets_generated / "default" / "clip.mp4").is_file()


def test_upload_source_image_sends_the_real_source_to_comfyui(tmp_path: Path) -> None:
    source = tmp_path / "pet.jpg"
    source.write_bytes(b"consented-pet-photo")
    seen_body = b""

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal seen_body
        seen_body = request.read()
        return httpx.Response(200, json={"name": "saved.jpg", "subfolder": "pet"})

    shot = Shot(
        id="shot-001",
        order=1,
        title="Pet",
        purpose="Identity-preserving motion",
        kind=ShotKind.GENERATIVE,
        duration_seconds=4,
        language="ja",
        source_assets=[str(source)],
    )
    with httpx.Client(transport=httpx.MockTransport(handler), base_url="https://gpu.test") as client:
        uploaded = upload_source_image(client, shot)

    assert uploaded == "pet/saved.jpg"
    assert b"consented-pet-photo" in seen_body
    assert b"pet-life-movie-" in seen_body
