"""Build an explicitly timed narration track from cleared per-shot audio."""

from __future__ import annotations

import json
import math
import shutil
from pathlib import Path

from .commands import CommandError, run_command
from .media import finish_master_media
from .models import Shot, ShotManifest


def _audio_duration(path: Path) -> float:
    binary = shutil.which("ffprobe")
    if not binary or not path.is_file():
        raise ValueError("ナレーション音源またはffprobeが見つかりません。")
    try:
        result = run_command([binary, "-v", "error", "-select_streams", "a:0",
                              "-show_entries", "stream=duration:format=duration",
                              "-of", "json", str(path)], timeout=120)
    except CommandError as error:
        raise ValueError("ナレーション音源を解析できません。対応形式の音声を指定してください。") from error
    payload = json.loads(result.stdout)
    if not payload.get("streams"):
        raise ValueError("ナレーションに音声ストリームがありません。")
    value = payload["streams"][0].get("duration")
    if value in (None, "N/A"):
        value = payload.get("format", {}).get("duration")
    duration = float(value or 0)
    if not math.isfinite(duration) or duration <= 0:
        raise ValueError("ナレーションの尺を確認できません。")
    return duration


def inspect_editorial_audio(manifest: ShotManifest) -> list[Path | None]:
    """Read-only preflight shared by the UI and execution before GPU acquisition."""
    if manifest.metadata.get("planning_mode") != "authored_chapters":
        return []
    generated_path = manifest.metadata.get("editorial_narration_path")
    if manifest.audio.narration_path and manifest.audio.narration_path != generated_path:
        if abs(_audio_duration(Path(manifest.audio.narration_path)) - manifest.duration_seconds) > 0.1:
            raise ValueError("全編ナレーションの尺と台本の完成尺が一致していません。")
        return []
    sources: list[Path | None] = []
    # Validate every source before encoding or dispatching an expensive engine.
    for shot in manifest.shots:
        raw = shot.metadata.get("narration_path")
        path = Path(str(raw)).expanduser().resolve() if raw else None
        if shot.metadata.get("narration") and path is None:
            raise ValueError(f"{shot.id}: 原稿に対応する承認済み音声が必要です。")
        if path:
            duration = _audio_duration(path)
            if duration > shot.duration_seconds + 0.01:
                raise ValueError(f"{shot.id}: 音声がショット尺を超えます。台本の尺を調整してください。")
        sources.append(path)
    return sources


def prepare_editorial_audio(
    manifest: ShotManifest, root: Path, *, dry_run: bool,
) -> ShotManifest:
    if manifest.metadata.get("planning_mode") != "authored_chapters" or dry_run:
        return manifest
    sources = inspect_editorial_audio(manifest)
    if not any(sources):
        if manifest.metadata.get("editorial_narration_path") == manifest.audio.narration_path:
            return manifest.model_copy(update={
                "audio": manifest.audio.model_copy(update={"narration_path": None}),
                "metadata": {**manifest.metadata, "editorial_narration_path": None},
            })
        return manifest
    binary = shutil.which("ffmpeg")
    if not binary:
        raise ValueError("ffmpegが見つかりません。")
    staging = root / "editorial-audio"
    staging.mkdir(parents=True, exist_ok=True)
    outputs: list[Path] = []
    for shot, source in zip(manifest.shots, sources, strict=True):
        output = staging / f"{shot.id}.wav"
        input_args = (["-i", str(source)] if source else [
            "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
        ])
        run_command([binary, "-hide_banner", "-loglevel", "error", "-y", *input_args,
                     "-vn", "-af", "apad", "-t", str(shot.duration_seconds),
                     "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", str(output)], timeout=120)
        outputs.append(output)
    listing = staging / "concat.txt"
    # Only generated, fixed shot IDs enter the concat manifest, never source paths.
    listing.write_text("".join(f"file '{path.name}'\n" for path in outputs), encoding="utf-8")
    master = staging / "narration.wav"
    run_command([binary, "-hide_banner", "-loglevel", "error", "-y", "-f", "concat",
                 "-safe", "1", "-i", str(listing), "-c", "copy", str(master)], timeout=1200)
    return manifest.model_copy(update={
        "audio": manifest.audio.model_copy(update={"narration_path": str(master)}),
        "metadata": {**manifest.metadata, "editorial_narration_path": str(master)},
    })


def finish_editorial_media(
    media_path: Path, manifest: ShotManifest, shots: list[Shot], *, captions_path: Path,
) -> Path | None:
    caption_shots = shots
    if manifest.metadata.get("planning_mode") == "authored_chapters":
        caption_shots = [shot.model_copy(update={
            "headline": "", "body": str(shot.metadata.get("narration") or shot.body),
        }) for shot in shots]
    return finish_master_media(media_path, manifest, caption_shots, captions_path=captions_path)
