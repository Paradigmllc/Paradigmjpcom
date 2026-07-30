#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import json
import os
import sys
from pathlib import Path
from typing import Any

WORKSPACE = Path(os.getenv("VIDEO_FACTORY_WORKSPACE", "/data/video-factory"))
RUNTIME_PATH = WORKSPACE / "config" / "runtime.json"
ACTIVATOR_PATH = Path(os.getenv("VIDEO_FACTORY_ACTIVATOR_PATH", "/tmp/activate_vast_runtime_v2.py"))
INTERNAL_ORIGIN = os.getenv("VIDEO_FACTORY_INTERNAL_ORIGIN", "http://127.0.0.1:8080").rstrip("/")


def load_runtime_key() -> str:
    try:
        payload = json.loads(RUNTIME_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError(f"Could not read persisted Video Factory runtime: {error}") from error
    key = str(payload.get("vast_api_key") or "").strip()
    if not key:
        raise RuntimeError("The persisted Video Factory runtime does not contain a Vast.ai API key")
    return key


def load_activator():
    if not ACTIVATOR_PATH.is_file():
        raise RuntimeError(f"Activation module is missing: {ACTIVATOR_PATH}")
    spec = importlib.util.spec_from_file_location("paradigm_vast_activator", ACTIVATOR_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("Could not load the Vast activation module")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def main() -> int:
    key = load_runtime_key()
    internal_key = (
        os.getenv("VIDEO_FACTORY_API_KEY")
        or os.getenv("VIDEO_FACTORY_INTERNAL_API_KEY")
        or os.getenv("ADMIN_SCRIPT_SECRET")
        or os.getenv("ADMIN_PASSWORD")
        or ""
    ).strip()
    if not internal_key:
        raise RuntimeError("Video Factory internal API key is unavailable inside the production container")

    os.environ["VAST_API_KEY"] = key
    os.environ.setdefault("PARADIGM_ADMIN_SECRET", "internal-api-mode-not-used")
    os.environ.setdefault(
        "VAST_ACTIVATION_EVIDENCE",
        str(WORKSPACE / "config" / "vast-activation-evidence.json"),
    )
    module = load_activator()

    def internal_paradigm_request(
        method: str,
        path: str,
        *,
        payload: Any | None = None,
        timeout: float = 120,
    ) -> Any:
        result = module.request(
            method,
            f"{INTERNAL_ORIGIN}{path}",
            headers={"X-API-Key": internal_key},
            payload=payload,
            timeout=timeout,
        )
        return result.json()

    module.paradigm_request = internal_paradigm_request
    return int(module.main())


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"[runtime-activation] ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
