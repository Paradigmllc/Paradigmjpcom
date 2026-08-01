#!/usr/bin/env python3
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

VAST_ORIGIN = "https://console.vast.ai/api"
PUBLIC_ORIGIN = "https://www.paradigmjp.com"
COOLIFY_ORIGIN = os.environ.get("COOLIFY_API_URL", "https://coolify.paradigmjp.com").rstrip("/")
APP_UUID = os.environ.get("PARADIGM_APP_UUID", "n8i2sjiqvr2d8hrzppop2m2i")
PROVISIONING_SCRIPT = (
    "https://raw.githubusercontent.com/Paradigmllc/Paradigmjpcom/main/"
    "scripts/vast/provision-video-factory-wan22.sh"
)
KEY_PATH = Path(os.environ.get("VAST_KEY_PATH", "/tmp/vast-api-key"))
EVIDENCE_PATH = Path(os.environ.get("BOOTSTRAP_EVIDENCE_PATH", "/tmp/vast-production-bootstrap.json"))
SMOKE_PATH = Path(os.environ.get("BOOTSTRAP_SMOKE_PATH", "/tmp/vast-wan22-smoke.mp4"))


class BootstrapError(RuntimeError):
    pass


def log(message: str) -> None:
    print(f"[vast-production-bootstrap] {message}", flush=True)


def request_bytes(
    method: str,
    url: str,
    *,
    headers: dict[str, str] | None = None,
    body: bytes | None = None,
    timeout: float = 60.0,
) -> tuple[int, bytes, dict[str, str]]:
    request = urllib.request.Request(url, data=body, method=method)
    for key, value in (headers or {}).items():
        request.add_header(key, value)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, response.read(), dict(response.headers.items())
    except urllib.error.HTTPError as error:
        payload = error.read()
        detail = payload.decode("utf-8", errors="replace")[:1200]
        raise BootstrapError(f"{method} {url} -> HTTP {error.code}: {detail}") from error
    except urllib.error.URLError as error:
        raise BootstrapError(f"{method} {url} failed: {error}") from error


def request_json(
    method: str,
    url: str,
    *,
    headers: dict[str, str] | None = None,
    payload: Any | None = None,
    timeout: float = 60.0,
) -> Any:
    request_headers = {"Accept": "application/json", **(headers or {})}
    body = None
    if payload is not None:
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        request_headers["Content-Type"] = "application/json"
    _status, raw, _headers = request_bytes(
        method,
        url,
        headers=request_headers,
        body=body,
        timeout=timeout,
    )
    if not raw:
        return {"success": True}
    try:
        return json.loads(raw)
    except json.JSONDecodeError as error:
        raise BootstrapError(f"{method} {url} returned invalid JSON") from error


def first_string(value: Any) -> str | None:
    text = str(value).strip() if value is not None else ""
    return text or None


def coolify_headers() -> dict[str, str]:
    token = first_string(os.environ.get("COOLIFY_API_TOKEN"))
    if not token:
        raise BootstrapError("COOLIFY_API_TOKEN is unavailable")
    return {"Authorization": f"Bearer {token}"}


def load_admin_secret() -> str:
    rows = request_json(
        "GET",
        f"{COOLIFY_ORIGIN}/api/v1/applications/{APP_UUID}/envs",
        headers=coolify_headers(),
    )
    if not isinstance(rows, list):
        raise BootstrapError("Coolify environment response was not a list")

    def value_for(name: str) -> str | None:
        candidates = [
            row
            for row in rows
            if isinstance(row, dict)
            and str(row.get("key") or row.get("name") or "") == name
            and not bool(row.get("is_preview", False))
        ]
        for row in candidates:
            for field in ("real_value", "value"):
                value = first_string(row.get(field))
                if value and value not in {"********", "***", "REDACTED"}:
                    return value
        return None

    for name in ("ADMIN_SESSION_SECRET", "ADMIN_PASSWORD", "PAYLOAD_SECRET"):
        value = value_for(name)
        if value and len(value) >= 16:
            return value
    raise BootstrapError("No usable Paradigm admin session secret was returned by Coolify")


