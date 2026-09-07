"""Transcribe review media with an already downloaded, pinned local model.

This is a diagnostic, not an approval or a substitute for listening. No network
downloads, reference-text prompting, retries, publishing or paid APIs occur here.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path


def transcribe(media: Path, model_path: Path, output: Path) -> None:
    if not media.is_file() or not model_path.is_dir():
        raise ValueError("Existing media and a local model directory are required")
    if output.exists():
        raise FileExistsError(output)
    from faster_whisper import WhisperModel

    model = WhisperModel(str(model_path), device="cpu", compute_type="int8",
                         cpu_threads=2, local_files_only=True)
    segments, info = model.transcribe(str(media), language="ja", beam_size=5,
                                      word_timestamps=True, condition_on_previous_text=False)
    rows = []
    for segment in segments:
        row = {"start": segment.start, "end": segment.end, "text": segment.text,
               "avg_logprob": segment.avg_logprob,
               "words": [{"start": word.start, "end": word.end, "word": word.word,
                          "probability": word.probability} for word in segment.words or []]}
        rows.append(row)
        print(json.dumps({"end": segment.end, "text": segment.text}, ensure_ascii=False), flush=True)
    with output.open("x") as handle:
        json.dump({"media": str(media.resolve()), "model_path": str(model_path.resolve()),
                   "language": info.language, "duration": info.duration,
                   "human_approved": False, "segments": rows}, handle, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--media", type=Path, required=True)
    parser.add_argument("--model-path", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    transcribe(args.media, args.model_path, args.output)
