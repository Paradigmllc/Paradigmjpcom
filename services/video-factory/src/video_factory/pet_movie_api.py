from __future__ import annotations

import hashlib
import os
import uuid
from pathlib import Path
from typing import Literal

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, model_validator

from .api import require_api_key
from .io import model_sha256, write_model
from .local_jobs import submit_local_job
from .model_registry import assert_model_bindings_approved
from .models import ClientBrief, Engine, Shot, ShotKind, ShotManifest
from .pet_movie_contract import allowed_pet_movie_download_url, pet_movie_deliverables
from .settings import Settings
from .workflow_registry import WorkflowApproval, load_workflow_registry
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
    mode: Literal["customer_paid", "internal_qa"] = "customer_paid"
    qaRenderId: str | None = Field(default=None, pattern=r"^[0-9a-f-]{36}$")
    templateId: Literal[
        "warm-keepsake", "playful-scrapbook", "cinematic-tribute"
    ] = "warm-keepsake"
    renderTier: Literal["editorial", "cinematic_gpu"] = "cinematic_gpu"
    aiMotionConsent: bool

    @model_validator(mode="after")
    def qa_id_matches_mode(self) -> PetMovieRenderRequest:
        if self.mode == "internal_qa" and not self.qaRenderId:
            raise ValueError("qaRenderId is required for internal QA renders")
        if self.mode == "customer_paid" and self.qaRenderId:
            raise ValueError("qaRenderId is only allowed for internal QA renders")
        if self.renderTier == "cinematic_gpu" and not self.aiMotionConsent:
            raise ValueError("AI motion consent is required for cinematic GPU renders")
        return self


PET_MOVIE_VISUALS: dict[str, dict[str, object]] = {
    "warm-keepsake": {
        "primary_color": "#F7F1E8",
        "accent_color": "#D97A62",
        "secondary_color": "#2B202A",
        "text_color": "#2B202A",
        "font_family": "BIZ UDPMincho",
        "motion_preset": "minimal",
        "safe_margin_percent": 9,
    },
    "playful-scrapbook": {
        "primary_color": "#F7F1E8",
        "accent_color": "#E8A838",
        "secondary_color": "#2B202A",
        "text_color": "#2B202A",
        "font_family": "BIZ UDPMincho",
        "motion_preset": "energetic",
        "safe_margin_percent": 9,
    },
    "cinematic-tribute": {
        "primary_color": "#17131A",
        "accent_color": "#8D7BAF",
        "secondary_color": "#F7F1E8",
        "text_color": "#F7F1E8",
        "font_family": "BIZ UDPMincho",
        "motion_preset": "cinematic",
        "safe_margin_percent": 9,
    },
}


def _pet_gpu_workflow(
    settings: Settings,
    mode: Literal["customer_paid", "internal_qa"],
) -> str:
    if (
        mode == "customer_paid"
        and os.getenv("PET_MOVIE_GPU_RENDER_ENABLED", "").strip().lower() != "true"
    ):
        raise HTTPException(
            status_code=503,
            detail="Pet Movie GPU rendering is disabled; paid slideshow fallback is forbidden",
        )
    workflow_id = os.getenv("PET_MOVIE_GPU_WORKFLOW_ID", "").strip()
    if not workflow_id:
        raise HTTPException(
            status_code=503,
            detail="Pet Movie GPU workflow is not configured; paid slideshow fallback is forbidden",
        )
    try:
        contract = load_workflow_registry(settings.comfyui_workflow_registry).get(
            workflow_id
        )
        if not contract.enabled or contract.approval is not WorkflowApproval.APPROVED_BOUND:
            raise ValueError("workflow is not enabled and approved_bound")
        if contract.media_kind != "video":
            raise ValueError("workflow does not produce video")
        required_rights = {"source_assets_cleared", "ai_generation_allowed"}
        if not required_rights.issubset(contract.required_rights):
            raise ValueError("workflow does not require source and AI-generation rights")
        assert_model_bindings_approved(
            contract.model_bindings,
            workflow_id=contract.id,
            registry_path=settings.model_registry_path,
            region=settings.production_region,
        )
    except (KeyError, OSError, ValueError) as error:
        raise HTTPException(
            status_code=503,
            detail=f"Pet Movie GPU workflow is not production-ready: {error}",
        ) from error
    return contract.id