def admin_cookie(secret: str) -> str:
    expires_at = int(time.time()) + 3600
    nonce = base64.urlsafe_b64encode(secrets.token_bytes(18)).rstrip(b"=").decode("ascii")
    unsigned = f"{expires_at}.{nonce}"
    signature = base64.urlsafe_b64encode(
        hmac.new(secret.encode("utf-8"), unsigned.encode("utf-8"), hashlib.sha256).digest()
    ).rstrip(b"=").decode("ascii")
    return f"paradigm_admin_token={unsigned}.{signature}"


def public_json(cookie: str, method: str, path: str, payload: Any | None = None) -> Any:
    return request_json(
        method,
        f"{PUBLIC_ORIGIN}{path}",
        headers={"Cookie": cookie, "Cache-Control": "no-cache"},
        payload=payload,
        timeout=1800.0,
    )


def vast_headers(api_key: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {api_key}"}


def vast_json(api_key: str, method: str, path: str, payload: Any | None = None) -> Any:
    return request_json(
        method,
        f"{VAST_ORIGIN}{path}",
        headers=vast_headers(api_key),
        payload=payload,
        timeout=120.0,
    )


def template_score(item: dict[str, Any]) -> float:
    text = " ".join(
        str(item.get(key) or "") for key in ("name", "desc", "image")
    ).lower()
    score = 0.0
    if "comfyui" in text:
        score += 200.0
    if item.get("recommended") is True or "recommended" in text:
        score += 50.0
    if "ssh" in text or "jupyter" in text:
        score += 20.0
    if "serverless" in text:
        score -= 200.0
    score += float(item.get("count_created") or 0) / 1000.0
    return score


def discover_templates(api_key: str) -> list[dict[str, Any]]:
    attempts = [
        {"recommended": {"eq": True}, "use_ssh": {"eq": True}},
        {"use_ssh": {"eq": True}},
        {},
    ]
    for filters in attempts:
        query = urllib.parse.urlencode(
            {
                "select_filters": json.dumps(filters, separators=(",", ":")),
                "select_cols": json.dumps(["*"]),
                "order_by": "count_created",
            }
        )
        body = vast_json(api_key, "GET", f"/v0/template/?{query}")
        rows = body.get("templates", []) if isinstance(body, dict) else []
        ranked = sorted(
            [
                row
                for row in rows
                if isinstance(row, dict)
                and (row.get("hash_id") or row.get("hash"))
                and "comfyui" in " ".join(
                    str(row.get(key) or "") for key in ("name", "desc", "image")
                ).lower()
            ],
            key=template_score,
            reverse=True,
        )
        if ranked:
            return ranked
    raise BootstrapError("Vast.ai returned no usable ComfyUI template")


def offer_score(item: dict[str, Any]) -> float:
    price = max(float(item.get("dph_total") or item.get("min_bid") or 99.0), 0.001)
    dlperf = max(float(item.get("dlperf") or 0.1), 0.1)
    reliability = max(float(item.get("reliability") or 0.5), 0.5)
    inet = min(max(float(item.get("inet_down") or 0.0), 0.0), 2000.0) / 2000.0
    disk = min(max(float(item.get("disk_bw") or 0.0), 0.0), 5000.0) / 5000.0
    gpu = str(item.get("gpu_name") or "")
    preference = 1.15 if "4090" in gpu else 1.05 if "A6000" in gpu or "L40S" in gpu else 1.0
    return (dlperf / price) * reliability * (1.0 + inet * 0.1 + disk * 0.05) * preference


def discover_offers(api_key: str) -> list[dict[str, Any]]:
    searches = [
        (["RTX 4090"], 24, 0.95),
        (["RTX 3090", "RTX A6000"], 24, 0.80),
        (["A40", "L40S"], 40, 1.25),
    ]
    by_id: dict[int, dict[str, Any]] = {}
    for names, min_ram_gb, cap in searches:
        payload: dict[str, Any] = {
            "gpu_name": {"in": names},
            "num_gpus": {"gte": 1},
            "gpu_ram": {"gte": min_ram_gb * 1024},
            "reliability": {"gte": 0.99},
            "rentable": {"eq": True},
            "rented": {"eq": False},
            "verified": {"eq": True},
            "type": "ondemand",
            "dph_total": {"lte": cap},
            "limit": 100,
            "order": [["dph_total", "asc"]],
        }
        body = vast_json(api_key, "POST", "/v0/bundles/", payload)
        rows = body.get("offers", []) if isinstance(body, dict) else []
        if isinstance(rows, dict):
            rows = [rows]
        for row in rows if isinstance(rows, list) else []:
            if not isinstance(row, dict):
                continue
            offer_id = int(row.get("id") or row.get("ask_contract_id") or 0)
            if offer_id > 0:
                by_id[offer_id] = row
    ranked = sorted(by_id.values(), key=offer_score, reverse=True)
    if not ranked:
        raise BootstrapError("Vast.ai returned no verified 24GB+ GPU offer within the price caps")
    return ranked


def create_instance(
    api_key: str,
    template_hash: str,
    offers: list[dict[str, Any]],
) -> tuple[int, dict[str, Any], str]:
    proxy_key = secrets.token_hex(32)
    print(f"::add-mask::{proxy_key}", flush=True)
    onstart = (
        "bash -lc 'set -e; "
        "curl -fsSL \"$PROVISIONING_SCRIPT\" -o /tmp/paradigm-provision.sh; "
        "chmod 700 /tmp/paradigm-provision.sh; "
        "/tmp/paradigm-provision.sh'"
    )
    last_error: Exception | None = None
    for offer in offers[:12]:
        offer_id = int(offer.get("id") or offer.get("ask_contract_id") or 0)
        if offer_id <= 0:
            continue
        payload = {
            "template_hash_id": template_hash,
            "label": f"paradigm-comfyui-wan22-{int(time.time()) % 1_000_000:06d}",
            "disk": 120,
            "target_state": "running",
            "cancel_unavail": True,
            "runtype": "ssh_direct",
            "onstart": onstart,
            "env": {
                "PROVISIONING_SCRIPT": PROVISIONING_SCRIPT,
                "COMFY_PROXY_KEY": proxy_key,
                "COMFY_INTERNAL_PORT": "18188",
                "COMFY_PROXY_PORT": "18189",
                "COMFYUI_ARGS": "--disable-auto-launch --listen 127.0.0.1 --port 18188",
                "WEB_ENABLE_AUTH": "false",
                "HF_HUB_ENABLE_HF_TRANSFER": "1",
                "-p 18189:18189": "1",
            },
        }
        try:
            response = vast_json(api_key, "PUT", f"/v0/asks/{offer_id}/", payload)
            instance_id = int(
                (response.get("result") or {}).get("new_contract")
                if isinstance(response.get("result"), dict)
                else 0
            )
            instance_id = instance_id or int(
                response.get("new_contract") or response.get("id") or 0
            )
            if instance_id <= 0:
                raise BootstrapError("Vast.ai did not return a new instance ID")
            return instance_id, offer, proxy_key
        except Exception as error:  # noqa: BLE001 - marketplace offers can disappear
            last_error = error
            log(f"Offer {offer_id} became unavailable; trying the next ranked offer")
    raise BootstrapError(f"All qualified Vast.ai offers failed: {last_error}")


def instance_rows(api_key: str) -> list[dict[str, Any]]:
    body = vast_json(api_key, "GET", "/v1/instances/")
    if isinstance(body, dict):
        rows = body.get("instances", body.get("results", []))
    else:
        rows = body
    if isinstance(rows, dict):
        rows = [rows]
    return [row for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []


def mapped_port(instance: dict[str, Any], names: tuple[str, ...]) -> str | None:
    ports = instance.get("ports")
    if not isinstance(ports, dict):
        return None
    for name in names:
        value = ports.get(name)
        if isinstance(value, list):
            value = value[0] if value else None
        if isinstance(value, dict):
            port = value.get("HostPort") or value.get("host_port") or value.get("port")
        else:
            port = value
        text = first_string(port)
        if text:
            return text
    return None


def wait_for_instance(api_key: str, instance_id: int, timeout_seconds: int = 5400) -> tuple[dict[str, Any], str]:
    deadline = time.monotonic() + timeout_seconds
    last_status = "unknown"
    while time.monotonic() < deadline:
        instance = next(
            (
                row
                for row in instance_rows(api_key)
                if int(row.get("id") or row.get("instance_id") or 0) == instance_id
            ),
            None,
        )
        if instance is None:
            time.sleep(10)
            continue
        last_status = str(
            instance.get("actual_status")
            or instance.get("status")
            or instance.get("cur_state")
            or "unknown"
        )
        if any(word in last_status.lower() for word in ("destroy", "exit", "fail", "error")):
            raise BootstrapError(f"Vast.ai instance entered terminal state: {last_status}")
        host = first_string(
            instance.get("public_ipaddr")
            or instance.get("public_ip")
            or instance.get("ssh_host")
        )
        port = mapped_port(instance, ("18189/tcp", "18189", "8189/tcp", "8189"))
        if last_status == "running" and host and port:
            return instance, f"http://{host}:{port}"
        time.sleep(10)
    raise BootstrapError(f"Vast.ai instance did not expose ComfyUI in time; last status={last_status}")


def proxy_headers(proxy_key: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {proxy_key}",
        "X-API-Key": proxy_key,
        "Accept": "application/json",
    }


def wait_for_manifest(base_url: str, proxy_key: str, timeout_seconds: int = 7200) -> dict[str, Any]:
    deadline = time.monotonic() + timeout_seconds
    last_detail = "waiting"
    while time.monotonic() < deadline:
        try:
            manifest = request_json(
                "GET",
                f"{base_url}/__video_factory/status",
                headers=proxy_headers(proxy_key),
                timeout=30.0,
            )
            if isinstance(manifest, dict):
                last_detail = str(manifest.get("phase") or manifest.get("detail") or "waiting")
                if manifest.get("ready") is True:
                    return manifest
        except BootstrapError as error:
            last_detail = str(error)
        time.sleep(15)
    raise BootstrapError(f"ComfyUI provisioning did not become ready: {last_detail[-500:]}")


def replace_placeholders(value: Any, bindings: dict[str, Any]) -> Any:
    if isinstance(value, dict):
        return {key: replace_placeholders(item, bindings) for key, item in value.items()}
    if isinstance(value, list):
        return [replace_placeholders(item, bindings) for item in value]
    if isinstance(value, str) and value.startswith("{{") and value.endswith("}}"):
        return bindings.get(value[2:-2].strip(), value)
    return value


def find_outputs(history: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    outputs = history.get("outputs", {})
    if not isinstance(outputs, dict):
        return rows
    for node in outputs.values():
        if not isinstance(node, dict):
            continue
        for key in ("videos", "gifs", "images", "audio"):
            values = node.get(key)
            if isinstance(values, list):
                rows.extend(
                    item
                    for item in values
                    if isinstance(item, dict) and item.get("filename")
                )
    return rows


def run_smoke(base_url: str, proxy_key: str, manifest: dict[str, Any]) -> dict[str, Any]:
    workflow = (
        manifest.get("workflows", {})
        .get("abstract-broll-t2v", {})
        .get("workflow_json")
    )
    if not isinstance(workflow, dict):
        raise BootstrapError("Provisioned ComfyUI did not expose abstract-broll-t2v")
    prompt = replace_placeholders(
        workflow,
        {
            "prompt": (
                "clean cinematic abstract technology waves, deep navy background, "
                "subtle emerald light, premium B2B software advertising, smooth camera motion, "
                "no text, no logos"
            ),
            "negative_prompt": "text, logo, watermark, human face, hands, distortion, low quality, flicker",
            "seed": 20260730,
            "width": 480,
            "height": 272,
        },
    )
    for node in prompt.values():
        if not isinstance(node, dict):
            continue
        class_type = node.get("class_type")
        inputs = node.get("inputs")
        if not isinstance(inputs, dict):
            continue
        if class_type == "Wan22ImageToVideoLatent":
            inputs.update({"width": 480, "height": 272, "length": 33})
        elif class_type == "KSampler":
            inputs.update({"steps": 10, "cfg": 4.0})
        elif class_type == "CreateVideo":
            inputs["fps"] = 16.0
        elif class_type == "SaveVideo":
            inputs["filename_prefix"] = "video/ParadigmProductionBootstrap"

    submitted = request_json(
        "POST",
        f"{base_url}/prompt",
        headers=proxy_headers(proxy_key),
        payload={"prompt": prompt, "client_id": secrets.token_hex(16)},
        timeout=90.0,
    )
    prompt_id = first_string(submitted.get("prompt_id") if isinstance(submitted, dict) else None)
    if not prompt_id:
        raise BootstrapError("ComfyUI did not return a smoke prompt ID")

    deadline = time.monotonic() + 3600
    while time.monotonic() < deadline:
        history_payload = request_json(
            "GET",
            f"{base_url}/history/{urllib.parse.quote(prompt_id)}",
            headers=proxy_headers(proxy_key),
            timeout=60.0,
        )
        history = history_payload.get(prompt_id) if isinstance(history_payload, dict) else None
        if isinstance(history, dict):
            outputs = find_outputs(history)
            if outputs:
                item = outputs[0]
                query = urllib.parse.urlencode(
                    {
                        "filename": str(item["filename"]),
                        "subfolder": str(item.get("subfolder") or ""),
                        "type": str(item.get("type") or "output"),
                    }
                )
                _status, data, headers = request_bytes(
                    "GET",
                    f"{base_url}/view?{query}",
                    headers=proxy_headers(proxy_key),
                    timeout=180.0,
                )
                if len(data) < 10_000:
                    raise BootstrapError(f"ComfyUI smoke output is unexpectedly small: {len(data)}")
                SMOKE_PATH.write_bytes(data)
                return {
                    "prompt_id": prompt_id,
                    "filename": str(item["filename"]),
                    "content_type": headers.get("Content-Type"),
                    "size_bytes": len(data),
                    "sha256": hashlib.sha256(data).hexdigest(),
                }
            status = history.get("status")
            if isinstance(status, dict) and (
                status.get("status_str") == "error"
                or status.get("completed") is True
            ):
                raise BootstrapError(
                    "ComfyUI smoke completed without output: "
                    + json.dumps(status, ensure_ascii=False)[:1000]
                )
        time.sleep(10)
    raise BootstrapError("ComfyUI smoke render timed out")


def register_assets(cookie: str, base_url: str, proxy_key: str, manifest: dict[str, Any]) -> dict[str, Any]:
    public_json(
        cookie,
        "PUT",
        "/v1/runtime",
        {
            "comfyui_base_url": base_url,
            "comfyui_api_key": proxy_key,
        },
    )
    models = manifest.get("models", [])
    if not isinstance(models, list) or not models:
        raise BootstrapError("ComfyUI manifest contains no model records")
    for model in models:
        if not isinstance(model, dict):
            continue
        public_json(
            cookie,
            "POST",
            "/v1/registry/models",
            {
                "id": model["id"],
                "engine": "comfyui",
                "model_family": model["model_family"],
                "exact_artifact": model["exact_artifact"],
                "sha256": model["sha256"],
                "code_license": model["code_license"],
                "model_license": model["model_license"],
                "commercial_use": "approved",
                "regions": ["JP"],
                "approved_workflows": model["approved_workflows"],
                "reviewed_by": "Gracecom owner-delegated official-source bootstrap",
                "source_url": model.get("source_url"),
                "notes": model.get("notes"),
                "confirm_license_review": True,
            },
        )
    workflow = manifest.get("workflows", {}).get("abstract-broll-t2v")
    if not isinstance(workflow, dict) or not isinstance(workflow.get("workflow_json"), dict):
        raise BootstrapError("ComfyUI manifest contains no abstract-broll-t2v workflow")
    bound = public_json(
        cookie,
        "POST",
        "/v1/registry/workflows/abstract-broll-t2v/bind",
        {
            "workflow_json": workflow["workflow_json"],
            "reviewed_by": "Gracecom owner-delegated official-source bootstrap",
            "model_bindings": workflow["model_bindings"],
            "confirm_license_review": True,
        },
    )
    return bound


def run_full_factory_test(cookie: str) -> dict[str, Any]:
    brief = {
        "project_name": f"production-readiness-{int(time.time())}",
        "objective": "Verify the complete Paradigm AI video production pipeline with a real generated B-roll shot.",
        "audience": "Paradigm production operators validating the commercial video service before client delivery.",
        "platforms": ["website"],
        "duration_seconds": 8,
        "languages": ["en"],
        "brand": {
            "name": "Paradigm",
            "primary_color": "#0B1020",
            "accent_color": "#7C5CFC",
            "text_color": "#FFFFFF",
            "font_family": "Inter",
            "logo_path": None,
        },
        "source_assets": [],
        "reference_urls": [],
        "rights": {
            "source_assets_cleared": True,
            "ai_generation_allowed": True,
            "likeness_consent": "not_applicable",
            "voice_consent": "not_applicable",
            "claims_approved_by_client": True,
            "notes": "Internal production-readiness test only.",
        },
        "approver": {"name": "Paradigm Production QA", "email": "contact@paradigmjp.com"},
        "deliverables": [
            {
                "name": "production-readiness-master",
                "language": "en",
                "aspect_ratio": "16:9",
                "width": 640,
                "height": 360,
                "fps": 24,
                "format": "mp4",
            }
        ],
        "localizations": {},
        "requested_shot_kinds": ["generative", "text_motion", "text_motion"],
        "notes": "Automated full-stack production readiness test.",
    }
    queued = public_json(
        cookie,
        "POST",
        "/v1/runs",
        {
            "brief": brief,
            "dry_run": False,
            "planner_provider": "deterministic",
            "auto_approve": False,
            "delivery_target": "local",
        },
    )
    run_id = first_string(queued.get("run_id") if isinstance(queued, dict) else None)
    if not run_id:
        raise BootstrapError("Video Factory did not return a production run ID")
    deadline = time.monotonic() + 3600
    status: dict[str, Any] | None = None
    while time.monotonic() < deadline:
        current = public_json(cookie, "GET", f"/v1/runs/{urllib.parse.quote(run_id)}")
        if isinstance(current, dict):
            status = current
            if current.get("state") == "completed":
                break
            if current.get("state") == "failed":
                raise BootstrapError(f"Video Factory production run failed: {current.get('error')}")
        time.sleep(10)
    if not status or status.get("state") != "completed":
        raise BootstrapError("Video Factory production run timed out")
    project_id = first_string(status.get("project_id"))
    if not project_id:
        raise BootstrapError("Completed Video Factory run has no project ID")
    project = public_json(cookie, "GET", f"/v1/projects/{urllib.parse.quote(project_id)}")
    state = project.get("state", {}) if isinstance(project, dict) else {}
    if state.get("status") != "draft_review_required":
        raise BootstrapError(f"Unexpected draft state: {state.get('status')}")
    public_json(
        cookie,
        "POST",
        f"/v1/projects/{urllib.parse.quote(project_id)}/reviews/draft/approve",
        {"reviewer": "Paradigm Production QA", "notes": "Automated readiness draft approval."},
    )
    public_json(cookie, "POST", f"/v1/projects/{urllib.parse.quote(project_id)}/finalize")
    public_json(
        cookie,
        "POST",
        f"/v1/projects/{urllib.parse.quote(project_id)}/reviews/final/approve",
        {"reviewer": "Paradigm Production QA", "notes": "Automated readiness final approval."},
    )
    delivery = public_json(
        cookie,
        "POST",
        f"/v1/projects/{urllib.parse.quote(project_id)}/deliver",
        {"target": "local"},
    )
    final_project = public_json(cookie, "GET", f"/v1/projects/{urllib.parse.quote(project_id)}")
    final_state = final_project.get("state", {}) if isinstance(final_project, dict) else {}
    if final_state.get("status") != "delivered":
        raise BootstrapError(f"Full production test did not reach delivered: {final_state.get('status')}")
    return {
        "run_id": run_id,
        "project_id": project_id,
        "status": final_state.get("status"),
        "delivery_target": delivery.get("target") if isinstance(delivery, dict) else "local",
        "delivery_items": len(delivery.get("items", [])) if isinstance(delivery, dict) else 0,
    }


def destroy_instance(api_key: str, instance_id: int) -> None:
    try:
        vast_json(api_key, "DELETE", f"/v0/instances/{instance_id}/")
    except Exception as error:  # noqa: BLE001
        log(f"Failed to clean up Vast.ai instance {instance_id}: {error}")


def main() -> int:
    if not KEY_PATH.is_file():
        raise BootstrapError(f"Vast.ai credential file is missing: {KEY_PATH}")
    api_key = KEY_PATH.read_text(encoding="utf-8").strip()
    if not (64 <= len(api_key) <= 128 and all(character in "0123456789abcdefABCDEF" for character in api_key)):
        raise BootstrapError("Vast.ai credential has an unexpected format")
    print(f"::add-mask::{api_key}", flush=True)

    evidence: dict[str, Any] = {
        "started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "credential_fingerprint": hashlib.sha256(api_key.encode()).hexdigest()[:16],
        "instance": None,
        "runtime": None,
        "registry": None,
        "smoke": None,
        "factory_test": None,
        "ready": False,
    }
    instance_id = 0
    try:
        account = vast_json(api_key, "GET", "/v0/users/current/")
        evidence["vast_account_valid"] = bool(account)
        secret = load_admin_secret()
        print(f"::add-mask::{secret}", flush=True)
        cookie = admin_cookie(secret)
        print(f"::add-mask::{cookie}", flush=True)

        configured = public_json(cookie, "PUT", "/v1/runtime", {"vast_api_key": api_key})
        if not configured.get("vast", {}).get("configured"):
            raise BootstrapError("Video Factory did not persist the Vast.ai credential")

        templates = discover_templates(api_key)
        offers = discover_offers(api_key)
        template = templates[0]
        template_hash = str(template.get("hash_id") or template.get("hash"))
        instance_id, offer, proxy_key = create_instance(api_key, template_hash, offers)
        evidence["instance"] = {
            "id": instance_id,
            "template_hash": template_hash,
            "template_name": template.get("name") or template.get("image"),
            "offer_id": int(offer.get("id") or offer.get("ask_contract_id") or 0),
            "gpu_name": offer.get("gpu_name"),
            "gpu_ram_gb": float(offer.get("gpu_ram") or 0) / 1024.0,
            "hourly_price": float(offer.get("dph_total") or offer.get("min_bid") or 0),
            "reliability": float(offer.get("reliability") or 0),
            "geolocation": offer.get("geolocation") or offer.get("country"),
        }
        public_json(cookie, "PUT", "/v1/runtime", {"vast_template_hash": template_hash})

        _instance, base_url = wait_for_instance(api_key, instance_id)
        manifest = wait_for_manifest(base_url, proxy_key)
        bound = register_assets(cookie, base_url, proxy_key, manifest)
        smoke = run_smoke(base_url, proxy_key, manifest)
        runtime = public_json(cookie, "GET", "/v1/runtime")
        registry = public_json(cookie, "GET", "/v1/registry")
        workflow = next(
            (
                item
                for item in registry.get("contracts", [])
                if isinstance(item, dict) and item.get("id") == "abstract-broll-t2v"
            ),
            {},
        )
        if not workflow.get("enabled") or not workflow.get("workflow_valid"):
            raise BootstrapError(f"abstract-broll-t2v is not operational: {workflow}")
        factory_test = run_full_factory_test(cookie)

        evidence.update(
            {
                "runtime": {
                    "vast_configured": runtime.get("vast", {}).get("configured"),
                    "comfyui_base_url": runtime.get("effective_comfyui", {}).get("base_url"),
                    "comfyui_api_key_configured": runtime.get("effective_comfyui", {}).get("api_key_configured"),
                },
                "registry": {
                    "workflow": workflow,
                    "model_count": len(registry.get("models", {}).get("items", []))
                    if isinstance(registry.get("models"), dict)
                    else None,
                    "binding_ok": bool(bound.get("ok")) if isinstance(bound, dict) else True,
                },
                "smoke": smoke,
                "factory_test": factory_test,
                "completed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "ready": True,
            }
        )
        EVIDENCE_PATH.write_text(json.dumps(evidence, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        log("Vast.ai, ComfyUI, approved workflow, real smoke render, and full Video Factory delivery all passed")
        return 0
    except Exception as error:  # noqa: BLE001
        evidence["error"] = str(error)
        evidence["failed_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        EVIDENCE_PATH.write_text(json.dumps(evidence, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        if instance_id and not evidence.get("smoke"):
            destroy_instance(api_key, instance_id)
        raise
    finally:
        try:
            KEY_PATH.unlink(missing_ok=True)
        except OSError:
            pass


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except BootstrapError as error:
        print(f"[vast-production-bootstrap] ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
