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
from .job_inputs import submission_guard
from .local_jobs import require_project_idle, submit_local_job
from .models import ClientBrief, PipelineResult, ProjectStatus, ShotManifest
from .operator_events import emit_operator_event
from .pipeline import production_flow
from .settings import Settings
from .shot_revision import ShotRevisionRequest, replace_shot
from .state import load_project_state, transition_project_state
from .studio_readiness import build_studio_readiness, preflight_studio_brief
from .workspace import ProjectWorkspace

router = APIRouter()


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
    with submission_guard(settings):
        try:
            require_project_idle(settings, project_id)
        except ValueError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        return _save_revision(settings, project_id, shot_id, request)


def _save_revision(
    settings: Settings, project_id: str, shot_id: str, request: ShotRevisionRequest,
) -> dict[str, object]:
    workspace = _workspace(settings, project_id)
    editable_status = _editable_project_status(workspace)
    manifest = _manifest(workspace)
    updates = request.model_dump(exclude_none=True, exclude={"language", "reviewer"})
    if not updates:
        raise HTTPException(status_code=422, detail="At least one shot field must be changed")
    if "narration" in updates or "narration_path" in updates:
        if manifest.metadata.get("planning_mode") != "authored_chapters":
            raise HTTPException(status_code=422, detail="音声修正には章台本のプロジェクトが必要です。")
        if (manifest.audio.narration_path and manifest.audio.narration_path !=
                manifest.metadata.get("editorial_narration_path")):
            raise HTTPException(status_code=422, detail="全編音源を使用中です。台本側で全編音源を差し替えてください。")
    if request.template_id:
        try:
            selected_template = creative_template(request.template_id)
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
        updates["template_id"] = selected_template.id

    language = request.language.split("-")[0]
    primary_language = manifest.primary_deliverable.language.split("-")[0]
    if language != primary_language and ("narration" in updates or "narration_path" in updates):
        raise HTTPException(status_code=422, detail="言語別音声の再構成は未対応です。主言語の章台本を修正してください。")
    manifest_updates: dict[str, object]
    if language == primary_language:
        manifest_updates = {"shots": replace_shot(manifest.shots, shot_id, updates)}
    else:
        localized_key = next(
            (key for key in manifest.localized_shots if key.split("-")[0] == language),
            None,
        )
        if localized_key is None:
            raise HTTPException(status_code=404, detail="Localized storyboard not found")
        localized = dict(manifest.localized_shots)
        localized[localized_key] = replace_shot(localized[localized_key], shot_id, updates)
        manifest_updates = {"localized_shots": localized}
    revised_manifest = ShotManifest.model_validate({**manifest.model_dump(), **manifest_updates})
    revised_shot = next(shot for shot in revised_manifest.shots_for_language(request.language)
                        if shot.id == shot_id)
    if "narration" in updates and revised_shot.metadata.get("narration_path") is None:
        updates["narration_path"] = None
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
        "shot": revised_shot.model_dump(mode="json"),
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

    try:
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
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    return {"ok": True, "accepted": True, "run_id": job.run_id, "backend": "local"}