def _pet_motion_prompt(scene: PetMovieScene, template_id: str) -> str:
    motion = {
        "slow_zoom": "subtle breathing and a gentle natural gaze shift",
        "pan_left": "one small natural head turn toward the left",
        "pan_right": "one small natural head turn toward the right",
        "parallax": "subtle breathing with a tiny ear or tail movement",
        "ai_motion": "one restrained, anatomically natural movement",
    }.get(scene.motion, "subtle breathing")
    mood = {
        "warm-keepsake": "warm home-movie stillness",
        "playful-scrapbook": "light playful energy without exaggerated motion",
        "cinematic-tribute": "quiet cinematic tenderness",
    }[template_id]
    return (
        f"Animate only the real pet already present in the supplied image: {motion}. "
        f"Preserve exact face, eyes, fur markings, body proportions, collar and background. "
        f"Locked camera, {mood}, realistic motion, no new objects, no scene change."
    )


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
    project_name = (
        f"pet-movie-qa-{request.qaRenderId}"
        if request.mode == "internal_qa"
        else f"pet-movie-{request.projectId}"
    )
    renderer_project_id = slugify(project_name)
    assets = await _download_assets(request, settings.workspace)
    missing_asset_ids = sorted({scene.assetId for scene in request.storyboard.scenes} - set(assets))
    if missing_asset_ids:
        raise HTTPException(status_code=422, detail=f"Storyboard references unknown assets: {', '.join(missing_asset_ids)}")
    target_duration = 30.0 if request.plan == "mini" else 60.0
    scene_duration = target_duration / len(request.storyboard.scenes)
    deliverables = pet_movie_deliverables(request.plan, request.locale)
    approver_email = (os.getenv("VIDEO_FACTORY_REVIEWER_EMAIL") or "support@paradigmjp.com").strip()
    visual = PET_MOVIE_VISUALS[request.templateId]
    gpu_workflow: str | None = None
    if request.renderTier == "cinematic_gpu":
        gpu_workflow = _pet_gpu_workflow(settings, request.mode)
    brief = ClientBrief.model_validate({
        "project_name": project_name,
        "objective": f"Create a factual, private memory film titled {request.storyboard.title}",
        "audience": "The pet owner and family members invited by the pet owner",
        "platforms": ["private-download"],
        "duration_seconds": target_duration,
        "languages": [request.locale],
        "brand": {
            "name": "Pet Life Movie",
            "kit_id": f"pet-life-movie-{request.templateId}",
            **visual,
        },
        # The Pet Life Movie HyperFrames master burns its orientation-aware
        # captions; retain VTT as a sidecar without adding a duplicate FFmpeg layer.
        "audio": {"captions": "sidecar"},
        "source_assets": list(assets.values()),
        "rights": {
            "source_assets_cleared": True,
            "ai_generation_allowed": request.renderTier == "cinematic_gpu",
            "likeness_consent": "not_applicable",
            "voice_consent": "not_applicable",
            "claims_approved_by_client": True,
            "notes": "User confirmed photo rights. Factual captions only; no voice cloning.",
        },
        "approver": {"name": "Paradigm production reviewer", "email": approver_email},
        "deliverables": deliverables,
        "requested_shot_kinds": [
            "generative" if request.renderTier == "cinematic_gpu" else "supplied_edit"
        ],
        "notes": (
            "Pet Life Movie internal QA render. Non-billable, no customer notification or delivery. "
            "Two human approval gates are mandatory."
            if request.mode == "internal_qa"
            else "Pet Life Movie paid render. Two human approval gates are mandatory."
        ),
    })
    shots = [
        Shot(
            id=f"shot-{index:03d}",
            order=index,
            title=(scene.caption or f"Scene {index}")[:200],
            purpose="Present only the customer-provided factual memory",
            kind=(
                ShotKind.GENERATIVE
                if request.renderTier == "cinematic_gpu"
                else ShotKind.SUPPLIED_EDIT
            ),
            duration_seconds=scene_duration,
            language=request.locale,
            headline=scene.caption,
            body=scene.caption,
            source_assets=[assets[scene.assetId]],
            engine=Engine.COMFYUI if gpu_workflow else Engine.FFMPEG,
            routing_reason=(
                f"Identity-gated managed GPU image-to-video via {gpu_workflow}"
                if gpu_workflow
                else "Identity-safe supplied-photo editorial render"
            ),
            metadata={
                "motion": scene.motion,
                "pet_movie_scene_id": scene.id,
                "pet_movie_template_id": request.templateId,
                "comfyui_workflow_id": gpu_workflow or "",
                "comfyui_upload_source_image": bool(gpu_workflow),
                "prompt": _pet_motion_prompt(scene, request.templateId),
                "negative_prompt": (
                    "different animal, changed face, changed fur markings, extra limbs, missing limbs, "
                    "deformed anatomy, human features, talking, lip sync, camera cut, scene change, text, logo"
                ),
                "seed": int(
                    hashlib.sha256(
                        f"{request.projectId}:{scene.id}:{request.templateId}".encode()
                    ).hexdigest()[:8],
                    16,
                ),
                "source_fidelity_threshold": 0.78,
            },
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
        "metadata": (
            {
                "pet_movie_mode": "internal_qa",
                "pet_movie_qa_render_id": request.qaRenderId,
                "pet_movie_template_id": request.templateId,
            }
            if request.mode == "internal_qa"
            else {
                "pet_movie_mode": "customer_paid",
                "pet_movie_project_id": request.projectId,
                "pet_movie_job_id": request.jobId,
                "pet_movie_template_id": request.templateId,
            }
        ),
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
