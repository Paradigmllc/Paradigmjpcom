from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .io import write_model
from .models import ProjectState, ProjectStatus

_ALLOWED_TRANSITIONS: dict[ProjectStatus, set[ProjectStatus]] = {
    "production": {"qa_failed", "draft_review_required", "failed"},
    "qa_failed": {"production", "failed"},
    "draft_review_required": {"draft_approved", "production", "failed"},
    "draft_approved": {"finalizing", "production", "failed"},
    "finalizing": {"final_review_required", "qa_failed", "failed"},
    "final_review_required": {"final_approved", "finalizing", "failed"},
    "final_approved": {"delivered", "finalizing", "failed"},
    "delivered": set(),
    "failed": {"production"},
}


def _now() -> str:
    return datetime.now(UTC).isoformat()


def load_project_state(path: str | Path) -> ProjectState:
    source = Path(path)
    return ProjectState.model_validate_json(source.read_text(encoding="utf-8"))


def initialize_project_state(
    path: str | Path,
    project_id: str,
    **fields: Any,
) -> ProjectState:
    state = ProjectState(
        project_id=project_id,
        status="production",
        updated_at=_now(),
        **fields,
    )
    write_model(path, state)
    return state


def transition_project_state(
    path: str | Path,
    target: ProjectStatus,
    *,
    expected: ProjectStatus | set[ProjectStatus] | tuple[ProjectStatus, ...] | None = None,
    **fields: Any,
) -> ProjectState:
    source = Path(path)
    current = load_project_state(source)
    expected_values = (
        {expected}
        if isinstance(expected, str)
        else set(expected or ())
    )
    if expected_values and current.status not in expected_values:
        raise ValueError(
            f"Project state must be one of {sorted(expected_values)}, got {current.status}"
        )
    allowed = _ALLOWED_TRANSITIONS.get(current.status, set())
    if target != current.status and target not in allowed:
        raise ValueError(f"Invalid project state transition: {current.status} -> {target}")
    update = {
        "status": target,
        "updated_at": _now(),
        **fields,
    }
    state = current.model_copy(update=update)
    write_model(source, state)
    return state


def replace_project_state(
    path: str | Path,
    project_id: str,
    status: ProjectStatus,
    **fields: Any,
) -> ProjectState:
    state = ProjectState(
        project_id=project_id,
        status=status,
        updated_at=_now(),
        **fields,
    )
    write_model(path, state)
    return state
