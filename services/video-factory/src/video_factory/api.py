from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, Any

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from pydantic import BaseModel

from .delivery import deliver_project
from .doctor import doctor_report
from .finalization import finalize_project
from .gpu_lifecycle import release_gpu_if_idle
from .io import write_model
from .local_jobs import (
    list_local_jobs,
    load_local_job,
    local_job_response,
    reconcile_interrupted_local_jobs,
    submit_local_job,
)
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

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    settings = Settings.from_env()
    try:
        interrupted = reconcile_interrupted_local_jobs(settings)
        if interrupted:
            logger.error(
                "Marked %s interrupted Video Factory jobs as failed",
                len(interrupted),
            )
    except OSError:
        logger.exception("Could not reconcile interrupted Video Factory jobs")

    startup_task: asyncio.Task[dict[str, object]] | None = None
    if settings.gpu_lifecycle_enabled:
        async def stop_idle_gpu_after_startup() -> dict[str, object]:
            await asyncio.sleep(5)
            return await release_gpu_if_idle(settings)

        startup_task = asyncio.create_task(
            stop_idle_gpu_after_startup(),
            name="video-factory-startup-gpu-reconciliation",
        )
    try:
        yield
    finally:
        if startup_task is not None:
            if not startup_task.done():
                startup_task.cancel()
            try:
                await startup_task
            except asyncio.CancelledError:
                logger.warning("Startup GPU reconciliation was cancelled during shutdown")
            except Exception:
                logger.exception("Startup GPU reconciliation failed")

app = FastAPI(
    title="Paradigm Video Factory",
    version="0.1.0",
    description="Validated, multi-engine video-production orchestration.",
    lifespan=lifespan,
)


class RunRequest(BaseModel):
    brief: ClientBrief
    request_id: uuid.UUID | None = None
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
    settings = Settings.from_env()
    configured = settings.api_key
    if not configured and settings.environment == "production":
        raise HTTPException(status_code=503, detail="Video Factory API key is not configured")
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


def _use_prefect(settings: Settings) -> bool:
    if settings.queue_backend == "prefect":
        return True
    if settings.queue_backend == "local":
        return False
    return bool((os.getenv("PREFECT_API_URL") or "").strip())


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
    """Run a local preview synchronously."""
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
    """Persist a brief and queue it through Prefect or the standalone local worker."""
    _validated_brief(request)
    settings = Settings.from_env()
    if not _use_prefect(settings):
        if request.request_id:
            existing = load_local_job(settings, str(request.request_id))
            if existing is not None:
                return {
                    "accepted": True,
                    "run_id": existing.run_id,
                    "backend": "local",
                    "idempotent_replay": True,
                }
        brief_path = _persist_inbox_brief(request.brief, settings)
        job = submit_local_job(
            settings,
            run_id=str(request.request_id) if request.request_id else None,
            brief_path=brief_path,
            dry_run=request.dry_run,
            planner_provider=request.planner_provider,
            auto_approve=request.auto_approve,
            delivery_target=request.delivery_target,
        )
        return {
            "accepted": True,
            "run_id": job.run_id,
            "backend": "local",
            "brief_path": str(brief_path),
        }

    brief_path = _persist_inbox_brief(request.brief, settings)

    try:
        from prefect.deployments import run_deployment
    except ImportError as error:
        if settings.queue_backend == "auto":
            job = submit_local_job(
                settings,
                run_id=str(request.request_id) if request.request_id else None,
                brief_path=brief_path,
                dry_run=request.dry_run,
                planner_provider=request.planner_provider,
                auto_approve=request.auto_approve,
                delivery_target=request.delivery_target,
            )
            return {
                "accepted": True,
                "run_id": job.run_id,
                "backend": "local",
                "brief_path": str(brief_path),
            }
        raise HTTPException(
            status_code=503,
            detail="Prefect is not installed; select the local queue backend.",
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
        if settings.queue_backend == "auto":
            job = submit_local_job(
                settings,
                run_id=str(request.request_id) if request.request_id else None,
                brief_path=brief_path,
                dry_run=request.dry_run,
                planner_provider=request.planner_provider,
                auto_approve=request.auto_approve,
                delivery_target=request.delivery_target,
            )
            return {
                "accepted": True,
                "run_id": job.run_id,
                "backend": "local",
                "brief_path": str(brief_path),
                "warning": f"Prefect unavailable; local queue selected: {error}",
            }
        raise HTTPException(status_code=503, detail=f"Prefect enqueue failed: {error}") from error

    return {
        "accepted": True,
        "run_id": str(flow_run.id),
        "backend": "prefect",
        "deployment": settings.prefect_deployment_name,
        "brief_path": str(brief_path),
    }


@app.get("/v1/runs/{run_id}", dependencies=[Depends(require_api_key)])
async def run_status_endpoint(run_id: str) -> dict[str, Any]:
    settings = Settings.from_env()
    local_job = load_local_job(settings, run_id)
    if local_job is not None:
        return local_job_response(local_job)

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
        "backend": "prefect",
        "name": flow_run.name,
        "state": state.name if state else None,
        "state_type": str(state.type) if state else None,
        "created": flow_run.created.isoformat() if flow_run.created else None,
        "updated": flow_run.updated.isoformat() if flow_run.updated else None,
    }


@app.get("/v1/runs", dependencies=[Depends(require_api_key)])
def list_runs_endpoint(
    limit: int = Query(default=100, ge=1, le=500),
) -> dict[str, Any]:
    settings = Settings.from_env()
    jobs, errors = list_local_jobs(settings, limit=limit)
    return {
        "ok": not errors,
        "runs": [local_job_response(job) for job in jobs],
        "errors": errors,
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
        "revisions": [
            read_json(path)
            for path in sorted((workspace.root / "revisions").glob("*.json"))
        ]
        if (workspace.root / "revisions").exists()
        else [],
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
