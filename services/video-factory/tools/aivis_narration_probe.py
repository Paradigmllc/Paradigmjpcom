"""Bounded internal narration QA using an existing operator-selected engine.

No model installation, production approval, public hosting or automatic retries.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import time
import wave
from pathlib import Path

import httpx

REVIEWED_POLICY_SHA256 = "841ec166f293db138d5e0ccacf2aaab71bb0eecdad128af8ab3378708e3259dc"


def synthesize(base_url: str, request_path: Path, output: Path) -> None:
    request = json.loads(request_path.read_text())
    lines = request["lines"]
    if not 1 <= len(lines) <= 12 or sum(len(line["text"]) for line in lines) > 1500:
        raise ValueError("Internal QA limit: 12 lines / 1500 characters")
    if len({line["id"] for line in lines}) != len(lines):
        raise ValueError("Duplicate narration ID")
    if any(not line["id"].isalnum() or not line["text"].strip() for line in lines):
        raise ValueError("Use safe IDs and nonempty narration")
    if not isinstance(request.get("credit"), str) or not request["credit"].strip():
        raise ValueError("Synthetic voice credit is required before synthesis")
    output.mkdir(parents=True, exist_ok=True)
    with (output / "started.json").open("x") as handle:
        json.dump({"request_sha256": hashlib.sha256(request_path.read_bytes()).hexdigest(),
                   "production_approved": False}, handle)
    with httpx.Client(base_url=base_url.rstrip("/"), timeout=180) as client:
        speakers = client.get("/speakers")
        speakers.raise_for_status()
        speaker = next(item for item in speakers.json() if item["speaker_uuid"] == request["speaker_uuid"])
        if request["speaker_id"] not in [style["id"] for style in speaker["styles"]]:
            raise ValueError("Style not owned by selected speaker")
        info = client.get("/speaker_info", params={"speaker_uuid": request["speaker_uuid"]})
        info.raise_for_status()
        policy = info.json()["policy"]
        if hashlib.sha256(policy.encode()).hexdigest() != REVIEWED_POLICY_SHA256:
            raise ValueError("Unreviewed voice policy; stop before synthesis")
        (output / "voice-policy.md").write_text(policy)
        voices = []
        for line in lines:
            began = time.monotonic()
            query = client.post("/audio_query", params={"speaker": request["speaker_id"], "text": line["text"]})
            query.raise_for_status()
            payload = query.json()
            payload.update(speedScale=1.0, outputSamplingRate=24000, outputStereo=False)
            response = client.post("/synthesis", params={"speaker": request["speaker_id"]}, json=payload)
            response.raise_for_status()
            with wave.open(io.BytesIO(response.content)) as wav:
                duration = wav.getnframes() / wav.getframerate()
                if not 0.5 < duration <= 40:
                    raise ValueError("Implausible narration duration")
            path = output / f"{line['id']}.wav"
            path.write_bytes(response.content)
            voices.append({"id": line["id"], "text": line["text"], "path": str(path),
                           "duration_seconds": duration, "elapsed_seconds": round(time.monotonic() - began, 2),
                           "sha256": hashlib.sha256(response.content).hexdigest()})
            print(json.dumps({"phase": "voice_generated", "id": line["id"], "duration_seconds": duration}), flush=True)
            (output / "audio-meta.json").write_text(json.dumps({"voices": voices, "speaker": speaker,
                "credit": request["credit"], "human_approved": False,
                "policy_sha256": hashlib.sha256(policy.encode()).hexdigest()}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--request", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    synthesize(args.base_url, args.request, args.output)
