from __future__ import annotations

import subprocess
from collections.abc import Sequence
from pathlib import Path


class CommandError(RuntimeError):
    pass


def run_command(
    command: Sequence[str],
    *,
    cwd: str | Path | None = None,
    timeout: int = 1800,
    environment: dict[str, str] | None = None,
) -> subprocess.CompletedProcess[str]:
    completed = subprocess.run(
        list(command),
        cwd=str(cwd) if cwd else None,
        check=False,
        capture_output=True,
        text=True,
        timeout=timeout,
        env=environment,
    )
    if completed.returncode != 0:
        raise CommandError(
            f"Command failed ({completed.returncode}): {' '.join(command)}\n"
            f"stdout:\n{completed.stdout[-3000:]}\n"
            f"stderr:\n{completed.stderr[-3000:]}"
        )
    return completed
