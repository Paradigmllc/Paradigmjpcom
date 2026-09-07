"""Explicit one-rental sandbox comparison; never updates production approvals."""
from __future__ import annotations

import argparse
import asyncio
import dataclasses
import hashlib
import json
import math
import secrets
import signal
import time

import httpx
import yaml

from video_factory.adapters.base import EngineContext
from video_factory.adapters.comfyui import ComfyUIAdapter
from video_factory.doctor import doctor_report
from video_factory.media import probe_media
from video_factory.models import (
    Approver,
    BrandSpec,
    DeliverableSpec,
    RightsDeclaration,
    Shot,
    ShotManifest,
)
from video_factory.settings import Settings
from video_factory.vast import VastClient, VastConfig, vast_instance_connection
from video_factory.workspace import ProjectWorkspace

BASELINE_SHA = "1895ad608ef57be836992a92d3898593b15a70206b52ade5cdc7ca651c985bc6"
PROVISION_REVISION = "842f9ab962333b0404b5cc8b92d5207dc4d472d3"
TEMPLATE = "d143053633a1aa5145e705dd9d60854b"
# Reviewed amd64 manifest: vastai/comfy:v0.28.0-cuda-12.9-py312 (not a mutable tag).
COMFY_IMAGE = "vastai/comfy@sha256:694125bebb5b00d77878693770c9550602e9cbf644e9fe3d9b3b35ee27385e8d"
PROMPT = (
    "Macro cinematic product shot of a plain ivory ceramic coffee cup on dark walnut. "
    "At the beginning a thin plume of hot steam rises vertically, then curls visibly "
    "in a gentle draft. Continuous slow camera push toward the rim, revealing the "
    "glazed ceramic texture and dark coffee surface. Soft large window light from "
    "camera left, dark olive background, warm highlights, no blown white areas. "
    "The cup and its one handle remain rigid and unchanged. One continuous five-second "
    "shot. No people, lettering, logos, cuts, or transitions."
)


def eligible(offer: dict[str, object]) -> bool:
    try:
        for field in ("dph_total", "inet_down", "disk_bw", "disk_space", "storage_cost", "inet_down_cost", "inet_up_cost"):
            value = float(str(offer[field]))
            if not math.isfinite(value) or value < 0:
                return False
        return (
            offer.get("num_gpus") == 1
            and float(str(offer.get("dph_total", "inf"))) <= 0.40
            and float(str(offer.get("inet_down", 0))) >= 800
            and float(str(offer.get("disk_bw", 0))) >= 1000
            and float(str(offer.get("disk_space", 0))) >= 100
            and float(str(offer.get("storage_cost", "inf"))) <= 0.21
            and float(str(offer.get("inet_down_cost", "inf"))) <= 0.004
            and float(str(offer.get("inet_up_cost", "inf"))) <= 0.004
        )
    except (KeyError, ValueError, TypeError):
        return False


def bootstrap_phase(instance: dict[str, object]) -> str:
    """Persist diagnostic categories, never arbitrary provider messages/secrets."""
    message = str(instance.get("status_msg", "")).lower()
    for category, patterns in (
        ("disk_full", ("no space left", "disk quota exceeded")),
        ("image_unavailable", ("manifest unknown", "pull access denied", "image not found")),
        ("image_downloading", ("downloading", "pulling")),
        ("image_extracting", ("extracting", "unpacking")),
    ):
        if any(pattern in message for pattern in patterns):
            return category
    return "unspecified"


def compatible_cuda(offer: dict[str, object]) -> bool:
    try:
        value = float(str(offer["cuda_max_good"]))
        return math.isfinite(value) and value >= 12.9
    except (KeyError, TypeError, ValueError):
        return False


def make_candidates(baseline: dict[str, object]) -> list[tuple[str, dict[str, object]]]:
    result = []
    for name, steps, shift in [("draft20", 20, 8.0), ("reference50", 50, 5.0)]:
        graph = json.loads(json.dumps(baseline))
        graph["7"]["inputs"].update(width=1280, height=704, length=121)
        graph["8"]["inputs"]["steps"] = steps
        graph["2"]["inputs"]["shift"] = shift
        result.append((name, graph))
    return result


