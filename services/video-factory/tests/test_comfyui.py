from pathlib import Path

import httpx

from video_factory.adapters.comfyui import (
    find_outputs,
    replace_placeholders,
    upload_source_image,
)
from video_factory.models import Shot, ShotKind


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
