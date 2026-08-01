from __future__ import annotations

import json
import math
import shutil
from fractions import Fraction
from pathlib import Path

from .commands import run_command
from .models import DeliverableSpec, MediaProbe


class MediaError(RuntimeError):
    pass


def _require(binary: str) -> str:
    path = shutil.which(binary)
    if not path:
        raise MediaError(f"Required binary is not installed: {binary}")
    return path


def create_placeholder_clip(
    output: str | Path,
    *,
    duration_seconds: float,
    width: int,
    height: int,
    fps: int,
    label: str,
) -> Path:
    ffmpeg = _require("ffmpeg")
    target = Path(output)
    target.parent.mkdir(parents=True, exist_ok=True)
    safe_label = "".join(character for character in label if character.isascii())[:60] or "scene"
    command = [
        ffmpeg,
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        f"color=c=0x0B1020:s={width}x{height}:r={fps}:d={duration_seconds}",
        "-f",
        "lavfi",
        "-i",
        f"anullsrc=channel_layout=stereo:sample_rate=48000:d={duration_seconds}",
        "-metadata",
        f"comment=placeholder:{safe_label}",
        "-shortest",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-movflags",
        "+faststart",
        str(target),
    ]
    run_command(command, timeout=120)
    return target



def _has_audio_stream(source: Path) -> bool:
    ffprobe = _require("ffprobe")
    completed = run_command(
        [
            ffprobe,
            "-v",
            "error",
            "-select_streams",
            "a",
            "-show_entries",
            "stream=index",
            "-of",
            "csv=p=0",
            str(source),
        ],
        timeout=120,
    )
    return bool(completed.stdout.strip())


def normalize_clip(
    source: str | Path,
    output: str | Path,
    *,
    duration_seconds: float,
    width: int,
    height: int,
    fps: int,
) -> Path:
    ffmpeg = _require("ffmpeg")
    source_path = Path(source)
    if not source_path.is_file():
        raise MediaError(f"Source media does not exist: {source_path}")
    target = Path(output)
    target.parent.mkdir(parents=True, exist_ok=True)
    filter_graph = (
        f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
        f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:color=0x0B1020,"
        f"fps={fps},format=yuv420p"
    )
    has_audio = _has_audio_stream(source_path)
    command = [
        ffmpeg,
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-stream_loop",
        "-1",
        "-i",
        str(source_path),
    ]
    if not has_audio:
        command.extend(
            [
                "-f",
                "lavfi",
                "-i",
                f"anullsrc=channel_layout=stereo:sample_rate=48000:d={duration_seconds}",
            ]
        )
    command.extend(
        [
            "-vf",
            filter_graph,
            "-map",
            "0:v:0",
            "-map",
            "0:a:0" if has_audio else "1:a:0",
            "-t",
            str(duration_seconds),
            "-shortest",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-ar",
            "48000",
            "-movflags",
            "+faststart",
            str(target),
        ]
    )
    run_command(command, timeout=600)
    return target


def assemble_clips(
    clips: list[Path],
    output: str | Path,
    deliverable: DeliverableSpec,
    durations: list[float],
) -> Path:
    if len(clips) != len(durations):
        raise MediaError("clips and durations must have equal length")
    target = Path(output)
    target.parent.mkdir(parents=True, exist_ok=True)
    staging = target.parent / ".staging" / target.stem
    staging.mkdir(parents=True, exist_ok=True)
    normalized: list[Path] = []
    for index, (clip, duration) in enumerate(zip(clips, durations, strict=True), start=1):
        normalized_path = staging / f"normalized-{index:03d}.mp4"
        normalize_clip(
            clip,
            normalized_path,
            duration_seconds=duration,
            width=deliverable.width,
            height=deliverable.height,
            fps=deliverable.fps,
        )
        normalized.append(normalized_path)

    concat_path = staging / "concat.txt"
    concat_path.write_text(
        "".join(f"file {path.as_posix()!r}\n" for path in normalized),
        encoding="utf-8",
    )
    ffmpeg = _require("ffmpeg")
    run_command(
        [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat_path),
            "-c",
            "copy",
            "-movflags",
            "+faststart",
            str(target),
        ],
        timeout=1200,
    )
    return target


def create_variant(source: Path, output: Path, spec: DeliverableSpec) -> Path:
    probe = probe_media(source)
    if (
        probe.width == spec.width
        and probe.height == spec.height
        and abs(probe.fps - spec.fps) < 0.1
    ):
        output.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, output)
        return output
    return normalize_clip(
        source,
        output,
        duration_seconds=probe.duration_seconds,
        width=spec.width,
        height=spec.height,
        fps=spec.fps,
    )


def probe_media(path: str | Path) -> MediaProbe:
    ffprobe = _require("ffprobe")
    source = Path(path)
    completed = run_command(
        [
            ffprobe,
            "-v",
            "error",
            "-show_streams",
            "-show_format",
            "-of",
            "json",
            str(source),
        ],
        timeout=120,
    )
    payload = json.loads(completed.stdout)
    streams = payload.get("streams", [])
    video = next((item for item in streams if item.get("codec_type") == "video"), None)
    if video is None:
        raise MediaError(f"No video stream found: {source}")
    audio = any(item.get("codec_type") == "audio" for item in streams)
    duration_value = payload.get("format", {}).get("duration") or video.get("duration") or 0
    frame_rate = video.get("avg_frame_rate") or video.get("r_frame_rate") or "0/1"
    try:
        fps = float(Fraction(frame_rate))
    except (ValueError, ZeroDivisionError):
        fps = 0.0
    duration = float(duration_value)
    if not math.isfinite(duration):
        duration = 0.0
    return MediaProbe(
        path=str(source),
        duration_seconds=duration,
        width=int(video.get("width") or 0),
        height=int(video.get("height") or 0),
        fps=fps,
        has_audio=audio,
        codec=video.get("codec_name"),
    )
