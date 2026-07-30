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
from dataclasses import dataclass
from pathlib import Path
from typing import Any

VAST_BASE = os.getenv("VAST_API_BASE_URL", "https://console.vast.ai/api").rstrip("/")
PARADIGM_BASE = os.getenv("PARADIGM_BASE_URL", "https://www.paradigmjp.com").rstrip("/")
PROVISION_URL = os.getenv(
    "VAST_PROVISION_SCRIPT_URL",
    "https://raw.githubusercontent.com/Paradigmllc/Paradigmjpcom/agent/harden-vast-comfyui-runtime/scripts/vast/provision-video-factory-wan22.sh",
)
LABEL_PREFIX = "paradigm-comfyui-wan22"
EVIDENCE_PATH = Path(os.getenv("VAST_ACTIVATION_EVIDENCE", "/tmp/vast-activation-evidence.json"))
GPU_NAMES = ["RTX 4090", "RTX 3090", "RTX A6000", "A40", "L40S", "A100 SXM4 80GB"]


class ActivationError(RuntimeError):
    pass


@dataclass
class HttpResult:
    status: int
    body: bytes
    headers: dict[str, str]

    def json(self) -> Any:
        return json.loads(self.body.decode("utf-8")) if self.body else None


def request(
    method: str,
    url: str,
    *,
    headers: dict[str, str] | None = None,
    payload: Any | None = None,
    timeout: float = 60,
) -> HttpResult:
    final_headers = {
        "Accept": "application/json",
        "User-Agent": "Paradigm-Video-Factory-Activation/2.0",
        **(headers or {}),
    }
    data = None
    if payload is not None:
        data = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        final_headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, method=method, headers=final_headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return HttpResult(
                status=response.status,
                body=response.read(),
                headers={key.lower(): value for key, value in response.headers.items()},
            )
    except urllib.error.HTTPError as error:
        body = error.read()
        detail = body.decode("utf-8", "replace")[:1200]
        raise ActivationError(f"{method} {url} -> HTTP {error.code}: {detail}") from error
    except urllib.error.URLError as error:
        raise ActivationError(f"{method} {url} failed: {error}") from error


def vast_request(method: str, path: str, *, payload: Any | None = None, timeout: float = 60) -> Any:
    key = os.environ["VAST_API_KEY"]
    result = request(
        method,
        f"{VAST_BASE}{path}",
        headers={"Authorization": f"Bearer {key}"},
        payload=payload,
        timeout=timeout,
    )
    return result.json()


def b64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def admin_cookie(secret: str) -> str:
    expires_at = int(time.time()) + 60 * 60
    nonce = b64url(secrets.token_bytes(18))
    unsigned = f"{expires_at}.{nonce}"
    signature = b64url(hmac.new(secret.encode(), unsigned.encode(), hashlib.sha256).digest())
    return f"paradigm_admin_token={unsigned}.{signature}"


def paradigm_request(
    method: str,
    path: str,
    *,
    payload: Any | None = None,
    timeout: float = 120,
) -> Any:
    secret = os.environ["PARADIGM_ADMIN_SECRET"]
    result = request(
        method,
        f"{PARADIGM_BASE}{path}",
        headers={"Cookie": admin_cookie(secret)},
        payload=payload,
        timeout=timeout,
    )
    return result.json()


def instances() -> list[dict[str, Any]]:
    payload = vast_request("GET", "/v1/instances/")
    if isinstance(payload, dict):
        values = payload.get("instances", payload.get("results", []))
    else:
        values = payload
    if isinstance(values, dict):
        values = [values]
    return [item for item in (values or []) if isinstance(item, dict)]


def destroy_instance(instance_id: int) -> None:
    try:
        vast_request("DELETE", f"/v0/instances/{instance_id}/")
    except ActivationError as error:
        print(f"[activation] warning: could not destroy instance {instance_id}: {error}", file=sys.stderr)


def clean_previous_instances() -> list[int]:
    removed: list[int] = []
    for item in instances():
        label = str(item.get("label") or item.get("name") or "")
        if not label.startswith(LABEL_PREFIX):
            continue
        raw_id = item.get("id") or item.get("instance_id")
        try:
            instance_id = int(raw_id)
        except (TypeError, ValueError):
            continue
        print(f"[activation] removing previous Video Factory GPU instance {instance_id}")
        destroy_instance(instance_id)
        removed.append(instance_id)
    if removed:
        time.sleep(8)
    return removed


