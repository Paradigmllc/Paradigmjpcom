"""Validate native motion coverage before any normalization can conceal a shortfall."""

from __future__ import annotations

import json
import math
import shutil
from pathlib import Path

from .commands import run_command
from .media import probe_media
from .models import MediaProbe


def probe_motion_source(path: Path) -> MediaProbe:
    """Use video-stream duration, not a longer audio/container duration."""
    probe = probe_media(path)
    if probe.codec in {"png", "mjpeg", "webp"} and probe.duration_seconds == 0:
        return probe
    binary = shutil.which("ffprobe")
    if not binary:
        raise ValueError("ffprobe is required for native video coverage")
    result = run_command([
        binary, "-v", "error", "-select_streams", "v:0", "-show_entries",
        "stream=duration,nb_frames", "-of", "json", str(path),
    ], timeout=120)
    streams = json.loads(result.stdout).get("streams", [])
    if not streams:
        raise ValueError("生成素材に動画ストリームがありません。")
    stream = streams[0]
    value = stream.get("duration")
    if value in (None, "N/A"):
        frames = stream.get("nb_frames")
        if frames in (None, "N/A") or probe.fps <= 0:
            raise ValueError("動画ストリームの尺を確認できません。")
        duration = float(frames) / probe.fps
    else:
        duration = float(value)
    return probe.model_copy(update={"duration_seconds": duration})


def require_motion_coverage(probe: MediaProbe, requested_seconds: float, fps: int) -> None:
    """Allow at most one output frame of rounding, never editorial freeze padding."""
    if not math.isfinite(requested_seconds) or requested_seconds <= 0 or fps <= 0:
        raise ValueError("生成素材の尺検査に有効な秒数とFPSが必要です。")
    actual = probe.duration_seconds
    if not math.isfinite(actual) or actual <= 0 or probe.fps <= 0:
        raise ValueError("生成素材の動画尺またはFPSを確認できません。")
    if requested_seconds - actual > 1 / fps + 1e-6:
        raise ValueError(
            f"生成素材の動きが不足しています(素材 {actual:.3f}秒 / 必要 "
            f"{requested_seconds:.3f}秒)。末尾静止やループによる尺埋めは行いません。"
            "ショットを分割するか、必要な尺を生成できる承認済みワークフローを選んでください。"
        )
