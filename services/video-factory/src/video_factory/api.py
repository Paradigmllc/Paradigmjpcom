from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Annotated, Any

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel

from .delivery import deliver_project
from .doctor import doctor_report
from .finalization import finalize_project
from .io import write_model
from .models import (
    ClientBrief,
    PipelineResult,
    ReviewStage,
    ShotManifest,
    ValidationReport,
)
from .pipeline import production_flow
from .planner import plan_brief
from .review import approve_review, request_changes
from .settings import Settings
from .state import load_project_state, transition_project_state
from .validation import validate_brief
from .workspace import ProjectWorkspace, slugify

app = FastAPI(
    title="Paradigm Video Factory",
    version="0.1.0",
    description="Validated, multi-engine video-production orchestration.",
)


class RunRequest(BaseModel):
    brief: ClientBrief
    dry_run: bool = False
    planner_provider: str = "deterministic"
    auto_approve: bool = False
    delivery_target: str = "local"


class ReviewRequest(BaseModel):
    reviewer: str
    notes: str | None = None


class DeliveryRequest(BaseModel):
    target: str = "local"


def require_api_key(x_api_key: Annotated[str | None, Header()] = None) -> None:
    configured = Settings.from_env().api_key
    if configured and x_api_key != configured:
        raise HTTPException(status_code=401, detail="Invalid API key")


def _validated_brief(request: RunRequest) -> ValidationReport:
    report = validate_brief(request.brief)
    if not report.valid:
        raise HTTPException(status_code=422, detail=report.model_dump(mode="json"))
    return report


def _persist_inbox_brief(brief: ClientBrief, settings: Settings) -> Path:
    inbox = settings.workspace / "inbox"
    inbox.mkdir(parents=True, exist_ok=True)
    path = inbox / f"{slugify(brief.project_name)}-{uuid.uuid4().hex}.json"
    return write_model(path, brief)


@app.get("/health")
def health() -> dict[str, object]:
    return {"status": "ok", "doctor": doctor_report(Settings.from_env())}


@app.post("/v1/briefs/validate", dependencies=[Depends(require_api_key)])
def validate_endpoint(brief: ClientBrief) -> ValidationReport:
    return validate_brief(brief)


@app.post("/v1/briefs/plan", dependencies=[Depends(require_api_key)])
def plan_endpoint(brief: ClientBrief) -> ShotManifest:
    report = validate_brief(brief)
    if not report.valid:
        raise HTTPException(status_code=422, detail=report.model_dump(mode="json"))
    return plan_brief(brief, Settings.from_env())


@app.post("/v1/runs/sync", dependencies=[Depends(require_api_key)])
def run_sync_endpoint(request: RunRequest) -> PipelineResult:
    """Run a local preview synchronously. Production jobs must use the Prefect queue."""
    _validated_brief(request)
    if not request.dry_run:
        raise HTTPException(
            status_code=409,
            detail="Synchronous production is disabled; submit to /v1/runs instead.",
        )
    settings = Settings.from_env()
    brief_path = _persist_inbox_brief(request.brief, settings)
    return production_flow(
        brief_path=str(brief_path),
        dry_run=True,
        planner_provider=request.planner_provider,
        auto_approve=request.auto_approve,
        delivery_target=request.delivery_target,
    )


@app.post("/v1/runs", dependencies=[Depends(require_api_key)])
async def enqueue_run_endpoint(request: RunRequest) -> dict[str, Any]:
    """Persist an inline brief and enqueue a durable Prefect flow run."""
    _validated_brief(request)
    settings = Settings.from_env()
    brief_path = _persist_inbox_brief(request.brief, settings)
    try:
        from prefect.deployments import run_deployment
    except ImportError as error:
        raise HTTPException(
            status_code=503,
            detail="Prefect is not installed; use the orchestrator deployment.",
        ) from error

    try:
        flow_run = await run_deployment(
            name=settings.prefect_deployment_name,
            parameters={
                "brief_path": str(brief_path),
                "dry_run": request.dry_run,
                "planner_provider": request.planner_provider,
                "auto_approve": request.auto_approve,
                "delivery_target": request.delivery_target,
            },
            timeout=0,
        )
    except Exception as error:
        raise HTTPException(status_code=503, detail=f"Prefect enqueue failed: {error}") from error

    return {
        "accepted": True,
        "run_id": str(flow_run.id),
        "deployment": settings.prefect_deployment_name,
        "brief_path": str(brief_path),
    }


@app.get("/v1/runs/{run_id}", dependencies=[Depends(require_api_key)])
async def run_status_endpoint(run_id: str) -> dict[str, Any]:
    try:
        run_uuid = uuid.UUID(run_id)
    except ValueError as error:
        raise HTTPException(status_code=422, detail="run_id must be a UUID") from error
    try:
        from prefect.client.orchestration import get_client
    except ImportError as error:
        raise HTTPException(status_code=503, detail="Prefect is not installed") from error

    try:
        async with get_client() as client:
            flow_run = await client.read_flow_run(run_uuid)
    except Exception as error:
        raise HTTPException(status_code=404, detail=f"Flow run unavailable: {error}") from error

    state = flow_run.state
    return {
        "run_id": str(flow_run.id),
        "name": flow_run.name,
        "state": state.name if state else None,
        "state_type": str(state.type) if state else None,
        "created": flow_run.created.isoformat() if flow_run.created else None,
        "updated": flow_run.updated.isoformat() if flow_run.updated else None,
    }


