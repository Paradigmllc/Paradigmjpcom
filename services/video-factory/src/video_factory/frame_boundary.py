"""Reliable final-frame extraction for source-conditioned shot continuation."""
from __future__ import annotations

import json
from pathlib import Path

from .commands import run_command


def extract_last_video_frame(source: Path, output: Path) -> Path:
    """Decode/select the final frame; fractional EOF seeks can return zero frames."""
    if output.exists():
        raise FileExistsError("Continuation frame already exists; preserve prior evidence")
    result = run_command([
        "ffprobe", "-v", "error", "-select_streams", "v:0", "-count_frames",
        "-show_entries", "stream=nb_read_frames,width,height", "-of", "json", str(source),
    ], timeout=120)
    stream = json.loads(result.stdout)["streams"][0]
    count = int(stream["nb_read_frames"])
    if not 2 <= count <= 3000:
        raise ValueError("Continuation source requires 2-3000 decoded frames")
    run_command([
        "ffmpeg", "-v", "error", "-i", str(source), "-vf", f"select=eq(n\\,{count - 1})",
        "-frames:v", "1", "-update", "1", str(output),
    ], timeout=120)
    if not output.is_file() or output.stat().st_size == 0:
        raise ValueError("Final-frame extraction produced no image")
    frame = run_command([
        "ffprobe", "-v", "error", "-show_entries", "stream=width,height", "-of", "json",
        str(output),
    ], timeout=30)
    actual = json.loads(frame.stdout)["streams"][0]
    if (actual["width"], actual["height"]) != (stream["width"], stream["height"]):
        raise ValueError("Continuation frame dimensions changed")
    return output
