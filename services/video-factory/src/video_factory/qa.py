from __future__ import annotations

from pathlib import Path

from .media import probe_media
from .models import DeliverableSpec, QaCheck, QaReport


def run_technical_qa(
    media_path: str | Path,
    expected: DeliverableSpec,
    expected_duration: float,
) -> QaReport:
    checks: list[QaCheck] = []
    try:
        probe = probe_media(media_path)
    except Exception as error:  # QA must return a report rather than hiding the failure.
        return QaReport(
            passed=False,
            probe=None,
            checks=[QaCheck(name="probe", passed=False, message=str(error))],
        )

    checks.extend(
        [
            QaCheck(
                name="width",
                passed=probe.width == expected.width,
                expected=str(expected.width),
                actual=str(probe.width),
            ),
            QaCheck(
                name="height",
                passed=probe.height == expected.height,
                expected=str(expected.height),
                actual=str(probe.height),
            ),
            QaCheck(
                name="fps",
                passed=abs(probe.fps - expected.fps) <= 0.1,
                expected=str(expected.fps),
                actual=f"{probe.fps:.3f}",
            ),
            QaCheck(
                name="duration",
                passed=abs(probe.duration_seconds - expected_duration)
                <= max(0.35, 1 / expected.fps),
                expected=f"{expected_duration:.3f}",
                actual=f"{probe.duration_seconds:.3f}",
            ),
            QaCheck(
                name="audio-stream",
                passed=probe.has_audio,
                expected="present",
                actual="present" if probe.has_audio else "missing",
            ),
            QaCheck(
                name="file-size",
                passed=Path(media_path).stat().st_size > 0,
                expected=">0",
                actual=str(Path(media_path).stat().st_size),
            ),
        ]
    )
    return QaReport(passed=all(check.passed for check in checks), probe=probe, checks=checks)
