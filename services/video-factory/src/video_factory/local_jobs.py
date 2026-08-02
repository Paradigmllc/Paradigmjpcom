from __future__ import annotations

import json
import logging
import threading
import uuid
from concurrent.futures import Future, ThreadPoolExecutor
from dataclasses import asdict, dataclass, replace
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .models import PipelineResult
from .pipeline import production_flow
from .settings import Settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class LocalJob:
    run_id: str
    status: str
    created_at: str
    updated_at: str
    brief_path: str
    dry_run: bool
    planner_provider: str
    auto_approve: bool
    delivery_target: str
    manifest_path: str | None = None
    rerender_shot_ids: list[str] | None = None
    project_id: str | None = None
    error: str | None = None
    result: dict[str, Any] | None = None


_lock = threading.RLock()
_executors: dict[int, ThreadPoolExecutor] = {}
_futures: dict[str, Future[Any]] = {}


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _runs_root(settings: Settings) -> Path:
    root = settings.workspace / "runs"
    root.mkdir(parents=True, exist_ok=True)
    return root


def _job_path(settings: Settings, run_id: str) -> Path:
    return _runs_root(settings) / f"{run_id}.json"


def _write_job(settings: Settings, job: LocalJob) -> None:
    path = _job_path(settings, job.run_id)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(
        json.dumps(asdict(job), indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    temporary.replace(path)


def load_local_job(settings: Settings, run_id: str) -> LocalJob | None:
    try:
        uuid.UUID(run_id)
    except ValueError:
        return None
    path = _job_path(settings, run_id)
    if not path.is_file():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            return None
        return LocalJob(**payload)
    except (OSError, json.JSONDecodeError, TypeError):
        return None


def list_local_jobs(
    settings: Settings,
    *,
    limit: int = 100,
) -> tuple[list[LocalJob], list[str]]:
    jobs: list[LocalJob] = []
    errors: list[str] = []
    for path in sorted(
        _runs_root(settings).glob("*.json"),
        key=lambda item: item.stat().st_mtime,
        reverse=True,
    ):
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(payload, dict):
                raise TypeError("expected a JSON object")
            jobs.append(LocalJob(**payload))
        except (OSError, json.JSONDecodeError, TypeError) as error:
            errors.append(f"{path.name}: {error}")
        if len(jobs) >= limit:
            break
    return jobs, errors


def reconcile_interrupted_local_jobs(settings: Settings) -> list[LocalJob]:
    jobs, errors = list_local_jobs(settings, limit=10_000)
    if errors:
        logger.error("Unreadable local job records during startup: %s", errors)
    interrupted: list[LocalJob] = []
    for job in jobs:
        if job.status not in {"queued", "running"}:
            continue
        failed = replace(
            job,
            status="failed",
            updated_at=_now(),
            error=(
                "Video Factory restarted before this job completed. "
                "The job was stopped safely; review artifacts before resubmitting."
            ),
        )
        _write_job(settings, failed)
        interrupted.append(failed)
    return interrupted


def _executor(settings: Settings) -> ThreadPoolExecutor:
    workers = max(1, settings.local_queue_workers)
    with _lock:
        existing = _executors.get(workers)
        if existing is None:
            existing = ThreadPoolExecutor(
                max_workers=workers,
                thread_name_prefix="video-factory-local",
            )
            _executors[workers] = existing
        return existing


def _run_job(settings: Settings, job: LocalJob) -> None:
    running = replace(job, status="running", updated_at=_now())
    _write_job(settings, running)
    try:
        pipeline_result: PipelineResult = production_flow(
            brief_path=job.brief_path,
            dry_run=job.dry_run,
            planner_provider=job.planner_provider,
            auto_approve=job.auto_approve,
            delivery_target=job.delivery_target,
            lifecycle_run_id=job.run_id,
            manifest_path=job.manifest_path,
            rerender_shot_ids=job.rerender_shot_ids,
        )
        dumped = pipeline_result.model_dump(mode="json")
        completed = replace(
            running,
            status="completed",
            updated_at=_now(),
            project_id=pipeline_result.project_id,
            result=dumped,
        )
        _write_job(settings, completed)
    except Exception as error:
        logger.exception("Video Factory local job %s failed", job.run_id)
        failed = replace(
            running,
            status="failed",
            updated_at=_now(),
            error=str(error),
        )
        _write_job(settings, failed)
    finally:
        with _lock:
            _futures.pop(job.run_id, None)


def submit_local_job(
    settings: Settings,
    *,
    brief_path: Path,
    dry_run: bool,
    planner_provider: str,
    auto_approve: bool,
    delivery_target: str,
    manifest_path: Path | None = None,
    rerender_shot_ids: list[str] | None = None,
) -> LocalJob:
    run_id = str(uuid.uuid4())
    timestamp = _now()
    job = LocalJob(
        run_id=run_id,
        status="queued",
        created_at=timestamp,
        updated_at=timestamp,
        brief_path=str(brief_path),
        dry_run=dry_run,
        planner_provider=planner_provider,
        auto_approve=auto_approve,
        delivery_target=delivery_target,
        manifest_path=str(manifest_path) if manifest_path else None,
        rerender_shot_ids=rerender_shot_ids,
    )
    _write_job(settings, job)
    future = _executor(settings).submit(_run_job, settings, job)
    with _lock:
        _futures[run_id] = future
    return job


def local_job_response(job: LocalJob) -> dict[str, Any]:
    return {
        "run_id": job.run_id,
        "backend": "local",
        "state": job.status,
        "state_type": job.status.upper(),
        "created": job.created_at,
        "updated": job.updated_at,
        "project_id": job.project_id,
        "error": job.error,
        "result": job.result,
    }
