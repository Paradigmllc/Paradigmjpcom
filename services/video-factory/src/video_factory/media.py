from __future__ import annotations

import json
import math
import re
import shutil
from fractions import Fraction
from pathlib import Path

from .commands import run_command
from .models import CaptionMode, DeliverableSpec, MediaProbe, Shot, ShotManifest


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
    fit: str = "contain",
    loop_source: bool = True,
) -> Path:
    ffmpeg = _require("ffmpeg")
    source_path = Path(source)
    if not source_path.is_file():
        raise MediaError(f"Source media does not exist: {source_path}")
    target = Path(output)
    target.parent.mkdir(parents=True, exist_ok=True)
    if fit not in {"contain", "cover"}:
        raise MediaError(f"Unsupported clip fit: {fit}")
    geometry = (
        f"scale={width}:{height}:force_original_aspect_ratio=increase,"
        f"crop={width}:{height}"
        if fit == "cover"
        else (
            f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
            f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:color=0x0B1020"
        )
    )
    hold = "" if loop_source else f",tpad=stop_mode=clone:stop_duration={duration_seconds}"
    filter_graph = f"{geometry},fps={fps}{hold},format=yuv420p"
    has_audio = _has_audio_stream(source_path)
    command = [
        ffmpeg,
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
    ]
    if loop_source:
        command.extend(["-stream_loop", "-1"])
    command.extend(["-i", str(source_path)])
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
            *(
                ["-af", f"apad=pad_dur={duration_seconds}"]
                if has_audio and not loop_source
                else []
            ),
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


def _source_fidelity_score_at(
    ffmpeg: str,
    source_path: Path,
    generated_path: Path,
    timestamp_seconds: float,
) -> float:
    """Measure structural similarity at one generated-video timestamp."""
    completed = run_command(
        [
            ffmpeg,
            "-hide_banner",
            "-i",
            str(source_path),
            "-ss",
            f"{timestamp_seconds:.6f}",
            "-i",
            str(generated_path),
            "-filter_complex",
            (
                "[0:v]select='eq(n,0)',setpts=PTS-STARTPTS,"
                "scale=512:512:force_original_aspect_ratio=increase,"
                "crop=512:512,format=yuv420p[reference];"
                "[1:v]select='eq(n,0)',setpts=PTS-STARTPTS,"
                "scale=512:512:force_original_aspect_ratio=increase,"
                "crop=512:512,format=yuv420p[candidate];"
                "[reference][candidate]ssim"
            ),
            "-frames:v",
            "1",
            "-f",
            "null",
            "-",
        ],
        timeout=180,
    )
    match = re.search(r"All:([0-9]+(?:\.[0-9]+)?)", completed.stderr)
    if not match:
        raise MediaError("FFmpeg did not report a source fidelity score")
    score = float(match.group(1))
    if not 0 <= score <= 1:
        raise MediaError("Source fidelity score is outside the valid range")
    return score


def source_fidelity_score(source: str | Path, generated: str | Path) -> float:
    """Return the worst structural match across the generated clip.

    This is a conservative structural guard, not a claim of biometric identity.
    Sampling the opening, quarter points and final frame prevents an output that
    starts correctly but later loses the supplied subject from passing the gate.
    Low-scoring shots fall back to the supplied-photo edit and still require
    human review.
    """
    ffmpeg = _require("ffmpeg")
    source_path = Path(source)
    generated_path = Path(generated)
    if not source_path.is_file() or not generated_path.is_file():
        raise MediaError("Source fidelity inputs do not exist")
    probe = probe_media(generated_path)
    if probe.duration_seconds <= 0:
        raise MediaError("Generated clip duration is unavailable for fidelity scoring")
    final_frame_offset = 1 / probe.fps if probe.fps > 0 else 0.04
    final_timestamp = max(0.0, probe.duration_seconds - final_frame_offset)
    timestamps = sorted(
        {
            0.0,
            probe.duration_seconds * 0.25,
            probe.duration_seconds * 0.5,
            probe.duration_seconds * 0.75,
            final_timestamp,
        }
    )
    scores = [
        _source_fidelity_score_at(
            ffmpeg,
            source_path,
            generated_path,
            timestamp,
        )
        for timestamp in timestamps
    ]
    return min(scores)


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


def write_caption_vtt(shots: list[Shot], output: str | Path) -> Path:
    target = Path(output)
    target.parent.mkdir(parents=True, exist_ok=True)
    position = 0.0
    cues = ["WEBVTT", ""]
    for index, shot in enumerate(shots, start=1):
        end = position + shot.duration_seconds
        text_parts = [part for part in (shot.headline.strip(), shot.body.strip()) if part]
        text = "\n".join(dict.fromkeys(text_parts))
        cues.extend(
            [
                str(index),
                f"{_vtt_timestamp(position)} --> {_vtt_timestamp(end)}",
                text or shot.title,
                "",
            ]
        )
        position = end
    target.write_text("\n".join(cues), encoding="utf-8")
    return target


