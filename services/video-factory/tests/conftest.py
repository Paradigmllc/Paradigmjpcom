from pathlib import Path

import pytest

from video_factory.io import load_brief
from video_factory.models import ClientBrief
from video_factory.settings import Settings


@pytest.fixture(scope="session")
def service_root() -> Path:
    return Path(__file__).resolve().parents[1]


@pytest.fixture(scope="session")
def example_brief_path(service_root: Path) -> Path:
    return service_root / "examples" / "briefs" / "saas-launch.yaml"


@pytest.fixture(scope="session")
def example_brief(example_brief_path: Path) -> ClientBrief:
    return load_brief(example_brief_path)


@pytest.fixture
def settings(monkeypatch: pytest.MonkeyPatch, tmp_path: Path, service_root: Path) -> Settings:
    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(tmp_path / "workspace"))
    monkeypatch.setenv(
        "PLAYWRIGHT_CAPTURE_SCRIPT",
        str(service_root / "tools" / "playwright-capture" / "capture.mjs"),
    )
    monkeypatch.setenv(
        "COMFYUI_WORKFLOW_ROOT", str(service_root / "workflows" / "comfyui")
    )
    return Settings.from_env()
