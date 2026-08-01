from __future__ import annotations

import json
import logging
import uuid
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query

from .console_api import require_console_api_key
from .engine_profile_service import engine_catalog_payload
from .settings import Settings

router = APIRouter(tags=["engine-profiles"])
logger = logging.getLogger(__name__)


@router.get("/v1/engine-profiles", dependencies=[Depends(require_console_api_key)])
def engine_profiles() -> dict[str, object]:
    settings = Settings.from_env()
    payload = engine_catalog_payload(settings)
    if payload["ok"] is not True:
        raise HTTPException(
            status_code=503,
            detail=str(payload.get("error") or "Engine catalog unavailable"),
        )
    return payload


@router.get("/v1/engine-events", dependencies=[Depends(require_console_api_key)])
def engine_events(
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> dict[str, object]:
    settings = Settings.from_env()
    root = settings.workspace / "events"
    if not root.is_dir():
        return {"ok": True, "events": []}
    events: list[dict[str, object]] = []
    for path in sorted(
        root.glob("*.json"),
        key=lambda item: item.stat().st_mtime,
        reverse=True,
    ):
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            logger.warning("Skipping unreadable engine event %s: %s", path, error)
            continue
        if not isinstance(payload, dict):
            continue
        event_type = str(payload.get("event_type") or "")
        if not event_type.startswith("profile_"):
            continue
        events.append(payload)
        if len(events) >= limit:
            break
    return {"ok": True, "events": events}


@router.get(
    "/v1/engine-worker/status",
    dependencies=[Depends(require_console_api_key)],
)
async def engine_worker_status() -> dict[str, object]:
    settings = Settings.from_env()
    configured = bool(settings.oss_worker_base_url and settings.oss_worker_api_key)
    if not configured:
        return {
            "ok": True,
            "configured": False,
            "reachable": False,
            "state": "not_configured",
            "profiles": [],
        }
    assert settings.oss_worker_base_url is not None
    assert settings.oss_worker_api_key is not None
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{settings.oss_worker_base_url}/v1/health",
                headers={
                    "Authorization": f"Bearer {settings.oss_worker_api_key}",
                    "X-API-Key": settings.oss_worker_api_key,
                },
            )
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError) as error:
        logger.warning("Managed OSS worker is not reachable: %s", error)
        return {
            "ok": True,
            "configured": True,
            "reachable": False,
            "state": "gpu_stopped_or_worker_unavailable",
            "profiles": [],
        }
    if not isinstance(payload, dict) or payload.get("ok") is not True:
        raise HTTPException(status_code=502, detail="Managed OSS worker returned invalid health")
    profiles = payload.get("profiles")
    return {
        "ok": True,
        "configured": True,
        "reachable": True,
        "state": "ready",
        "protocol_version": payload.get("protocol_version"),
        "profiles": profiles if isinstance(profiles, list) else [],
    }


@router.post(
    "/v1/engine-profiles/sync",
    dependencies=[Depends(require_console_api_key)],
)
async def sync_engine_profiles() -> dict[str, object]:
    settings = Settings.from_env()
    payload = engine_catalog_payload(settings)
    if payload["ok"] is not True:
        raise HTTPException(
            status_code=503,
            detail=str(payload.get("error") or "Engine catalog unavailable"),
        )
    if not settings.operator_event_url or not settings.api_key:
        raise HTTPException(
            status_code=503,
            detail="Engine catalog sync endpoint or internal API key is not configured",
        )
    sync_url = settings.operator_event_url.rsplit("/", 1)[0] + "/engine-profiles"
    request_payload = {key: value for key, value in payload.items() if key != "ok"}
    request_payload["event_id"] = str(uuid.uuid4())
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                sync_url,
                headers={"X-API-Key": settings.api_key},
                json=request_payload,
            )
            response.raise_for_status()
            body = response.json()
    except (httpx.HTTPError, ValueError) as error:
        raise HTTPException(
            status_code=502,
            detail=f"Engine catalog DB sync failed: {error}",
        ) from error
    if not isinstance(body, dict) or body.get("ok") is not True:
        raise HTTPException(
            status_code=502,
            detail="Engine catalog DB sync did not confirm persistence and notifications",
        )
    return {"ok": True, "synced": body.get("synced", 0)}
