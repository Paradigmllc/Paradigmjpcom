"""Source timing checks only; never a claim about creative or audible quality."""
from html.parser import HTMLParser
from pathlib import Path

import pytest


class Elements(HTMLParser):
    def __init__(self, html: str) -> None:
        super().__init__()
        self.elements: list[tuple[str, dict[str, str]]] = []
        self.feed(html)

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.elements.append((tag, {key: value for key, value in attrs if value is not None}))


@pytest.mark.parametrize("project,seconds", [("city-rain-short", 32), ("groundwater-short", 34.5)])
def test_short_source_preserves_portrait_audio_and_caption_windows(project: str, seconds: float) -> None:
    root = Path(__file__).resolve().parents[1] / "examples/educational-shorts-ja" / project
    elements = Elements((root / "index.html").read_text()).elements
    composition = next(attrs for _, attrs in elements if attrs.get("data-composition-id") == "main")
    assert (composition["data-width"], composition["data-height"]) == ("1080", "1920")
    assert float(composition["data-duration"]) == seconds
    ids = [attrs["id"] for _, attrs in elements if "id" in attrs]
    assert len(ids) == len(set(ids))
    audio = [attrs for tag, attrs in elements if tag == "audio"]
    captions = [attrs for tag, attrs in elements if tag == "p" and "caption" in attrs.get("class", "")]
    assert len(audio) == len(captions) == 6
    previous_end = 0.0
    for voice, caption in zip(audio, captions, strict=True):
        start, duration = float(voice["data-start"]), float(voice["data-duration"])
        assert start >= previous_end
        assert 0 < duration <= 10
        assert start + duration <= seconds
        assert float(caption["data-start"]) == start
        assert float(caption["data-duration"]) >= duration
        assert voice["src"].startswith("assets/audio/") and voice["src"].endswith(".wav")
        assert ".." not in Path(voice["src"]).parts
        previous_end = start + duration
    assert not any(tag == "video" for tag, _ in elements)  # no repeated source-video padding
