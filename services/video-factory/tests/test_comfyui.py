from video_factory.adapters.comfyui import find_outputs, replace_placeholders


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