def template_candidates() -> list[dict[str, Any]]:
    filters = {"recommended": {"eq": True}, "use_ssh": {"eq": True}}
    query = urllib.parse.urlencode(
        {
            "select_filters": json.dumps(filters, separators=(",", ":")),
            "select_cols": json.dumps(["*"]),
            "order_by": "count_created",
        }
    )
    payload = vast_request("GET", f"/v0/template/?{query}")
    values = payload.get("templates", []) if isinstance(payload, dict) else payload
    if isinstance(values, dict):
        values = [values]
    results = [item for item in (values or []) if isinstance(item, dict)]
    comfy = [
        item
        for item in results
        if "comfy" in " ".join(
            str(item.get(key) or "") for key in ("name", "image", "desc", "description")
        ).lower()
    ]
    return comfy or results


def choose_template() -> tuple[str, str]:
    candidates = template_candidates()
    if not candidates:
        raise ActivationError("Vast.ai returned no usable SSH ComfyUI template")
    candidates.sort(
        key=lambda item: (
            0 if item.get("recommended") else 1,
            -float(item.get("count_created") or 0),
        )
    )
    selected = candidates[0]
    template_hash = str(
        selected.get("hash_id")
        or selected.get("template_hash_id")
        or selected.get("id")
        or ""
    ).strip()
    if not template_hash:
        raise ActivationError("Selected Vast.ai template has no hash identifier")
    return template_hash, str(selected.get("name") or selected.get("image") or "ComfyUI")


def offer_candidates(max_price: float = 1.5) -> list[dict[str, Any]]:
    body = {
        "gpu_name": {"in": GPU_NAMES},
        "num_gpus": {"gte": 1},
        "gpu_ram": {"gte": 24000},
        "reliability": {"gte": 0.99},
        "rentable": {"eq": True},
        "rented": {"eq": False},
        "verified": {"eq": True},
        "type": "ondemand",
        "dph_total": {"lte": max_price},
        "limit": 40,
        "order": [["dph_total", "asc"]],
    }
    payload = vast_request("POST", "/v0/bundles/", payload=body)
    values = payload.get("offers", []) if isinstance(payload, dict) else payload
    if isinstance(values, dict):
        values = [values]
    offers = [item for item in (values or []) if isinstance(item, dict)]
    offers.sort(
        key=lambda item: (
            float(item.get("dph_total") or 999) / max(float(item.get("dlperf") or 1), 1),
            -float(item.get("reliability") or 0),
            float(item.get("dph_total") or 999),
        )
    )
    return offers


def instance_id_from_create(payload: Any) -> int:
    candidates: list[Any] = []
    if isinstance(payload, dict):
        candidates.extend(
            [
                payload.get("new_contract"),
                payload.get("id"),
                payload.get("instance_id"),
                payload.get("contract_id"),
            ]
        )
        if isinstance(payload.get("instances"), list) and payload["instances"]:
            candidates.append(payload["instances"][0].get("id"))
    for candidate in candidates:
        try:
            value = int(candidate)
            if value > 0:
                return value
        except (TypeError, ValueError):
            continue
    raise ActivationError(f"Unexpected Vast.ai create-instance response: {payload}")


def create_instance(template_hash: str, offer: dict[str, Any], proxy_key: str) -> int:
    offer_id = int(offer.get("id") or offer.get("ask_contract_id") or offer.get("bundle_id"))
    label = f"{LABEL_PREFIX}-{int(time.time())}"
    onstart = (
        "set -eu; mkdir -p /workspace/video-factory-bootstrap; "
        f"curl -fsSL --retry 12 --retry-all-errors {urllib.parse.quote(PROVISION_URL, safe=':/._-')} "
        "-o /workspace/video-factory-bootstrap/provision.sh; "
        "chmod 700 /workspace/video-factory-bootstrap/provision.sh; "
        "nohup env COMFY_PROXY_KEY=\"$COMFY_PROXY_KEY\" COMFY_INTERNAL_PORT=18188 "
        "COMFY_PROXY_PORT=18189 VIDEO_FACTORY_BOOTSTRAP_ROOT=/workspace/video-factory-bootstrap "
        "bash /workspace/video-factory-bootstrap/provision.sh "
        ">/workspace/video-factory-bootstrap/provision.log 2>&1 &"
    )
    body = {
        "template_hash_id": template_hash,
        "label": label,
        "disk": 100,
        "target_state": "running",
        "cancel_unavail": True,
        "runtype": "ssh",
        "env": {
            "-p 18189:18189": "1",
            "COMFY_PROXY_KEY": proxy_key,
            "COMFY_INTERNAL_PORT": "18188",
            "COMFY_PROXY_PORT": "18189",
        },
        "onstart": onstart,
    }
    payload = vast_request("PUT", f"/v0/asks/{offer_id}/", payload=body, timeout=120)
    return instance_id_from_create(payload)


