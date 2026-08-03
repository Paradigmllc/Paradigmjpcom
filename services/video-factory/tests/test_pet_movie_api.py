from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

import video_factory.pet_movie_api as pet_movie_api
from video_factory.pet_movie_api import PET_MOVIE_VISUALS, PetMovieRenderRequest
from video_factory.pet_movie_contract import (
    allowed_pet_movie_download_url,
    pet_movie_deliverables,
)
from video_factory.workflow_registry import WorkflowApproval, load_workflow_registry


def test_pet_movie_downloads_only_accept_r2_signed_hosts() -> None:
    assert allowed_pet_movie_download_url("https://account.r2.cloudflarestorage.com/bucket/photo.jpg?sig=x")
    assert not allowed_pet_movie_download_url("http://account.r2.cloudflarestorage.com/photo.jpg")
    assert not allowed_pet_movie_download_url("https://r2.cloudflarestorage.com.attacker.example/photo.jpg")
    assert not allowed_pet_movie_download_url("https://127.0.0.1/internal")


def test_pet_movie_plan_formats_are_explicit_and_non_generative() -> None:
    assert [item["name"] for item in pet_movie_deliverables("mini", "ja")] == ["vertical-1080p"]
    assert [item["name"] for item in pet_movie_deliverables("story", "en")] == [
        "vertical-1080p",
        "landscape-1080p",
    ]
    assert [item["name"] for item in pet_movie_deliverables("cinema", "en")] == [
        "vertical-1080p",
        "landscape-1080p",
        "square-1080p",
    ]


def render_payload() -> dict[str, object]:
    return {
        "jobId": "00000000-0000-4000-8000-000000000001",
        "projectId": "00000000-0000-4000-8000-000000000002",
        "plan": "story",
        "locale": "ja",
        "aiMotionConsent": True,
        "storyboard": {
            "title": "Mugiとの時間",
            "scenes": [
                {
                    "id": "scene-1",
                    "assetId": "asset-1",
                    "durationSeconds": 2,
                    "motion": "slow_zoom",
                    "caption": "はじめて会った日",
                }
            ],
        },
        "inputs": [
            {
                "assetId": f"asset-{index}",
                "url": f"https://account.r2.cloudflarestorage.com/photo-{index}.jpg?sig=x",
            }
            for index in range(1, 6)
        ],
    }


def test_internal_qa_mode_requires_its_audit_id() -> None:
    payload = {**render_payload(), "mode": "internal_qa"}
    with pytest.raises(ValidationError, match="qaRenderId is required"):
        PetMovieRenderRequest.model_validate(payload)

    request = PetMovieRenderRequest.model_validate(
        {
            **payload,
            "qaRenderId": "00000000-0000-4000-8000-000000000003",
            "templateId": "cinematic-tribute",
        }
    )
    assert request.mode == "internal_qa"
    assert request.templateId == "cinematic-tribute"


def test_pet_templates_have_distinct_visual_systems_and_safe_margins() -> None:
    assert set(PET_MOVIE_VISUALS) == {
        "warm-keepsake",
        "playful-scrapbook",
        "cinematic-tribute",
    }
    assert len({item["accent_color"] for item in PET_MOVIE_VISUALS.values()}) == 3
    assert all(item["safe_margin_percent"] == 9 for item in PET_MOVIE_VISUALS.values())


def test_pet_gpu_workflow_starts_disabled_until_exact_runtime_binding() -> None:
    contract = load_workflow_registry("workflows/comfyui/registry.yaml").get(
        "pet-memory-i2v"
    )
    assert contract.approval is WorkflowApproval.APPROVED_CONTRACT
    assert contract.enabled is False
    assert {"source_assets_cleared", "ai_generation_allowed"}.issubset(
        contract.required_rights
    )


def test_internal_qa_can_validate_bound_gpu_while_checkout_stays_disabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    contract = SimpleNamespace(
        id="pet-memory-i2v",
        enabled=True,
        approval=WorkflowApproval.APPROVED_BOUND,
        media_kind="video",
        required_rights={"source_assets_cleared", "ai_generation_allowed"},
        model_bindings={"approved-model-slot": "approved.safetensors"},
    )
    monkeypatch.setenv("PET_MOVIE_GPU_RENDER_ENABLED", "false")
    monkeypatch.setenv("PET_MOVIE_GPU_WORKFLOW_ID", "pet-memory-i2v")
    monkeypatch.setattr(
        pet_movie_api,
        "load_workflow_registry",
        lambda _path: SimpleNamespace(get=lambda _workflow_id: contract),
    )
    monkeypatch.setattr(
        pet_movie_api,
        "assert_model_bindings_approved",
        lambda *_args, **_kwargs: None,
    )
    settings = SimpleNamespace(
        comfyui_workflow_registry="registry.yaml",
        model_registry_path="models.yaml",
        production_region="JP",
    )

    assert pet_movie_api._pet_gpu_workflow(settings, "internal_qa") == "pet-memory-i2v"
    with pytest.raises(HTTPException, match="paid slideshow fallback is forbidden"):
        pet_movie_api._pet_gpu_workflow(settings, "customer_paid")