def timeout_signal(_signum: int, _frame: object) -> None:
    raise TimeoutError("Sandbox wall-clock limit")


def make_manifest(project: str, index: int, name: str, workflow_path: str) -> ShotManifest:
    # Model-native 1280x704 stays in the workflow; the review copy is letterboxed to 16:9.
    spec = DeliverableSpec(name="comparison", language="en", aspect_ratio="16:9", width=1280, height=720, fps=24)
    shot = Shot(id=f"shot-{index:03d}", order=1, title=name, purpose="Internal quality comparison, not product evidence",
                kind="generative", duration_seconds=121/24, language="en", engine="comfyui",
                metadata={"comfyui_workflow": workflow_path, "prompt": PROMPT, "seed": 20260908,
                          "negative_prompt": "frozen motion, still image, warped cup, extra handles, flicker, subtitles, watermark, overexposed, blurry"})
    return ShotManifest(project_id=project, project_name="Internal Wan source comparison",
        brief_sha256=hashlib.sha256(PROMPT.encode()).hexdigest(), duration_seconds=121/24,
        primary_deliverable=spec, deliverables=[spec],
        brand=BrandSpec(name="Studio QA", primary_color="#152522", accent_color="#D8BB7C"),
        rights=RightsDeclaration(source_assets_cleared=True, ai_generation_allowed=True,
            likeness_consent="not_applicable", voice_consent="not_applicable", claims_approved_by_client=False),
        approver=Approver(name="Paradigm owner", email="contact@paradigmjp.com"), shots=[shot],
        metadata={"internal_qa": True, "automatic_approval": False, "production_bound": False})


def select_offer(offers: list[dict[str, object]], offer_id: int | None, machine_id: int | None) -> dict[str, object] | None:
    matches = [item for item in offers if eligible(item) and (
        item.get("id") == offer_id if offer_id is not None else item.get("machine_id") == machine_id
    )]
    return min(matches, key=lambda item: float(str(item["dph_total"]))) if matches else None