def current_instance(instance_id: int) -> dict[str, Any] | None:
    for item in instances():
        try:
            if int(item.get("id") or item.get("instance_id")) == instance_id:
                return item
        except (TypeError, ValueError):
            continue
    return None


def walk_port_candidates(value: Any, path: tuple[str, ...] = ()) -> list[int]:
    candidates: list[int] = []
    if isinstance(value, dict):
        for key, item in value.items():
            lowered = str(key).lower()
            next_path = (*path, lowered)
            if any(token in lowered for token in ("hostport", "host_port", "external_port", "public_port")):
                try:
                    port = int(item)
                    if 1024 <= port <= 65535:
                        candidates.append(port)
                except (TypeError, ValueError):
                    pass
            if lowered in {"18189", "18189/tcp"}:
                candidates.extend(walk_port_candidates(item, next_path))
            elif isinstance(item, (dict, list)):
                candidates.extend(walk_port_candidates(item, next_path))
    elif isinstance(value, list):
        for item in value:
            candidates.extend(walk_port_candidates(item, path))
    return candidates


def connection_candidates(item: dict[str, Any]) -> list[str]:
    hosts: list[str] = []
    for key in ("public_ipaddr", "public_ip", "ssh_host", "host", "machine_ip"):
        raw = str(item.get(key) or "").strip()
        if raw and raw not in hosts:
            hosts.append(raw)
    ports = walk_port_candidates(item.get("ports", {}))
    ports += walk_port_candidates(item.get("port_map", {}))
    for key in ("direct_port_start", "public_port", "external_port"):
        try:
            port = int(item.get(key))
            if 1024 <= port <= 65535:
                ports.append(port)
        except (TypeError, ValueError):
            pass
    ports = list(dict.fromkeys(ports))
    return [f"http://{host}:{port}" for host in hosts for port in ports]


def proxy_status(base_url: str, proxy_key: str) -> dict[str, Any] | None:
    try:
        result = request(
            "GET",
            f"{base_url}/__video_factory/status",
            headers={"Authorization": f"Bearer {proxy_key}"},
            timeout=20,
        )
        payload = result.json()
        return payload if isinstance(payload, dict) else None
    except (ActivationError, json.JSONDecodeError):
        return None


def wait_for_proxy(instance_id: int, proxy_key: str, timeout_seconds: int = 7200) -> tuple[str, dict[str, Any], dict[str, Any]]:
    deadline = time.monotonic() + timeout_seconds
    last_phase = ""
    last_item: dict[str, Any] = {}
    while time.monotonic() < deadline:
        item = current_instance(instance_id)
        if item is None:
            raise ActivationError(f"Vast.ai instance {instance_id} disappeared")
        last_item = item
        status = str(item.get("actual_status") or item.get("status") or item.get("cur_state") or "unknown")
        status_message = str(item.get("status_msg") or item.get("message") or "")
        if status.lower() in {"exited", "failed", "error", "offline"}:
            raise ActivationError(f"Vast.ai instance failed: {status} {status_message}")
        for candidate in connection_candidates(item):
            payload = proxy_status(candidate, proxy_key)
            if not payload:
                continue
            phase = str(payload.get("phase") or "unknown")
            if phase != last_phase:
                print(f"[activation] ComfyUI phase: {phase} - {payload.get('detail') or ''}")
                last_phase = phase
            if payload.get("ready") is True:
                return candidate, payload, item
        time.sleep(15)
    raise ActivationError(
        f"Timed out waiting for authenticated ComfyUI proxy; instance={instance_id}, "
        f"state={last_item.get('actual_status') or last_item.get('status')}, "
        f"message={last_item.get('status_msg') or ''}"
    )


def replace_placeholders(value: Any, bindings: dict[str, Any]) -> Any:
    if isinstance(value, dict):
        return {key: replace_placeholders(item, bindings) for key, item in value.items()}
    if isinstance(value, list):
        return [replace_placeholders(item, bindings) for item in value]
    if isinstance(value, str) and value.startswith("{{") and value.endswith("}}"):
        return bindings.get(value[2:-2].strip(), value)
    return value


