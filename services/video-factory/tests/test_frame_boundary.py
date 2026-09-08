import subprocess
from pathlib import Path

import pytest

from video_factory.frame_boundary import extract_last_video_frame


def decode(source: Path, *options: str) -> bytes:
    return subprocess.run([
        "ffmpeg", "-v", "error", "-i", str(source), *options,
        "-pix_fmt", "rgb24", "-f", "rawvideo", "-",
    ], capture_output=True, check=True, timeout=30).stdout


@pytest.mark.parametrize("fps", [16, 24, 30])
def test_exact_last_frame_across_frame_rates(tmp_path: Path, fps: int) -> None:
    source = tmp_path / "source.mp4"
    subprocess.run([
        "ffmpeg", "-v", "error", "-f", "lavfi", "-i", f"testsrc2=size=128x72:rate={fps}",
        "-frames:v", "81", "-c:v", "libx264", str(source),
    ], check=True, timeout=30)
    output = extract_last_video_frame(source, tmp_path / "last.png")
    expected = decode(source, "-vf", "select=eq(n\\,80)", "-frames:v", "1")
    assert len(expected) == 128 * 72 * 3
    assert decode(output) == expected
    with pytest.raises(FileExistsError):
        extract_last_video_frame(source, output)
    if fps == 16:
        old = subprocess.run([
            "ffmpeg", "-v", "error", "-sseof", "-0.05", "-i", str(source),
            "-frames:v", "1", "-f", "rawvideo", "-",
        ], capture_output=True, check=True, timeout=30)
        assert old.stdout == b""  # Regression: zero frames despite exit code 0.
