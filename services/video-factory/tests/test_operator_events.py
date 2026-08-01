from __future__ import annotations

import json
import stat
from pathlib import Path
from typing import Any

import httpx
import pytest

import video_factory.operator_events as operator_events
from video_factory.gpu_lifecycle import run_lifecycle
from video_factory.operator_events import emit_operator_event
from video_factory.settings import Settings


class _FakeAsyncClient:
    def __init__(self, response_payload: dict[str, Any], **_kwargs: object) -> None:
        self.response_payload = response_payload

    async def __aenter__(self) -> _FakeAsyncClient:
        return self

    async def __aexit__(self, *_args: object) -> None:
        return None

    async def post(self, url: str, **_kwargs: object) -> httpx.Response:
        return httpx.Response(
            200,
            json=self.response_payload,
            request=httpx.Request("POST", url),
        )


@pytest.mark.parametrize(
    ("response_payload", "expected_state"),
    [({"ok": True}, "delivered"), ({"ok": False}, "failed")],
)
def test_operator_event_is_persisted_and_requires_both_channels(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    response_payload: dict[str, Any],
    expected_state: str,
) -> None:
    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(tmp_path / "workspace"))
    monkeypatch.setenv("VIDEO_FACTORY_API_KEY", "factory-secret")
    monkeypatch.setenv("VIDEO_FACTORY_OPERATOR_EVENT_URL", "https://events.example.test")
    monkeypatch.setattr(
        operator_events.httpx,
        "AsyncClient",
        lambda **kwargs: _FakeAsyncClient(response_payload, **kwargs),
    )
    settings = Settings.from_env()

    event = run_lifecycle(
        emit_operator_event(
            settings,
            event_type="gpu_stopped",
            title="GPU stopped",
            message="No active production remains.",
            instance_id=46258780,
        )
    )

    path = settings.workspace / "events" / f"{event.event_id}.json"
    stored = json.loads(path.read_text(encoding="utf-8"))
    assert stored["delivery_state"] == expected_state
    assert stat.S_IMODE(path.stat().st_mode) == 0o600