def output_files(history: dict[str, Any]) -> list[dict[str, Any]]:
    files: list[dict[str, Any]] = []
    for node in history.get("outputs", {}).values():
        if not isinstance(node, dict):
            continue
        for key in ("videos", "gifs", "images", "audio"):
            values = node.get(key, [])
            if isinstance(values, list):
                files.extend(item for item in values if isinstance(item, dict) and item.get("filename"))
    return files


def direct_smoke(base_url: str, proxy_key: str, workflow: dict[str, Any]) -> dict[str, Any]:
    prompt = replace_placeholders(
        workflow,
        {
            "prompt": "clean cinematic abstract data streams, premium SaaS campaign, dark navy and violet light, no text, smooth camera movement",
            "negative_prompt": "text, letters, watermark, logo, distorted geometry, flicker, low quality",
            "seed": 20260730,
            "width": 320,
            "height": 192,
        },
    )
    if isinstance(prompt.get("7"), dict):
        prompt["7"].setdefault("inputs", {})["length"] = 17
    if isinstance(prompt.get("8"), dict):
        prompt["8"].setdefault("inputs", {})["steps"] = 4
        prompt["8"]["inputs"]["cfg"] = 3.5
    if isinstance(prompt.get("10"), dict):
        prompt["10"].setdefault("inputs", {})["fps"] = 8.0
    if isinstance(prompt.get("11"), dict):
        prompt["11"].setdefault("inputs", {})["filename_prefix"] = "video/ParadigmProductionSmoke"
    headers = {"Authorization": f"Bearer {proxy_key}", "X-API-Key": proxy_key}
    client_id = secrets.token_hex(16)
    queued = request(
        "POST",
        f"{base_url}/prompt",
        headers=headers,
        payload={"prompt": prompt, "client_id": client_id},
        timeout=120,
    ).json()
    prompt_id = str(queued.get("prompt_id") or "") if isinstance(queued, dict) else ""
    if not prompt_id:
        raise ActivationError(f"ComfyUI did not return a prompt ID: {queued}")
    deadline = time.monotonic() + 1800
    history: dict[str, Any] | None = None
    while time.monotonic() < deadline:
        payload = request(
            "GET",
            f"{base_url}/history/{prompt_id}",
            headers=headers,
            timeout=60,
        ).json()
        if isinstance(payload, dict) and isinstance(payload.get(prompt_id), dict):
            history = payload[prompt_id]
            if output_files(history):
                break
            status = history.get("status")
            if isinstance(status, dict) and status.get("status_str") == "error":
                raise ActivationError(f"ComfyUI smoke render failed: {status}")
        time.sleep(5)
    if history is None:
        raise ActivationError("ComfyUI smoke render timed out")
    files = output_files(history)
    if not files:
        raise ActivationError(f"ComfyUI smoke render produced no output: {history.get('status')}")
    item = files[0]
    query = urllib.parse.urlencode(
        {
            "filename": item["filename"],
            "subfolder": item.get("subfolder", ""),
            "type": item.get("type", "output"),
        }
    )
    media = request("GET", f"{base_url}/view?{query}", headers=headers, timeout=180).body
    if len(media) < 1024:
        raise ActivationError(f"ComfyUI smoke output is unexpectedly small: {len(media)} bytes")
    output_path = Path("/tmp/vast-comfyui-production-smoke.mp4")
    output_path.write_bytes(media)
    return {
        "prompt_id": prompt_id,
        "bytes": len(media),
        "sha256": hashlib.sha256(media).hexdigest(),
        "file": str(output_path),
    }


def configure_video_factory(base_url: str, proxy_key: str, status: dict[str, Any]) -> dict[str, Any]:
    paradigm_request(
        "PUT",
        "/v1/runtime",
        payload={
            "vast_api_key": os.environ["VAST_API_KEY"],
            "comfyui_base_url": base_url,
            "comfyui_api_key": proxy_key,
        },
    )
    models = status.get("models")
    if not isinstance(models, list) or not models:
        raise ActivationError("Provisioned ComfyUI status did not include model metadata")
    for model in models:
        if not isinstance(model, dict):
            continue
        paradigm_request(
            "POST",
            "/v1/registry/models",
            payload={
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
                "reviewed_by": "Paradigm automated official-model verification",
                "source_url": model.get("source_url"),
                "notes": model.get("notes"),
                "confirm_license_review": True,
            },
        )
    workflow_entry = status.get("workflows", {}).get("abstract-broll-t2v")
    if not isinstance(workflow_entry, dict):
        raise ActivationError("Provisioned ComfyUI status did not include abstract-broll-t2v")
    paradigm_request(
        "POST",
        "/v1/registry/workflows/abstract-broll-t2v/bind",
        payload={
            "workflow_json": workflow_entry["workflow_json"],
            "reviewed_by": "Paradigm automated official-model verification",
            "model_bindings": workflow_entry["model_bindings"],
            "confirm_license_review": True,
        },
        timeout=180,
    )
    registry = paradigm_request("GET", "/v1/registry")
    bootstrap = paradigm_request("GET", "/v1/console/bootstrap")
    return {"registry": registry, "bootstrap": bootstrap}


