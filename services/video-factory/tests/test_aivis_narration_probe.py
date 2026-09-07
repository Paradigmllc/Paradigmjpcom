import hashlib
import io
import json
import runpy
import wave
from unittest.mock import patch

import httpx
import pytest


def test_voice_probe_validates_policy_and_records_outputs(service_root, tmp_path):
    module = runpy.run_path(str(service_root / "tools/aivis_narration_probe.py"))
    namespace = module["synthesize"].__globals__
    policy = "reviewed fixture policy"
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(24000)
        audio.writeframes(bytes(24000 * 2 * 2))
    calls = []

    def handle(request):
        calls.append(request.url.path)
        if request.url.path == "/speakers":
            return httpx.Response(200, json=[{"speaker_uuid": "fixture", "styles": [{"id": 1}]}])
        if request.url.path == "/speaker_info":
            return httpx.Response(200, json={"policy": policy})
        if request.url.path == "/audio_query":
            return httpx.Response(200, json={})
        if request.url.path == "/synthesis":
            assert json.loads(request.content)["outputSamplingRate"] == 24000
            return httpx.Response(200, content=buffer.getvalue())
        raise AssertionError("Unexpected endpoint")

    request_path = tmp_path / "request.json"
    request_path.write_text(json.dumps({"speaker_uuid": "fixture", "speaker_id": 1, "credit": "synthetic fixture",
                                        "lines": [{"id": "01", "text": "こんにちは。"}]}))
    client = httpx.Client(base_url="http://fixture", transport=httpx.MockTransport(handle))
    with patch.object(httpx, "Client", return_value=client), patch.dict(
        namespace, REVIEWED_POLICY_SHA256=hashlib.sha256(policy.encode()).hexdigest()
    ):
        module["synthesize"]("http://fixture", request_path, tmp_path / "out")
    meta = json.loads((tmp_path / "out/audio-meta.json").read_text())
    assert meta["human_approved"] is False
    assert meta["voices"][0]["duration_seconds"] == 2
    assert calls == ["/speakers", "/speaker_info", "/audio_query", "/synthesis"]
    with pytest.raises(FileExistsError):
        module["synthesize"]("http://fixture", request_path, tmp_path / "out")


def test_changed_voice_policy_prevents_synthesis(service_root, tmp_path):
    module = runpy.run_path(str(service_root / "tools/aivis_narration_probe.py"))
    request = tmp_path / "request.json"
    request.write_text(json.dumps({"speaker_uuid": "fixture", "speaker_id": 1,
                                   "credit": "synthetic fixture",
                                   "lines": [{"id": "01", "text": "こんにちは。"}]}))
    calls = []

    def handle(request):
        calls.append(request.method)
        body = ([{"speaker_uuid": "fixture", "styles": [{"id": 1}]}]
                if request.url.path == "/speakers" else {"policy": "unreviewed ACML modified terms"})
        return httpx.Response(200, json=body)

    client = httpx.Client(base_url="http://fixture", transport=httpx.MockTransport(handle))
    with patch.object(httpx, "Client", return_value=client), pytest.raises(ValueError, match="policy"):
        module["synthesize"]("http://fixture", request, tmp_path / "out")
    assert calls == ["GET", "GET"]
    assert not (tmp_path / "out/01.wav").exists()


@pytest.mark.parametrize("lines", [[], [{"id": "../unsafe", "text": "hello"}],
    [{"id": "01", "text": "hello"}] * 2, [{"id": "01", "text": "x" * 1501}]])
def test_invalid_voice_request_does_not_call_engine(service_root, tmp_path, lines):
    module = runpy.run_path(str(service_root / "tools/aivis_narration_probe.py"))
    request = tmp_path / "request.json"
    request.write_text(json.dumps({"lines": lines}))
    with patch.object(httpx, "Client") as client, pytest.raises(ValueError):
        module["synthesize"]("http://fixture", request, tmp_path / "out")
    client.assert_not_called()


def test_missing_voice_credit_blocks_before_engine_call(service_root, tmp_path):
    module = runpy.run_path(str(service_root / "tools/aivis_narration_probe.py"))
    request = tmp_path / "request.json"
    request.write_text(json.dumps({"lines": [{"id": "01", "text": "こんにちは。"}]}))
    with patch.object(httpx, "Client") as client, pytest.raises(ValueError, match="credit"):
        module["synthesize"]("http://fixture", request, tmp_path / "out")
    client.assert_not_called()
    assert not (tmp_path / "out").exists()
