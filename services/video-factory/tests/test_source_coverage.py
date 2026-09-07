from pathlib import Path
from subprocess import CompletedProcess
from unittest.mock import patch

import pytest

from video_factory.models import MediaProbe
from video_factory.source_coverage import probe_motion_source, require_motion_coverage


def probe(duration: float, fps: float = 24) -> MediaProbe:
    return MediaProbe(path="fixture.mp4", duration_seconds=duration, width=640,
                      height=360, fps=fps, has_audio=False)


@pytest.mark.parametrize("requested", [3.33, 5, 30, 96])
def test_short_native_clip_cannot_be_frozen_into_long_shot(requested: float) -> None:
    with pytest.raises(ValueError, match="末尾静止やループ"):
        require_motion_coverage(probe(49 / 24), requested, 24)


@pytest.mark.parametrize("actual", [5, 5 - 1 / 24, 6])
def test_exact_trimmed_or_single_frame_rounding_is_allowed(actual: float) -> None:
    require_motion_coverage(probe(actual), 5, 24)


@pytest.mark.parametrize("actual", [0, -1, float("nan"), float("inf")])
def test_unknown_or_invalid_native_duration_is_rejected(actual: float) -> None:
    with pytest.raises(ValueError, match="動画尺"):
        require_motion_coverage(probe(actual), 5, 24)


def test_more_than_one_missing_frame_is_rejected() -> None:
    with pytest.raises(ValueError):
        require_motion_coverage(probe(5 - 2 / 24), 5, 24)


def test_long_audio_cannot_conceal_short_video() -> None:
    module = "video_factory.source_coverage"
    with (
        patch(f"{module}.probe_media", return_value=probe(30)),
        patch(f"{module}.shutil.which", return_value="/fixture/ffprobe"),
        patch(f"{module}.run_command", return_value=CompletedProcess(
            [], 0, stdout='{"streams":[{"duration":"2.041667"}]}', stderr="",
        )),
    ):
        native = probe_motion_source(Path("fixture.mp4"))
    with pytest.raises(ValueError, match="素材"):
        require_motion_coverage(native, 30, 24)