def _vtt_timestamp(seconds: float) -> str:
    milliseconds = max(0, round(seconds * 1000))
    hours, remainder = divmod(milliseconds, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    whole_seconds, millis = divmod(remainder, 1000)
    return f"{hours:02d}:{minutes:02d}:{whole_seconds:02d}.{millis:03d}"


def _checked_audio_path(value: str | None, label: str) -> Path | None:
    if not value:
        return None
    path = Path(value).expanduser().resolve()
    if not path.is_file():
        raise MediaError(f"{label} audio does not exist: {path}")
    return path


def mix_master_audio(
    media_path: str | Path,
    manifest: ShotManifest,
    *,
    duration_seconds: float,
) -> Path:
    narration = _checked_audio_path(manifest.audio.narration_path, "Narration")
    music = _checked_audio_path(manifest.audio.music_path, "Music")
    target = Path(media_path)
    if narration is None and music is None:
        return target

    ffmpeg = _require("ffmpeg")
    temporary = target.with_name(f"{target.stem}-audio-mix{target.suffix}")
    command = [ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(target)]
    inputs: list[tuple[int, float, str]] = []
    input_index = 1
    if narration is not None:
        command.extend(["-i", str(narration)])
        inputs.append((input_index, manifest.audio.narration_volume, "narration"))
        input_index += 1
    if music is not None:
        command.extend(["-stream_loop", "-1", "-i", str(music)])
        inputs.append((input_index, manifest.audio.music_volume, "music"))

    filters = [
        f"[{index}:a:0]volume={volume},apad,atrim=0:{duration_seconds}[{label}]"
        for index, volume, label in inputs
    ]
    labels = "".join(f"[{label}]" for _index, _volume, label in inputs)
    if len(inputs) == 1:
        mixed_label = inputs[0][2]
    else:
        filters.append(
            f"{labels}amix=inputs={len(inputs)}:duration=longest:normalize=0,"
            f"atrim=0:{duration_seconds}[mixed]"
        )
        mixed_label = "mixed"
    command.extend(
        [
            "-filter_complex",
            ";".join(filters),
            "-map",
            "0:v:0",
            "-map",
            f"[{mixed_label}]",
            "-t",
            str(duration_seconds),
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-ar",
            "48000",
            "-movflags",
            "+faststart",
            str(temporary),
        ]
    )
    run_command(command, timeout=1200)
    temporary.replace(target)
    return target


def burn_captions(media_path: str | Path, captions_path: str | Path) -> Path:
    ffmpeg = _require("ffmpeg")
    target = Path(media_path)
    captions = Path(captions_path).resolve().as_posix().replace(":", r"\:").replace("'", r"\'")
    temporary = target.with_name(f"{target.stem}-captioned{target.suffix}")
    run_command(
        [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(target),
            "-vf",
            (
                f"subtitles=filename='{captions}':force_style='Alignment=2,MarginV=70,"
                "FontSize=48,Outline=4,Shadow=0'"
            ),
            "-map",
            "0:v:0",
            "-map",
            "0:a?",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "18",
            "-c:a",
            "copy",
            "-movflags",
            "+faststart",
            str(temporary),
        ],
        timeout=1200,
    )
    temporary.replace(target)
    return target


def finish_master_media(
    media_path: str | Path,
    manifest: ShotManifest,
    shots: list[Shot],
    *,
    captions_path: str | Path,
) -> Path | None:
    mix_master_audio(media_path, manifest, duration_seconds=manifest.duration_seconds)
    if manifest.audio.captions is CaptionMode.OFF:
        return None
    caption_file = write_caption_vtt(shots, captions_path)
    if manifest.audio.captions is CaptionMode.BURNED:
        burn_captions(media_path, caption_file)
    return caption_file


def probe_audio_levels(path: str | Path) -> tuple[float | None, float | None]:
    ffmpeg = _require("ffmpeg")
    completed = run_command(
        [
            ffmpeg,
            "-hide_banner",
            "-nostats",
            "-i",
            str(path),
            "-vn",
            "-af",
            "volumedetect",
            "-f",
            "null",
            "-",
        ],
        timeout=300,
    )
    mean_match = re.search(r"mean_volume:\s*(-?inf|-?\d+(?:\.\d+)?) dB", completed.stderr)
    peak_match = re.search(r"max_volume:\s*(-?inf|-?\d+(?:\.\d+)?) dB", completed.stderr)

    def parse(match: re.Match[str] | None) -> float | None:
        if match is None or match.group(1) in {"inf", "-inf"}:
            return None
        return float(match.group(1))

    return parse(mean_match), parse(peak_match)


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
