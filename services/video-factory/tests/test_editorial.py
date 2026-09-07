from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from video_factory.models import ClientBrief
from video_factory.planner import deterministic_plan
from video_factory.validation import validate_brief
from video_factory.web import app


def editorial_brief(example: ClientBrief, seconds: int = 600) -> ClientBrief:
    payload = example.model_dump(mode="json")
    payload.update(duration_seconds=seconds, deliverables=[payload["deliverables"][0]],
                   languages=[payload["deliverables"][0]["language"]], localizations={})
    payload["chapters"] = [{"id": "chapter-01", "title": "First chapter", "shots": [
        {"title": f"Scene {index}", "kind": "text_motion", "duration_seconds": 10,
         "visual_direction": f"Unique visual explanation for scene {index}",
         "headline": f"Scene {index}", "narration": f"Narration {index}"}
        for index in range(seconds // 10)
    ]}]
    return ClientBrief.model_validate(payload)


@pytest.mark.parametrize("seconds", [60, 600, 1800])
def test_authored_longform_has_distinct_bounded_shots(example_brief: ClientBrief, seconds: int) -> None:
    brief = editorial_brief(example_brief, seconds)
    manifest = deterministic_plan(brief)
    assert len(manifest.shots) == seconds // 10
    assert max(shot.duration_seconds for shot in manifest.shots) == 10
    assert len({shot.metadata["prompt"] for shot in manifest.shots}) == seconds // 10
    assert manifest.shots[-1].metadata["timeline_end_seconds"] == seconds
    assert manifest.metadata["chapters"][0]["end_seconds"] == seconds


def test_mismatched_duration_and_duplicate_chapters_rejected(example_brief: ClientBrief) -> None:
    payload = editorial_brief(example_brief, 60).model_dump(mode="json")
    payload["duration_seconds"] = 61
    with pytest.raises(ValidationError, match="合計尺"):
        ClientBrief.model_validate(payload)
    payload["duration_seconds"] = 120
    payload["chapters"] *= 2
    with pytest.raises(ValidationError, match="章ID"):
        ClientBrief.model_validate(payload)


def test_chapter_kind_cannot_bypass_consent(example_brief: ClientBrief) -> None:
    payload = editorial_brief(example_brief, 60).model_dump(mode="json")
    payload["chapters"][0]["shots"][0]["kind"] = "lip_sync"
    payload["requested_shot_kinds"] = []
    payload["rights"]["voice_consent"] = "not_granted"
    report = validate_brief(ClientBrief.model_validate(payload))
    assert not report.valid
    assert any(f.code == "voice-consent-required" for f in report.findings)


def test_editorial_plan_auth_api_and_gui(example_brief: ClientBrief, monkeypatch: pytest.MonkeyPatch,
                                       tmp_path: Path) -> None:
    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(tmp_path))
    monkeypatch.setenv("VIDEO_FACTORY_API_KEY", "editorial-test")
    client = TestClient(app)
    payload = editorial_brief(example_brief).model_dump(mode="json")
    assert client.post("/v1/briefs/plan", json=payload).status_code == 401
    response = client.post("/v1/briefs/plan", json=payload, headers={"X-Api-Key":"editorial-test"})
    assert response.status_code == 200
    assert len(response.json()["shots"]) == 60
    assert "editorial-chapters" in client.get("/console/").text
    assert client.get("/console/console-editorial.js").status_code == 200
    assert 'id="chapter-editor"' in client.get("/console/").text
    assert client.get("/console/console-chapter-editor.js").status_code == 200


def test_editorial_template_escapes_untrusted_copy(service_root: Path) -> None:
    from video_factory.adapters.hyperframes import HyperFramesAdapter
    adapter = HyperFramesAdapter(service_root / "templates/hyperframes")
    template = adapter.environment.get_template("editorial/index.html.j2")
    hostile = '<script>alert("not executable")</script>'
    rendered = template.render(language="ja", project_name="Sandbox", eyebrow="Test",
        composition_id="shot-001", width=1280, height=720, duration_seconds=5,
        chapter_title="導入", headline=hostile, body=hostile, visual_points=[hostile],
        brand={"name": "QA", "primary_color": "#182722", "text_color": "#F4EFE5",
               "accent_color": "#D8BB7C", "font_family": "Noto Sans JP"})
    assert "<script>" not in rendered
    assert "&lt;script&gt;" in rendered
    assert "data-no-timeline" in rendered
