from pathlib import Path

from video_factory.media import create_placeholder_clip
from video_factory.models import DeliverableSpec
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