async def run(offer_id: int | None, project: str, execute: bool, machine_id: int | None = None,
              candidate: str = "both", runtime: str = "legacy") -> None:
    if candidate not in {"both", "draft20", "reference50"}:
        raise ValueError("Unknown candidate")
    if runtime not in {"legacy", "comfy-pinned"}:
        raise ValueError("Unknown runtime")
    settings = Settings.from_env()
    workspace = ProjectWorkspace.create(settings.workspace, project)
    label = f"paradigm-comfyui-{project}"
    baseline_path = settings.comfyui_workflow_root / "api/abstract-broll-t2v-v1.0.json"
    baseline_bytes = baseline_path.read_bytes()
    if hashlib.sha256(baseline_bytes).hexdigest() != BASELINE_SHA:
        raise ValueError("Baseline workflow changed; re-review the experiment")
    candidates = [(name, graph, make_manifest(project, index, name, str(workspace.root / f"{name}-workflow.json")))
                  for index, (name, graph) in enumerate(make_candidates(json.loads(baseline_bytes)), 1)]
    if candidate != "both":
        candidates = [item for item in candidates if item[0] == candidate]
    client = VastClient(VastConfig.from_workspace(settings.workspace))
    if await client.list_instances():
        raise ValueError("Existing instance found; no duplicate rental")
    offers = await client.search_offers(
        gpu_names=["RTX 3090", "RTX 4090"], min_gpu_ram_mb=24000, min_reliability=.995,
        verified=True, instance_type="on-demand", max_hourly_price=.40, limit=100,
    )
    offer = select_offer(offers, offer_id, machine_id)
    if offer is None:
        print(json.dumps({"phase": "offer_preflight_blocked", "offer_count": len(offers),
                          "eligible_ids": [item.get("id") for item in offers if eligible(item)],
                          "selected_id_present": any(item.get("id") == offer_id for item in offers)}), flush=True)
        raise ValueError("Selected offer unavailable or outside constraints; no replacement rental")
    offer_id = int(str(offer["id"]))
    if runtime == "comfy-pinned" and not compatible_cuda(offer):
        raise ValueError("Pinned CUDA 12.9 runtime requires verified host CUDA >= 12.9")
    if not execute:
        print(json.dumps({"mode": "read_only", "offer": {key: offer.get(key) for key in
            ("id", "machine_id", "gpu_name", "dph_total", "inet_down", "disk_bw", "disk_space")},
            "label": label, "planned_frames": 121, "planned_size": [1280, 704],
            "wall_clock_limit_seconds": 2400, "bootstrap_limit_seconds": 900,
            "candidates": [item[0] for item in candidates], "runtime": runtime,
            "image": COMFY_IMAGE if runtime == "comfy-pinned" else None,
            "estimated_budget_usd": 1, "hard_billing_cap": False}), flush=True)
        return
    # Exclusive marker prevents rerenting after success, failure, or ambiguous create.
    with (workspace.root / "probe-started.json").open("x") as handle:
        json.dump({"offer_id": offer_id, "machine_id": offer.get("machine_id"), "label": label,
                   "estimated_budget_usd": 1, "automatic_approval": False,
                   "candidates": [item[0] for item in candidates], "runtime": runtime,
                   "image": COMFY_IMAGE if runtime == "comfy-pinned" else None}, handle)
    started = time.monotonic()

    def log(phase: str, **values: object) -> None:
        event = {"phase": phase, "elapsed_seconds": round(time.monotonic() - started), **values}
        print(json.dumps(event), flush=True)
        with (workspace.root / "probe-events.jsonl").open("a") as handle:
            handle.write(json.dumps(event) + "\n")

    identity: int | None = None
    failed = False
    key = secrets.token_hex(32)
    signal.signal(signal.SIGALRM, timeout_signal)
    signal.alarm(2400)
    try:
        script = f"https://raw.githubusercontent.com/Paradigmllc/Paradigmjpcom/{PROVISION_REVISION}/scripts/vast/provision-video-factory-wan22.sh"
        env = {"PROVISIONING_SCRIPT": script, "COMFY_PROXY_KEY": key,
                 "COMFY_INTERNAL_PORT": "18188", "COMFY_PROXY_PORT": "18189",
                 "COMFYUI_ARGS": "--disable-auto-launch --disable-all-custom-nodes --listen 127.0.0.1 --port 18188",
                 "-p 18189:18189": "1"}
        onstart = 'bash -lc \'set -e; curl -fsSL "$PROVISIONING_SCRIPT" -o /tmp/paradigm-qa-provision.sh; bash /tmp/paradigm-qa-provision.sh\''
        if runtime == "comfy-pinned":
            # Sandbox only: explicit image creation avoids a template silently selecting
            # the 26GB all-in-one image or a newer CUDA family. No production settings change.
            result = await client._request("PUT", f"/v0/asks/{offer_id}/", json_body={
                "image": COMFY_IMAGE, "label": label, "disk": 100, "target_state": "running",
                "cancel_unavail": True, "runtype": "ssh_direct", "env": env, "onstart": onstart,
            })
        else:
            result = await client.create_instance(
                offer_id, template_hash_id=TEMPLATE, label=label, disk_gb=100,
                runtype="ssh_direct", env=env, onstart=onstart,
            )
        if not isinstance(result, dict):
            raise ValueError("Ambiguous creation response")
        nested = result.get("result")
        identity = int((nested.get("new_contract") if isinstance(nested, dict) else None)
                       or result.get("new_contract") or result.get("id") or 0) or None
        if identity is None:
            raise ValueError("Ambiguous creation; reconcile exact label, never retry")
        log("rented", instance_id=identity, hourly_compute=offer["dph_total"])
        last_status = None
        connection = None
        async with httpx.AsyncClient(timeout=15) as http:
            while time.monotonic() - started < 900:
                instance = next((item for item in await client.list_instances() if item.get("id") == identity), None)
                if instance is None:
                    raise ValueError("Sandbox disappeared")
                status = instance.get("actual_status")
                detail = bootstrap_phase(instance)
                if (status, detail) != last_status:
                    log("bootstrap", status=status, detail=detail)
                    last_status = (status, detail)
                if detail in {"disk_full", "image_unavailable"} or status in {"exited", "offline", "stopped"}:
                    raise RuntimeError("Terminal bootstrap failure; no automatic replacement")
                if status == "running":
                    try:
                        connection = vast_instance_connection(instance)
                        response = await http.get(connection.base_url + "/__video_factory/status",
                                                  headers={"Authorization": "Bearer " + key})
                        if response.status_code == 200 and response.json().get("ready"):
                            actual = {item["exact_artifact"]: item["sha256"] for item in response.json().get("models", [])}
                            expected = yaml.safe_load(settings.model_registry_path.read_text())["models"]
                            if any(item.get("commercial_use") == "approved"
                                   and actual.get(item["exact_artifact"]) != item["sha256"] for item in expected):
                                raise RuntimeError("Model checksum mismatch")
                            break
                    except (httpx.HTTPError, ValueError) as error:
                        log("proxy_wait", error_type=type(error).__name__)
                await asyncio.sleep(20)
            else:
                raise TimeoutError("Bootstrap cutoff")
        verified = dataclasses.replace(settings, comfyui_base_url=connection.base_url, comfyui_api_key=key)
        if not doctor_report(verified)["production_ready"]:
            raise ValueError("Baseline doctor rejected runtime")
        log("model_and_runtime_verified", status="200")
        sandbox = dataclasses.replace(verified, environment="local", comfyui_allow_unregistered_workflows=True,
                                      comfyui_timeout_seconds=600)
        for name, graph, manifest in candidates:
            if time.monotonic() - started > 1750:
                log("candidate_skipped", candidate=name, reason="deadline_headroom")
                break
            path = workspace.root / f"{name}-workflow.json"
            path.write_text(json.dumps(graph, indent=2))
            shot, spec = manifest.shots[0], manifest.primary_deliverable
            (workspace.root / f"{name}-manifest.json").write_text(manifest.model_dump_json(indent=2))
            before = set(workspace.assets_generated.rglob("*.mp4"))
            log("generating", candidate=name)
            output = ComfyUIAdapter().run(shot, EngineContext(sandbox, workspace, manifest, spec, False))
            native_files = set(workspace.assets_generated.rglob("*.mp4")) - before
            if len(native_files) != 1:
                raise ValueError("Expected one native source")
            native = probe_media(next(iter(native_files)))
            if native.width != 1280 or native.height != 704 or native.duration_seconds < 5:
                raise ValueError("Native output does not match comparison")
            (workspace.root / f"{name}-native.json").write_text(native.model_dump_json(indent=2))
            (workspace.root / f"{name}-output.json").write_text(output.model_dump_json(indent=2))
            log("generated", candidate=name, generation_seconds=round(output.elapsed_seconds))
    except Exception as error:
        failed = True
        log("failed", error_type=type(error).__name__)
    finally:
        signal.alarm(0)
        targets = [item for item in await client.list_instances() if item.get("label") == label]
        for instance in targets:
            target = int(instance["id"])
            try:
                await client.set_instance_state(target, "stopped")
            except Exception as error:
                log("stop_request_failed", error_type=type(error).__name__)
            await client.destroy_instance(target)
        removed = not any(item.get("label") == label for item in await client.list_instances())
        (workspace.root / "cleanup.json").write_text(json.dumps({"instance_id": identity, "removed": removed}))
        log("cleanup", instance_id=identity, removed=removed)
        if not removed:
            raise RuntimeError("Sandbox cleanup requires operator attention")
    if failed:
        raise RuntimeError("Quality probe failed; see sanitized phase events")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    target = parser.add_mutually_exclusive_group(required=True)
    target.add_argument("--offer-id", type=int)
    target.add_argument("--machine-id", type=int, help="Resolve the current offer on this exact reviewed host only")
    parser.add_argument("--project", required=True)
    parser.add_argument("--execute", action="store_true", help="Explicit paid single rental; default is read-only")
    parser.add_argument("--candidate", choices=["both", "draft20", "reference50"], default="both")
    parser.add_argument("--runtime", choices=["legacy", "comfy-pinned"], default="legacy")
    args = parser.parse_args()
    if not args.project.startswith("wan-qa-") or not args.project.replace("-", "").isalnum():
        parser.error("Use a unique wan-qa- project slug")
    asyncio.run(run(args.offer_id, args.project, args.execute, args.machine_id, args.candidate, args.runtime))
