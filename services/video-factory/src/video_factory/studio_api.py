from __future__ import annotations

import uuid
from datetime import UTC, datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from .console_api import require_console_api_key
from .creative_templates import creative_template, template_catalog_payload
from .gpu_lifecycle import run_lifecycle
from .io import write_json, write_model
from .local_jobs import submit_local_job
from .models import ClientBrief, PipelineResult, ProjectStatus, Shot, ShotManifest
from .operator_events import emit_operator_event
from .pipeline import production_flow
from .settings import Settings
from .state import load_project_state, transition_project_state
from .studio_readiness import build_studio_readiness, preflight_studio_brief
from .workspace import ProjectWorkspace

router = APIRouter()


class ShotRevisionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    language: str = Field(default="ja", pattern=r"^[a-z]{2}(?:-[A-Z]{2})?$")
    headline: str | None = Field(default=None, max_length=500)
    body: str | None = Field(default=None, max_length=2000)
    template_id: str | None = Field(
        default=None,
        pattern=r"^[a-z0-9][a-z0-9-]{2,79}$",
    )
    reviewer: str = Field(min_length=2, max_length=200)


class RerenderRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    shot_ids: list[str] = Field(min_length=1, max_length=50)
    dry_run: bool | None = None


def _workspace(settings: Settings, project_id: str) -> ProjectWorkspace:
    try:
        workspace = ProjectWorkspace.create(settings.workspace, project_id)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    if not (workspace.root / "state.json").is_file():
        raise HTTPException(status_code=404, detail="Project not found")
    return workspace


def _manifest(workspace: ProjectWorkspace) -> ShotManifest:
    try:
        return ShotManifest.model_validate_json(
            (workspace.root / "shot-manifest.json").read_text(encoding="utf-8")
        )
    except (OSError, ValueError) as error:
        raise HTTPException(status_code=422, detail=f"Project manifest is invalid: {error}") from error


def _replace_shot(shots: list[Shot], shot_id: str, updates: dict[str, object]) -> list[Shot]:
    found = False
    revised: list[Shot] = []
    for shot in shots:
        if shot.id == shot_id:
            found = True
            revised.append(shot.model_copy(deep=True, update=updates))
        else:
            revised.append(shot)
    if not found:
        raise HTTPException(status_code=404, detail="Shot not found")
    return revised


def _editable_project_status(workspace: ProjectWorkspace) -> ProjectStatus:
    state_path = workspace.root / "state.json"
    state = load_project_state(state_path)
    editable_states = {
        "production",
        "qa_failed",
        "draft_review_required",
        "draft_approved",
        "failed",
    }
    if state.status not in editable_states:
        raise HTTPException(
            status_code=409,
            detail=f"Storyboard cannot be edited while project status is {state.status}",
        )
    return state.status


def _return_to_production(
    workspace: ProjectWorkspace,
    *,
    expected: ProjectStatus,
) -> None:
    state_path = workspace.root / "state.json"
    transition_project_state(
        state_path,
        "production",
        expected=expected,
        last_revision_at=datetime.now(UTC).isoformat(),
    )


@router.get("/v1/studio/templates", dependencies=[Depends(require_console_api_key)])
def list_creative_templates() -> dict[str, object]:
    return {"ok": True, "templates": template_catalog_payload()}


@router.get("/v1/studio/readiness", dependencies=[Depends(require_console_api_key)])
def studio_readiness() -> dict[str, object]:
    snapshot = build_studio_readiness(Settings.from_env())
    return {"ok": True, **snapshot.model_dump(mode="json")}


@router.post("/v1/studio/preflight", dependencies=[Depends(require_console_api_key)])
def studio_preflight(brief: ClientBrief) -> dict[str, object]:
    result = preflight_studio_brief(brief, Settings.from_env())
    return {"ok": True, **result.model_dump(mode="json")}


@router.post(
    "/v1/studio/readiness/sync",
    dependencies=[Depends(require_console_api_key)],
)
async def sync_studio_readiness() -> dict[str, object]:
    settings = Settings.from_env()
    if not settings.operator_event_url or not settings.api_key:
        raise HTTPException(
            status_code=503,
            detail="Studio readiness sync endpoint or internal API key is not configured",
        )
    snapshot = build_studio_readiness(settings)
    sync_url = settings.operator_event_url.rsplit("/", 1)[0] + "/studio-readiness"
    payload = snapshot.model_dump(mode="json")
    payload["event_id"] = str(uuid.uuid4())
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                sync_url,
                headers={"X-API-Key": settings.api_key},
                json=payload,
            )
            response.raise_for_status()
            body = response.json()
    except (httpx.HTTPError, ValueError) as error:
        raise HTTPException(
            status_code=502,
            detail=f"Studio readiness DB sync failed: {error}",
        ) from error
    if not isinstance(body, dict) or body.get("ok") is not True:
        raise HTTPException(
            status_code=502,
            detail="Studio readiness DB sync did not confirm persistence and notifications",
        )
    return {"ok": True, "snapshot_id": body.get("snapshot_id")}


