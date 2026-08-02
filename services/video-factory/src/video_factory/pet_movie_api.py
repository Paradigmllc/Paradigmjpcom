from __future__ import annotations

import os
import uuid
from pathlib import Path

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from .api import require_api_key
from .io import model_sha256, write_model
from .local_jobs import submit_local_job
from .models import ClientBrief, Engine, Shot, ShotKind, ShotManifest
from .pet_movie_contract import allowed_pet_movie_download_url, pet_movie_deliverables
from .settings import Settings
from .workspace import slugify

router = APIRouter(prefix="/v1/pet-movie", tags=["pet-movie"])


class PetMovieInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    assetId: str = Field(min_length=1, max_length=100)
    url: str = Field(min_length=20, max_length=5000)


class PetMovieScene(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str = Field(min_length=1, max_length=100)
    assetId: str = Field(min_length=1, max_length=100)
    durationSeconds: float = Field(gt=0, le=120)
    motion: str = Field(min_length=1, max_length=40)
    caption: str = Field(max_length=500)


class PetMovieStoryboard(BaseModel):
    model_config = ConfigDict(extra="allow")
    title: str = Field(min_length=1, max_length=200)
    scenes: list[PetMovieScene] = Field(min_length=1, max_length=40)


class PetMovieRenderRequest(BaseModel):
    model_config = ConfigDict(extra="allow")
    jobId: str = Field(pattern=r"^[0-9a-f-]{36}$")
    projectId: str = Field(pattern=r"^[0-9a-f-]{36}$")
    plan: str = Field(pattern=r"^(mini|story|cinema)$")
    locale: str = Field(pattern=r"^(ja|en|es|pt)$")
    storyboard: PetMovieStoryboard
    inputs: list[PetMovieInput] = Field(min_length=5, max_length=20)


async def _download_assets(request: PetMovieRenderRequest, root: Path) -> dict[str, str]:
    target = root / "inbox" / "pet-movie-assets" / request.projectId
    target.mkdir(parents=True, exist_ok=True)
    downloaded: dict[str, str] = {}
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=False) as client:
        for index, item in enumerate(request.inputs, start=1):
            if not allowed_pet_movie_download_url(item.url):
                raise HTTPException(status_code=422, detail="Asset URL host is not allowed")
            output = target / f"{index:02d}-{uuid.uuid4().hex}.image"
            total = 0
            try:
                async with client.stream("GET", item.url) as response:
                    response.raise_for_status()
                    content_type = response.headers.get("content-type", "").split(";", 1)[0]
                    if content_type not in {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}:
                        raise HTTPException(status_code=422, detail="Downloaded asset is not a supported image")
                    with output.open("wb") as handle:
                        async for chunk in response.aiter_bytes():
                            total += len(chunk)
                            if total > 20 * 1024 * 1024:
                                raise HTTPException(status_code=413, detail="Downloaded asset exceeds 20 MB")
                            handle.write(chunk)
            except HTTPException:
                output.unlink(missing_ok=True)
                raise
            except (httpx.HTTPError, OSError) as error:
                output.unlink(missing_ok=True)
                raise HTTPException(status_code=502, detail=f"Asset download failed: {error}") from error
            downloaded[item.assetId] = str(output)
    return downloaded


@router.post("/renders", dependencies=[Depends(require_api_key)])
async def create_pet_movie_render(request: PetMovieRenderRequest) -> dict[str, object]:
    settings = Settings.from_env()
    project_name = f"pet-movie-{request.projectId}"
    renderer_project_id = slugify(project_name)
    assets = await _download_assets(request, settings.workspace)
    missing_asset_ids = sorted({scene.assetId for scene in request.storyboard.scenes} - set(assets))
    if missing_asset_ids:
        raise HTTPException(status_code=422, detail=f"Storyboard references unknown assets: {', '.join(missing_asset_ids)}")
    target_duration = 30.0 if request.plan == "mini" else 60.0
    scene_duration = target_duration / len(request.storyboard.scenes)
    deliverables = pet_movie_deliverables(request.plan, request.locale)
    approver_email = (os.getenv("VIDEO_FACTORY_REVIEWER_EMAIL") or "support@paradigmjp.com").strip()
    brief = ClientBrief.model_validate({
        "project_name": project_name,
        "objective": f"Create a factual, private memory film titled {request.storyboard.title}",
        "audience": "The pet owner and family members invited by the pet owner",
        "platforms": ["private-download"],
        "duration_seconds": target_duration,
        "languages": [request.locale],
        "brand": {"name": "Pet Life Movie", "kit_id": "pet-life-movie", "primary_color": "#7C3AED", "accent_color": "#F472B6"},
        "audio": {"captions": "burned"},
        "source_assets": list(assets.values()),
        "rights": {
            "source_assets_cleared": True,
            "ai_generation_allowed": False,
            "likeness_consent": "not_applicable",
            "voice_consent": "not_applicable",
            "claims_approved_by_client": True,
            "notes": "User confirmed photo rights. Factual captions only; no voice cloning.",
        },
        "approver": {"name": "Paradigm production reviewer", "email": approver_email},
        "deliverables": deliverables,
        "requested_shot_kinds": ["supplied_edit"],
        "notes": "Pet Life Movie paid render. Two human approval gates are mandatory.",
    })
    shots = [
        Shot(
            id=f"shot-{index:03d}",
            order=index,
            title=(scene.caption or f"Scene {index}")[:200],
            purpose="Present only the customer-provided factual memory",
            kind=ShotKind.SUPPLIED_EDIT,
            duration_seconds=scene_duration,
            language=request.locale,
            headline=scene.caption,
            body=scene.caption,
            source_assets=[assets[scene.assetId]],
            engine=Engine.FFMPEG,
            routing_reason="Identity-safe supplied-photo edit; generative models disabled",
            metadata={"motion": scene.motion, "pet_movie_scene_id": scene.id},
        )
        for index, scene in enumerate(request.storyboard.scenes, start=1)
    ]
    manifest = ShotManifest.model_validate({
        "project_id": renderer_project_id,
        "project_name": project_name,
        "brief_sha256": model_sha256(brief),
        "duration_seconds": target_duration,
        "primary_deliverable": deliverables[0],
        "deliverables": deliverables,
        "brand": brief.brand,
        "audio": brief.audio,
        "rights": brief.rights,
        "approver": brief.approver,
        "shots": shots,
        "requires_human_review": True,
        "metadata": {"pet_movie_project_id": request.projectId, "pet_movie_job_id": request.jobId},
    })
    inbox = settings.workspace / "inbox"
    brief_path = write_model(inbox / f"{renderer_project_id}-{request.jobId}-brief.json", brief)
    manifest_path = write_model(inbox / f"{renderer_project_id}-{request.jobId}-manifest.json", manifest)
    job = submit_local_job(
        settings,
        brief_path=brief_path,
        dry_run=False,
        planner_provider="deterministic",
        auto_approve=False,
        delivery_target="local",
        manifest_path=manifest_path,
    )
    return {"accepted": True, "runId": job.run_id, "rendererProjectId": renderer_project_id, "reviewRequired": True}