@app.get("/v1/projects/{project_id}", dependencies=[Depends(require_api_key)])
def project_endpoint(project_id: str) -> dict[str, Any]:
    settings = Settings.from_env()
    try:
        workspace = ProjectWorkspace.create(settings.workspace, project_id)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    state_path = workspace.root / "state.json"
    if not state_path.exists():
        raise HTTPException(status_code=404, detail="Project not found")

    def read_json(path: Path) -> Any | None:
        return json.loads(path.read_text(encoding="utf-8")) if path.exists() else None

    return {
        "project_id": project_id,
        "workspace": str(workspace.root),
        "state": read_json(state_path),
        "manifest": read_json(workspace.root / "shot-manifest.json"),
        "qa": read_json(workspace.qa / "technical-qa.json"),
        "draft_review": read_json(workspace.review / "draft-review.json"),
        "final_review": read_json(workspace.review / "final-review.json"),
        "delivery": read_json(workspace.deliverables / "delivery.json"),
    }


def _approve_project_review(
    project_id: str,
    request: ReviewRequest,
    stage: ReviewStage,
) -> dict[str, Any]:
    settings = Settings.from_env()
    try:
        workspace = ProjectWorkspace.create(settings.workspace, project_id)
        state_path = workspace.root / "state.json"
        expected_state = (
            "draft_review_required"
            if stage is ReviewStage.DRAFT
            else "final_review_required"
        )
        approved_state = (
            "draft_approved" if stage is ReviewStage.DRAFT else "final_approved"
        )
        state = load_project_state(state_path)
        if state.status != expected_state:
            raise ValueError(
                f"Project state must be {expected_state} before {stage.value} approval, "
                f"got {state.status}"
            )
        review = approve_review(
            workspace.review / f"{stage.value}-review.json",
            request.reviewer,
            request.notes,
            expected_stage=stage,
        )
        transition_project_state(
            state_path,
            approved_state,
            expected=expected_state,
        )
    except (ValueError, FileNotFoundError) as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return review.model_dump(mode="json")


@app.post(
    "/v1/projects/{project_id}/reviews/draft/approve",
    dependencies=[Depends(require_api_key)],
)
def approve_draft_endpoint(project_id: str, request: ReviewRequest) -> dict[str, Any]:
    return _approve_project_review(project_id, request, ReviewStage.DRAFT)


@app.post(
    "/v1/projects/{project_id}/approve",
    dependencies=[Depends(require_api_key)],
    deprecated=True,
)
def approve_endpoint(project_id: str, request: ReviewRequest) -> dict[str, Any]:
    """Compatibility alias for draft approval."""
    return _approve_project_review(project_id, request, ReviewStage.DRAFT)




def _request_project_changes(
    project_id: str,
    request: ReviewRequest,
    stage: ReviewStage,
) -> dict[str, Any]:
    settings = Settings.from_env()
    if not request.notes:
        raise HTTPException(status_code=422, detail="Change-request notes are required")
    try:
        workspace = ProjectWorkspace.create(settings.workspace, project_id)
        state_path = workspace.root / "state.json"
        expected_state = (
            "draft_review_required"
            if stage is ReviewStage.DRAFT
            else "final_review_required"
        )
        return_state = "production" if stage is ReviewStage.DRAFT else "finalizing"
        state = load_project_state(state_path)
        if state.status != expected_state:
            raise ValueError(
                f"Project state must be {expected_state} before requesting changes, "
                f"got {state.status}"
            )
        review = request_changes(
            workspace.review / f"{stage.value}-review.json",
            request.reviewer,
            request.notes,
            expected_stage=stage,
        )
        transition_project_state(
            state_path,
            return_state,
            expected=expected_state,
        )
    except (ValueError, FileNotFoundError) as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return review.model_dump(mode="json")


@app.post(
    "/v1/projects/{project_id}/reviews/draft/request-changes",
    dependencies=[Depends(require_api_key)],
)
def request_draft_changes_endpoint(
    project_id: str, request: ReviewRequest
) -> dict[str, Any]:
    return _request_project_changes(project_id, request, ReviewStage.DRAFT)


@app.post(
    "/v1/projects/{project_id}/reviews/final/request-changes",
    dependencies=[Depends(require_api_key)],
)
def request_final_changes_endpoint(
    project_id: str, request: ReviewRequest
) -> dict[str, Any]:
    return _request_project_changes(project_id, request, ReviewStage.FINAL)


@app.post(
    "/v1/projects/{project_id}/finalize",
    dependencies=[Depends(require_api_key)],
)
def finalize_endpoint(project_id: str) -> dict[str, Any]:
    settings = Settings.from_env()
    try:
        workspace = ProjectWorkspace.create(settings.workspace, project_id)
        manifest = ShotManifest.model_validate_json(
            (workspace.root / "shot-manifest.json").read_text(encoding="utf-8")
        )
        review = finalize_project(manifest, workspace, settings)
    except (ValueError, FileNotFoundError) as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return review.model_dump(mode="json")


@app.post(
    "/v1/projects/{project_id}/reviews/final/approve",
    dependencies=[Depends(require_api_key)],
)
def approve_final_endpoint(project_id: str, request: ReviewRequest) -> dict[str, Any]:
    return _approve_project_review(project_id, request, ReviewStage.FINAL)


@app.post(
    "/v1/projects/{project_id}/deliver",
    dependencies=[Depends(require_api_key)],
)
def deliver_endpoint(project_id: str, request: DeliveryRequest) -> dict[str, Any]:
    settings = Settings.from_env()
    try:
        workspace = ProjectWorkspace.create(settings.workspace, project_id)
        manifest = ShotManifest.model_validate_json(
            (workspace.root / "shot-manifest.json").read_text(encoding="utf-8")
        )
        record = deliver_project(manifest, workspace, settings, target=request.target)
    except (ValueError, FileNotFoundError) as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return record.model_dump(mode="json")
