import json
import runpy
import sys
from types import SimpleNamespace
from unittest.mock import Mock, patch

import pytest


def test_local_asr_never_downloads_or_prompts_with_reference(service_root, tmp_path):
    module = runpy.run_path(str(service_root / "tools/local_transcript_probe.py"))
    media = tmp_path / "review.mp4"
    media.write_bytes(b"fixture")
    model_path = tmp_path / "pinned-model"
    model_path.mkdir()
    model = Mock()
    model.transcribe.return_value = ([SimpleNamespace(start=0, end=1, text="テスト", avg_logprob=-.1, words=[])],
                                     SimpleNamespace(language="ja", duration=1))
    factory = Mock(return_value=model)
    with patch.dict(sys.modules, faster_whisper=SimpleNamespace(WhisperModel=factory)):
        module["transcribe"](media, model_path, tmp_path / "asr.json")
    assert factory.call_args.kwargs["local_files_only"] is True
    assert factory.call_args.kwargs["device"] == "cpu"
    assert "initial_prompt" not in model.transcribe.call_args.kwargs
    assert json.loads((tmp_path / "asr.json").read_text())["human_approved"] is False
    with pytest.raises(FileExistsError):
        module["transcribe"](media, model_path, tmp_path / "asr.json")


def test_missing_local_inputs_fail_without_model_import(service_root, tmp_path):
    module = runpy.run_path(str(service_root / "tools/local_transcript_probe.py"))
    with pytest.raises(ValueError, match="local model"):
        module["transcribe"](tmp_path / "missing.mp4", tmp_path, tmp_path / "asr.json")
