from __future__ import annotations

import json
import os
import uuid
from dataclasses import asdict, dataclass, replace
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx

from .settings import Settings


@dataclass(frozen=True)
class OperatorEvent:
    event_id: str
    event_type: str
    title: str
    message: str
    created_at: str
    instance_id: int | None = None
    run_id: str | None = None
    hourly_price: float | None = None
    profile_id: str | None = None
    project_id: str | None = None
    state: str | None = None
    progress: int | None = None
    error_message: str | None = None
    delivery_state: str = "pending"
    delivered_at: str | None = None
    delivery_error: str | None = None


def _events_root(settings: Settings) -> Path:
    root = settings.workspace / "events"
    root.mkdir(parents=True, exist_ok=True)
    return root


def _event_path(settings: Settings, event_id: str) -> Path:
    return _events_root(settings) / f"{event_id}.json"


def _write_event(settings: Settings, event: OperatorEvent) -> None:
    path = _event_path(settings, event.event_id)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(
        json.dumps(asdict(event), indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    os.chmod(temporary, 0o600)
    temporary.replace(path)
    os.chmod(path, 0o600)


async def emit_operator_event(
    settings: Settings,
    *,
    event_type: str,
    title: str,
    message: str,
    instance_id: int | None = None,
    run_id: str | None = None,
    hourly_price: float | None = None,
    profile_id: str | None = None,
    project_id: str | None = None,
    state: str | None = None,
    progress: int | None = None,
    error_message: str | None = None,
) -> OperatorEvent:
    event = OperatorEvent(
        event_id=str(uuid.uuid4()),
        event_type=event_type,
        title=title,
        message=message,
        created_at=datetime.now(UTC).isoformat(),
        instance_id=instance_id,
        run_id=run_id,
        hourly_price=hourly_price,
        profile_id=profile_id,
        project_id=project_id,
        state=state,
        progress=progress,
        error_message=error_message,
    )
    _write_event(settings, event)
    if not settings.operator_event_url:
        skipped = replace(
            event,
            delivery_state="disabled",
            delivery_error="VIDEO_FACTORY_OPERATOR_EVENT_URL is not configured",
        )
        _write_event(settings, skipped)
        return skipped
    if not settings.api_key:
        failed = replace(
            event,
            delivery_state="failed",
            delivery_error="VIDEO_FACTORY_API_KEY is not configured",
        )
        _write_event(settings, failed)
        return failed

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                settings.operator_event_url,
                headers={"X-API-Key": settings.api_key},
                json={
                    "event_id": event.event_id,
                    "event_type": event.event_type,
                    "title": event.title,
                    "message": event.message,
                    "created_at": event.created_at,
                    "instance_id": event.instance_id,
                    "run_id": event.run_id,
                    "hourly_price": event.hourly_price,
                    "profile_id": event.profile_id,
                    "project_id": event.project_id,
                    "state": event.state,
                    "progress": event.progress,
                    "error_message": event.error_message,
                },
            )
            response.raise_for_status()
            payload: Any = response.json()
        if not isinstance(payload, dict) or payload.get("ok") is not True:
            raise ValueError("Operator event endpoint did not confirm both channels")
        delivered = replace(
            event,
            delivery_state="delivered",
            delivered_at=datetime.now(UTC).isoformat(),
        )
        _write_event(settings, delivered)
        return delivered
    except (httpx.HTTPError, OSError, ValueError) as error:
        failed = replace(
            event,
            delivery_state="failed",
            delivery_error=str(error),
        )
        _write_event(settings, failed)
        return failed
