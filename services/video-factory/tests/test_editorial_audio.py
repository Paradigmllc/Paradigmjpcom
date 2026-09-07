import shutil
import wave
from pathlib import Path

import pytest

from video_factory.editorial_audio import _audio_duration, prepare_editorial_audio
from video_factory.models import ClientBrief
from video_factory.planner import deterministic_plan


def tone(path: Path, seconds: float) -> Path:
    with wave.open(str(path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(48000)
        output.writeframes(b"\x10\x10" * int(seconds * 48000))
    return path


def manifest_with_audio(example: ClientBrief, path: Path | None):
    payload = example.model_dump(mode="json")
    payload.update(duration_seconds=6, languages=["en"], deliverables=[payload["deliverables"][0]],
                   localizations={}, chapters=[{"id": "chapter-01", "title": "Audio timing", "shots": [
                       {"title": "Voice", "kind": "text_motion", "duration_seconds": 3,
                        "visual_direction": "Explain the audio timing", "narration": "Test voice",
                        "narration_path": str(path) if path else None},
                       {"title": "Pause", "kind": "text_motion", "duration_seconds": 3,
                        "visual_direction": "Show the intentional silent pause"},
                   ]}])
    return deterministic_plan(ClientBrief.model_validate(payload))


def test_missing_voice_fails_before_encoding(example_brief: ClientBrief, tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="承認済み音声"):
        prepare_editorial_audio(manifest_with_audio(example_brief, None), tmp_path, dry_run=False)
    assert not (tmp_path / "editorial-audio").exists()


def test_audio_preflight_is_read_only(example_brief: ClientBrief, tmp_path: Path) -> None:
    from video_factory.editorial_audio import inspect_editorial_audio
    with pytest.raises(ValueError, match="承認済み音声"):
        inspect_editorial_audio(manifest_with_audio(example_brief, None))
    assert not list(tmp_path.iterdir())


@pytest.mark.skipif(not shutil.which("ffmpeg"), reason="requires ffmpeg integration runtime")
def test_audio_is_padded_into_slots_and_rebuilt(example_brief: ClientBrief, tmp_path: Path) -> None:
    source = tone(tmp_path / "voice.wav", 1)
    manifest = manifest_with_audio(example_brief, source)
    prepared = prepare_editorial_audio(manifest, tmp_path, dry_run=False)
    assert _audio_duration(Path(prepared.audio.narration_path)) == pytest.approx(6, abs=.01)
    with wave.open(prepared.audio.narration_path) as output:
        output.setpos(48000 * 4)
        assert output.readframes(100) == bytes(400)
    tone(source, 4)
    with pytest.raises(ValueError, match="ショット尺"):
        prepare_editorial_audio(prepared, tmp_path, dry_run=False)


@pytest.mark.skipif(not shutil.which("ffmpeg"), reason="requires ffmpeg integration runtime")
def test_overlong_voice_never_silently_truncated(example_brief: ClientBrief, tmp_path: Path) -> None:
    manifest = manifest_with_audio(example_brief, tone(tmp_path / "long.wav", 4))
    with pytest.raises(ValueError, match="ショット尺"):
        prepare_editorial_audio(manifest, tmp_path, dry_run=False)
    assert not (tmp_path / "editorial-audio").exists()