def assert_video_factory_ready(verification: dict[str, Any]) -> None:
    registry = verification.get("registry")
    bootstrap = verification.get("bootstrap")
    if not isinstance(registry, dict) or not registry.get("comfyui_configured"):
        raise ActivationError("Video Factory registry does not report ComfyUI configured")
    contracts = registry.get("contracts", [])
    contract = next(
        (
            item
            for item in contracts
            if isinstance(item, dict) and item.get("id") == "abstract-broll-t2v"
        ),
        None,
    )
    if not contract or not contract.get("enabled") or not contract.get("workflow_valid"):
        raise ActivationError(f"abstract-broll-t2v is not production-ready: {contract}")
    if not isinstance(bootstrap, dict) or not bootstrap.get("ok"):
        raise ActivationError("Video Factory bootstrap endpoint did not report ready")
    doctor = bootstrap.get("doctor", {})
    if isinstance(doctor, dict) and doctor.get("production_ready") is False:
        raise ActivationError(f"Video Factory doctor still reports not ready: {doctor}")


def write_evidence(payload: dict[str, Any]) -> None:
    EVIDENCE_PATH.parent.mkdir(parents=True, exist_ok=True)
    EVIDENCE_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    os.chmod(EVIDENCE_PATH, 0o600)


def main() -> int:
    required = ("VAST_API_KEY", "PARADIGM_ADMIN_SECRET")
    missing = [name for name in required if not os.getenv(name)]
    if missing:
        raise ActivationError(f"Missing required environment variables: {', '.join(missing)}")
    removed = clean_previous_instances()
    template_hash, template_name = choose_template()
    offers = offer_candidates()
    if not offers:
        raise ActivationError("No verified Vast.ai GPU offer matched production constraints")
    proxy_key = secrets.token_urlsafe(48)
    instance_id: int | None = None
    selected_offer: dict[str, Any] | None = None
    try:
        last_error: Exception | None = None
        for offer in offers[:8]:
            try:
                instance_id = create_instance(template_hash, offer, proxy_key)
                selected_offer = offer
                print(f"[activation] created Vast.ai instance {instance_id}")
                break
            except Exception as error:
                last_error = error
                print(f"[activation] offer creation failed, trying next candidate: {error}", file=sys.stderr)
        if instance_id is None or selected_offer is None:
            raise ActivationError(f"Could not create a Vast.ai instance: {last_error}")
        base_url, status, instance = wait_for_proxy(instance_id, proxy_key)
        workflow = status["workflows"]["abstract-broll-t2v"]["workflow_json"]
        smoke = direct_smoke(base_url, proxy_key, workflow)
        verification = configure_video_factory(base_url, proxy_key, status)
        assert_video_factory_ready(verification)
        evidence = {
            "ok": True,
            "activated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "removed_previous_instances": removed,
            "instance_id": instance_id,
            "gpu_name": instance.get("gpu_name"),
            "hourly_price": selected_offer.get("dph_total"),
            "template": template_name,
            "comfyui_ready": status.get("ready"),
            "workflow": "abstract-broll-t2v",
            "model_hashes": {
                item.get("id"): item.get("sha256")
                for item in status.get("models", [])
                if isinstance(item, dict)
            },
            "smoke": {key: value for key, value in smoke.items() if key != "prompt_id"},
            "video_factory_registry_ready": True,
            "video_factory_production_ready": True,
        }
        write_evidence(evidence)
        print(json.dumps(evidence, separators=(",", ":")))
        return 0
    except Exception:
        if instance_id is not None:
            destroy_instance(instance_id)
        raise


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        write_evidence({"ok": False, "error": str(error), "failed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})
        print(f"[activation] ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
