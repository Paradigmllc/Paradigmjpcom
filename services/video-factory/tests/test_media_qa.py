from pathlib import Path

from video_factory.media import create_placeholder_clip, write_caption_vtt
from video_factory.models import DeliverableSpec, Shot, ShotKind
from video_factory.qa import run_technical_qa


def test_synthetic_clip_passes_qa(tmp_path: Path) -> None:
    output = tmp_path / "clip.mp4"
    create_placeholder_clip(
        output,
        duration_seconds=1.0,
        width=640,
        height=360,
        fps=30,
        label="test",
    )
    spec = DeliverableSpec(
        name="test-output",
        language="en",
        aspect_ratio="16:9",
        width=640,
        height=360,
        fps=30,
        format="mp4",
    )
    report = run_technical_qa(output, spec, 1.0)
    assert report.passed, report.model_dump()


def test_silent_clip_fails_when_supplied_audio_is_required(tmp_path: Path) -> None:
    output = tmp_path / "silent.mp4"
    create_placeholder_clip(
        output,
        duration_seconds=1.0,
        width=640,
        height=360,
        fps=30,
        label="silent",
    )
    spec = DeliverableSpec(
        name="audio-required",
        language="en",
        aspect_ratio="16:9",
        width=640,
        height=360,
        fps=30,
    )

    report = run_technical_qa(output, spec, 1.0, audio_required=True)

    assert report.passed is False
    audio_check = next(check for check in report.checks if check.name == "audio-level")
    assert audio_check.passed is False
    assert audio_check.actual in {"silent", "-91.0 dBFS"}


def test_caption_vtt_uses_shot_timing(tmp_path: Path) -> None:
    shots = [
        Shot(
            id="shot-001",
            order=1,
            title="Hook",
            purpose="Open",
            kind=ShotKind.TEXT_MOTION,
            duration_seconds=1.25,
            language="ja",
            headline="毎月、売れる動画を。",
            body="制作を止めない。",
        ),
        Shot(
            id="shot-002",
            order=2,
            title="CTA",
            purpose="Act",
            kind=ShotKind.TEXT_MOTION,
            duration_seconds=0.75,
            language="ja",
            headline="相談する",
        ),
    ]

    output = write_caption_vtt(shots, tmp_path / "captions.vtt")
    rendered = output.read_text(encoding="utf-8")

    assert "00:00:00.000 --> 00:00:01.250" in rendered
    assert "00:00:01.250 --> 00:00:02.000" in rendered
    assert "毎月、売れる動画を。" in rendered