@router.patch(
    "/v1/projects/{project_id}/shots/{shot_id}",
    dependencies=[Depends(require_console_api_key)],
)
def revise_project_shot(
    project_id: str,
    shot_id: str,
    request: ShotRevisionRequest,
) -> dict[str, object]:
    settings = Settings.from_env()
    workspace = _workspace(settings, project_id)
    editable_status = _editable_project_status(workspace)
    manifest = _manifest(workspace)
    updates = request.model_dump(exclude_none=True, exclude={"language", "reviewer"})
    if not updates:
        raise HTTPException(status_code=422, detail="At least one shot field must be changed")
    if request.template_id:
        try:
            selected_template = creative_template(request.template_id)
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
        updates["template_id"] = selected_template.id

    language = request.language.split("-")[0]
    primary_language = manifest.primary_deliverable.language.split("-")[0]
    manifest_updates: dict[str, object]
    if language == primary_language:
        manifest_updates = {"shots": _replace_shot(manifest.shots, shot_id, updates)}
    else:
        localized_key = next(
            (key for key in manifest.localized_shots if key.split("-")[0] == language),
            None,
        )
        if localized_key is None:
            raise HTTPException(status_code=404, detail="Localized storyboard not found")
        localized = dict(manifest.localized_shots)
        localized[localized_key] = _replace_shot(localized[localized_key], shot_id, updates)
        manifest_updates = {"localized_shots": localized}
    revised_manifest = manifest.model_copy(deep=True, update=manifest_updates)
    write_model(workspace.root / "shot-manifest.json", revised_manifest)
    _return_to_production(workspace, expected=editable_status)

    revisions_root = workspace.root / "revisions"
    revisions_root.mkdir(parents=True, exist_ok=True)
    revision_number = len(list(revisions_root.glob("*.json"))) + 1
    revision_id = str(uuid.uuid4())
    revision = {
        "id": revision_id,
        "project_id": project_id,
        "shot_id": shot_id,
        "language": request.language,
        "revision": revision_number,
        "patch": updates,
        "reviewer": request.reviewer,
        "created_at": datetime.now(UTC).isoformat(),
    }
    write_json(revisions_root / f"{revision_number:04d}-{revision_id}.json", revision)
    run_lifecycle(
        emit_operator_event(
            settings,
            event_type="studio_revision_created",
            title="Storyboardを更新",
            message=f"{project_id} / {shot_id} の修正版を保存しました。",
            project_id=project_id,
            state="revision_saved",
            progress=5,
            payload=revision,
        )
    )
    return {
        "ok": True,
        "revision": revision,
        "shot": next(
            shot.model_dump(mode="json")
            for shot in revised_manifest.shots_for_language(request.language)
            if shot.id == shot_id
        ),
    }


@router.post(
    "/v1/projects/{project_id}/rerender",
    dependencies=[Depends(require_console_api_key)],
)
def rerender_project(project_id: str, request: RerenderRequest) -> dict[str, object]:
    settings = Settings.from_env()
    workspace = _workspace(settings, project_id)
    _editable_project_status(workspace)
    manifest = _manifest(workspace)
    known_shots = {shot.id for shot in manifest.shots}
    unknown = sorted(set(request.shot_ids) - known_shots)
    if unknown:
        raise HTTPException(status_code=422, detail=f"Unknown shot IDs: {', '.join(unknown)}")
    state = load_project_state(workspace.root / "state.json")
    state_payload = state.model_dump(mode="json")
    dry_run = bool(state_payload.get("dry_run")) if request.dry_run is None else request.dry_run
    brief_path = workspace.root / "brief.json"
    manifest_path = workspace.root / "shot-manifest.json"
    if not brief_path.is_file():
        raise HTTPException(status_code=422, detail="Persisted project brief is missing")

    if dry_run:
        result: PipelineResult = production_flow(
            brief_path=str(brief_path),
            dry_run=True,
            manifest_path=str(manifest_path),
            rerender_shot_ids=request.shot_ids,
        )
        return {"ok": True, "accepted": False, "result": result.model_dump(mode="json")}

    job = submit_local_job(
        settings,
        brief_path=brief_path,
        dry_run=False,
        planner_provider="deterministic",
        auto_approve=False,
        delivery_target="local",
        manifest_path=manifest_path,
        rerender_shot_ids=request.shot_ids,
    )
    return {"ok": True, "accepted": True, "run_id": job.run_id, "backend": "local"}
