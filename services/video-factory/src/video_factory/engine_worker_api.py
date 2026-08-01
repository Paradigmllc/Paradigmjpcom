from __future__ import annotations

import hashlib
import os
import secrets
import shutil
import tempfile
import threading
from collections.abc import Iterator
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field

from .commands import CommandError, run_command
from .engine_profiles import (
    CommercialPolicy,
    EngineProfile,
    EngineRuntime,
    ExecutionTarget,
    ProfileApproval,
    load_engine_profile_catalog,
    profile_external_command,
    resolved_execution_target,
)
from .io import write_json
from .media import probe_media
from .models import BrandSpec, DeliverableSpec, RightsDeclaration, Shot


class WorkerRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    protocol_version: int = Field(ge=1, le=1)
    profile_id: str = Field(pattern=r"^[a-z0-9][a-z0-9-]{2,79}$")
    profile_revision: str = Field(pattern=r"^[a-f0-9]{40}$")
    shot: Shot
    deliverable: DeliverableSpec
    brand: BrandSpec
    rights: RightsDeclaration


def _required_secret() -> str:
    value = os.getenv("VIDEO_FACTORY_OSS_WORKER_API_KEY", "").strip()
    if len(value) < 32:
        raise RuntimeError("VIDEO_FACTORY_OSS_WORKER_API_KEY must contain at least 32 characters")
    return value


def require_worker_key(
    authorization: Annotated[str | None, Header()] = None,
    x_api_key: Annotated[str | None, Header()] = None,
) -> None:
    expected = _required_secret()
    candidate = (
        authorization.removeprefix("Bearer ").strip()
        if authorization and authorization.startswith("Bearer ")
        else (x_api_key or "").strip()
    )
    if not candidate or not secrets.compare_digest(candidate, expected):
        raise HTTPException(status_code=401, detail="Unauthorized")


def _catalog_path() -> Path:
    value = os.getenv(
        "VIDEO_FACTORY_ENGINE_PROFILE_CATALOG",
        "config/engine-profiles.yaml",
    )
    return Path(value).expanduser().resolve()


def _output_limit() -> int:
    value = int(os.getenv("VIDEO_FACTORY_OSS_WORKER_MAX_OUTPUT_BYTES", "268435456"))
    if not 1_048_576 <= value <= 1_073_741_824:
        raise RuntimeError("VIDEO_FACTORY_OSS_WORKER_MAX_OUTPUT_BYTES is outside the safe range")
    return value


def _assert_rights(request: WorkerRequest) -> None:
    if request.shot.kind.value == "generative" and not request.rights.ai_generation_allowed:
        raise HTTPException(status_code=422, detail="AI generation rights are not approved")
    if (
        request.shot.kind.value in {"portrait_animation", "lip_sync"}
        and not request.rights.source_assets_cleared
    ):
        raise HTTPException(
            status_code=422,
            detail="Source asset rights are not approved",
        )


def _validated_profile(
    request: WorkerRequest,
) -> tuple[EngineProfile, tuple[str, ...]]:
    try:
        profile = load_engine_profile_catalog(_catalog_path()).get(request.profile_id)
    except (KeyError, OSError, ValueError) as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    if profile.revision != request.profile_revision:
        raise HTTPException(status_code=409, detail="Profile revision does not match the worker")
    if profile.runtime is not EngineRuntime.EXTERNAL_CLI:
        raise HTTPException(status_code=422, detail="Profile is not an external worker profile")
    if resolved_execution_target(profile) is not ExecutionTarget.MANAGED_GPU:
        raise HTTPException(status_code=422, detail="Profile is not assigned to the managed GPU")
    if profile.approval is not ProfileApproval.APPROVED:
        raise HTTPException(status_code=403, detail="Profile is not production-approved")
    if profile.commercial_policy is not CommercialPolicy.ALLOWED:
        raise HTTPException(status_code=403, detail="Profile is not approved for commercial use")
    command = profile_external_command(profile)
    if not command:
        raise HTTPException(status_code=503, detail="Pinned worker command is not installed")
    executable = command[0]
    if not (Path(executable).is_file() or shutil.which(executable)):
        raise HTTPException(status_code=503, detail="Pinned worker executable is unavailable")
    return profile, command


app = FastAPI(
    title="Paradigm Video Factory OSS Worker",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)
_gpu_lock = threading.Lock()


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        while chunk := source.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


@app.get("/v1/health", dependencies=[Depends(require_worker_key)])
def health() -> dict[str, object]:
    catalog = load_engine_profile_catalog(_catalog_path())
    profiles = []
    for profile in catalog.profiles:
        if resolved_execution_target(profile) is not ExecutionTarget.MANAGED_GPU:
            continue
        command = profile_external_command(profile)
        profiles.append(
            {
                "id": profile.id,
                "revision": profile.revision,
                "approved": profile.approval is ProfileApproval.APPROVED,
                "command_configured": bool(command),
                "executable_available": bool(
                    command and (Path(command[0]).is_file() or shutil.which(command[0]))
                ),
            }
        )
    return {"ok": True, "protocol_version": 1, "profiles": profiles}


@app.post("/v1/execute", dependencies=[Depends(require_worker_key)])
def execute(request: WorkerRequest) -> StreamingResponse:
    _assert_rights(request)
    profile, command = _validated_profile(request)
    if not _gpu_lock.acquire(blocking=False):
        raise HTTPException(status_code=409, detail="GPU worker is already processing a job")
    work = Path(tempfile.mkdtemp(prefix="video-factory-oss-"))
    request_path = work / "request.json"
    output_path = work / "output.mp4"
    try:
        write_json(request_path, request.model_dump(mode="json"))
        run_command(
            [*command, "--request", str(request_path), "--output", str(output_path)],
            timeout=int(os.getenv("VIDEO_FACTORY_OSS_WORKER_TIMEOUT_SECONDS", "3600")),
        )
        if not output_path.is_file() or output_path.stat().st_size == 0:
            raise RuntimeError("Worker did not create an MP4 output")
        if output_path.stat().st_size > _output_limit():
            raise RuntimeError("Worker output exceeded the configured size limit")
        probe = probe_media(output_path)
        if probe.width <= 0 or probe.height <= 0 or probe.duration_seconds <= 0:
            raise RuntimeError("Worker output does not contain a video stream")
        digest = _sha256(output_path)
    except (CommandError, OSError, RuntimeError, ValueError) as error:
        shutil.rmtree(work, ignore_errors=True)
        _gpu_lock.release()
        raise HTTPException(status_code=502, detail=str(error)) from error

    def stream_output() -> Iterator[bytes]:
        try:
            with output_path.open("rb") as source:
                while chunk := source.read(1024 * 1024):
                    yield chunk
        finally:
            shutil.rmtree(work, ignore_errors=True)
            _gpu_lock.release()

    return StreamingResponse(
        stream_output(),
        media_type="video/mp4",
        headers={
            "Cache-Control": "no-store",
            "X-Video-Factory-Profile": profile.id,
            "X-Video-Factory-Revision": profile.revision,
            "X-Video-Factory-SHA256": digest,
        },
    )
