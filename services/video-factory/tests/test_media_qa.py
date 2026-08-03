import shutil
from pathlib import Path

import pytest

from video_factory.commands import run_command
from video_factory.media import (
    create_placeholder_clip,
    normalize_clip,
    probe_media,
    source_fidelity_score,
    write_caption_vtt,
)
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


def test_generated_motion_holds_its_final_frame_instead_of_looping(tmp_path: Path) -> None:
    source = create_placeholder_clip(
        tmp_path / "generated.mp4",
        duration_seconds=0.5,
        width=320,
        height=180,
        fps=24,
        label="generated",
    )
    output = normalize_clip(
        source,
        tmp_path / "held.mp4",
        duration_seconds=1.5,
        width=320,
        height=180,
        fps=24,
        loop_source=False,
    )

    assert abs(probe_media(output).duration_seconds - 1.5) <= 0.05


def test_source_fidelity_rejects_a_clip_that_collapses_after_its_first_frame(
    tmp_path: Path,
) -> None:
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg is None:
        pytest.skip("ffmpeg is unavailable")
    source = tmp_path / "source.png"
    generated = tmp_path / "collapsed.mp4"
    run_command(
        [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-f",
            "lavfi",
            "-i",
            "testsrc2=s=320x180:r=24:d=0.05",
            "-frames:v",
            "1",
            str(source),
        ],
        timeout=120,
    )
    run_command(
        [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-loop",
            "1",
            "-framerate",
            "24",
            "-t",
            "0.2",
            "-i",
            str(source),
            "-f",
            "lavfi",
            "-i",
            "color=c=0x101010:s=320x180:r=24:d=0.8",
            "-filter_complex",
            "[0:v][1:v]concat=n=2:v=1:a=0[out]",
            "-map",
            "[out]",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            str(generated),
        ],
        timeout=120,
    )

    assert source_fidelity_score(source, generated) < 0.78


def test_source_fidelity_allows_restrained_motion_without_scene_loss(
    tmp_path: Path,
) -> None:
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg is None:
        pytest.skip("ffmpeg is unavailable")
    source = tmp_path / "source.png"
    generated = tmp_path / "restrained-motion.mp4"
    run_command(
        [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-f",
            "lavfi",
            "-i",
            "testsrc2=s=320x180:r=24:d=0.05",
            "-frames:v",
            "1",
            str(source),
        ],
        timeout=120,
    )
    run_command(
        [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-loop",
            "1",
            "-i",
            str(source),
            "-vf",
            (
                "zoompan=z='min(zoom+0.001,1.025)':"
                "x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
                "d=24:s=320x180:fps=24"
            ),
            "-t",
            "1",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            str(generated),
        ],
        timeout=120,
    )

    assert source_fidelity_score(source, generated) >= 0.78


def test_source_fidelity_compares_the_generated_aspect_ratio_crop(tmp_path: Path) -> None:
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg is None:
        pytest.skip("ffmpeg is unavailable")
    source = tmp_path / "wide-source.png"
    generated = tmp_path / "vertical-crop.mp4"
    run_command(
        [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-f",
            "lavfi",
            "-i",
            "testsrc2=s=400x300:r=24:d=0.05",
            "-frames:v",
            "1",
            str(source),
        ],
        timeout=120,
    )
    run_command(
        [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-loop",
            "1",
            "-i",
            str(source),
            "-vf",
            "scale=180:320:force_original_aspect_ratio=increase,crop=180:320",
            "-t",
            "1",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            str(generated),
        ],
        timeout=120,
    )

    assert source_fidelity_score(source, generated) >= 0.78


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
