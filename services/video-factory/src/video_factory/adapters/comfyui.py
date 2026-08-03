from __future__ import annotations

import json
import time
import uuid
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

import httpx

from ..io import file_sha256
from ..media import MediaError, create_placeholder_clip, normalize_clip, source_fidelity_score
from ..model_registry import assert_model_bindings_approved
from ..models import Engine, EngineOutput, Shot
from ..workflow_registry import (
    WorkflowContract,
    load_api_workflow,
    load_workflow_registry,
)
from .base import EngineAdapter, EngineContext


class ComfyUIError(RuntimeError):
    pass


def replace_placeholders(value: Any, bindings: dict[str, Any]) -> Any:
    if isinstance(value, dict):
        return {key: replace_placeholders(item, bindings) for key, item in value.items()}
    if isinstance(value, list):
        return [replace_placeholders(item, bindings) for item in value]
    if isinstance(value, str) and value.startswith("{{") and value.endswith("}}"):
        key = value[2:-2].strip()
        return bindings.get(key, value)
    return value


def find_outputs(history: dict[str, Any]) -> list[dict[str, str]]:
    files: list[dict[str, str]] = []
    for node in history.get("outputs", {}).values():
        if not isinstance(node, dict):
            continue
        for key in ("gifs", "videos", "images", "audio"):
            values = node.get(key, [])
            if isinstance(values, list):
                files.extend(
                    item
                    for item in values
                    if isinstance(item, dict) and item.get("filename")
                )
    return files


def _headers(api_key: str | None) -> dict[str, str]:
    if not api_key:
        return {}
    return {
        "Authorization": f"Bearer {api_key}",
        "X-API-Key": api_key,
    }


def _rights_satisfied(contract: WorkflowContract, context: EngineContext) -> None:
    rights = context.manifest.rights
    checks = {
        "ai_generation_allowed": rights.ai_generation_allowed,
        "source_assets_cleared": rights.source_assets_cleared,
        "claims_approved_by_client": rights.claims_approved_by_client,
    }
    missing = [name for name in contract.required_rights if not checks.get(name, False)]
    if missing:
        raise ComfyUIError(
            f"Workflow {contract.id} is blocked by missing rights: {', '.join(missing)}"
        )


def upload_source_image(client: httpx.Client, shot: Shot) -> str:
    source = next((Path(item) for item in shot.source_assets if Path(item).is_file()), None)
    if source is None:
        raise ComfyUIError(f"{shot.id} requires a readable source image")
    upload_name = f"pet-life-movie-{uuid.uuid4().hex}{source.suffix.lower() or '.image'}"
    with source.open("rb") as handle:
        response = client.post(
            "/upload/image",
            files={"image": (upload_name, handle, "application/octet-stream")},
            data={"type": "input", "overwrite": "false"},
        )
    response.raise_for_status()
    payload = response.json()
    saved_name = str(payload.get("name") or "").strip()
    if not saved_name:
        raise ComfyUIError("ComfyUI source upload returned no image name")
    subfolder = str(payload.get("subfolder") or "").strip().strip("/")
    return f"{subfolder}/{saved_name}" if subfolder else saved_name


def _load_workflow(shot: Shot, context: EngineContext) -> tuple[Path, dict[str, Any], str]:
    workflow_id = str(shot.metadata.get("comfyui_workflow_id") or "").strip()
    if workflow_id:
        registry = load_workflow_registry(context.settings.comfyui_workflow_registry)
        try:
            contract = registry.get(workflow_id)
        except KeyError as error:
            raise ComfyUIError(str(error)) from error
        _rights_satisfied(contract, context)
        try:
            assert_model_bindings_approved(
                contract.model_bindings,
                workflow_id=contract.id,
                registry_path=context.settings.model_registry_path,
                region=context.settings.production_region,
            )
            workflow_path, workflow = load_api_workflow(
                contract,
                context.settings.comfyui_workflow_root,
            )
        except (ValueError, FileNotFoundError, json.JSONDecodeError) as error:
            raise ComfyUIError(str(error)) from error
        return workflow_path, workflow, contract.id

    workflow_value = shot.metadata.get("comfyui_workflow")
    if not workflow_value:
        raise ComfyUIError(
            f"{shot.id} must declare metadata.comfyui_workflow_id from the approved registry"
        )
    if not context.settings.comfyui_allow_unregistered_workflows:
        raise ComfyUIError(
            "Direct ComfyUI workflow paths are disabled; bind an approved workflow contract"
        )
    workflow_path = Path(str(workflow_value))
    if not workflow_path.is_absolute():
        workflow_path = context.settings.comfyui_workflow_root / workflow_path
    workflow = json.loads(workflow_path.read_text(encoding="utf-8"))
    return workflow_path, workflow, "unregistered"


class ComfyUIAdapter(EngineAdapter):
    def run(self, shot: Shot, context: EngineContext) -> EngineOutput:
        started = time.monotonic()
        output = self.output_path(shot, context)
        workflow_id = str(shot.metadata.get("comfyui_workflow_id") or "unbound")
        if context.dry_run:
            create_placeholder_clip(
                output,
                duration_seconds=shot.duration_seconds,
                width=context.deliverable.width,
                height=context.deliverable.height,
                fps=context.deliverable.fps,
                label=shot.title,
            )
            return EngineOutput(
                shot_id=shot.id,
                engine=Engine.COMFYUI,
                status="dry_run",
                media_path=str(output),
                provenance={
                    "endpoint": context.settings.comfyui_base_url,
                    "workflow_id": workflow_id,
                },
                warnings=["ComfyUI call skipped in dry-run mode."],
                elapsed_seconds=time.monotonic() - started,
            )

        base_url = context.settings.comfyui_base_url
        if not base_url:
            raise ComfyUIError("COMFYUI_API_URL is not configured")
        if (
            context.settings.environment == "production"
            and not context.settings.comfyui_api_key
        ):
            raise ComfyUIError("COMFYUI_API_KEY is required in production")

        workflow_path, workflow, workflow_id = _load_workflow(shot, context)
        client_id = str(uuid.uuid4())

        timeout = httpx.Timeout(30.0, read=60.0)
        with httpx.Client(
            base_url=base_url,
            timeout=timeout,
            headers=_headers(context.settings.comfyui_api_key),
        ) as client:
            source_image = (
                upload_source_image(client, shot)
                if shot.metadata.get("comfyui_upload_source_image")
                else None
            )
            bindings = {
                "prompt": shot.metadata.get("prompt", shot.body or shot.purpose),
                "negative_prompt": shot.metadata.get(
                    "negative_prompt", "distorted text, logo mutation"
                ),
                "seed": int(shot.metadata.get("seed", 1)),
                "width": context.deliverable.width,
                "height": context.deliverable.height,
                "source_image": source_image,
                **dict(shot.metadata.get("comfyui_bindings", {})),
            }
            prompt = replace_placeholders(workflow, bindings)
            response = client.post("/prompt", json={"prompt": prompt, "client_id": client_id})
            response.raise_for_status()
            prompt_id = response.json()["prompt_id"]
            deadline = time.monotonic() + context.settings.comfyui_timeout_seconds
            history: dict[str, Any] | None = None
            while time.monotonic() < deadline:
                history_response = client.get(f"/history/{prompt_id}")
                history_response.raise_for_status()
                payload = history_response.json()
                if prompt_id in payload:
                    history = payload[prompt_id]
                    if find_outputs(history):
                        break
                time.sleep(context.settings.comfyui_poll_seconds)
            if history is None:
                raise ComfyUIError(f"ComfyUI timed out for prompt {prompt_id}")
            candidates = find_outputs(history)
            if not candidates:
                raise ComfyUIError(
                    "ComfyUI returned no downloadable outputs for "
                    f"prompt {prompt_id}"
                )
            item = candidates[0]
            query = urlencode(
                {
                    "filename": item["filename"],
                    "subfolder": item.get("subfolder", ""),
                    "type": item.get("type", "output"),
                }
            )
            media_response = client.get(f"/view?{query}")
            media_response.raise_for_status()
            downloaded = (
                context.workspace.assets_generated / context.namespace / item["filename"]
            )
            downloaded.parent.mkdir(parents=True, exist_ok=True)
            downloaded.write_bytes(media_response.content)

        normalize_clip(
            downloaded,
            output,
            duration_seconds=shot.duration_seconds,
            width=context.deliverable.width,
            height=context.deliverable.height,
            fps=context.deliverable.fps,
            loop_source=False,
        )
        fidelity_threshold = float(shot.metadata.get("source_fidelity_threshold") or 0)
        fidelity_score: float | None = None
        fidelity_error: str | None = None
        if fidelity_threshold > 0:
            source = next(
                (Path(item) for item in shot.source_assets if Path(item).is_file()),
                None,
            )
            try:
                if source is None:
                    raise MediaError("source image is unavailable for fidelity scoring")
                fidelity_score = source_fidelity_score(source, output)
            except (MediaError, OSError, ValueError) as error:
                fidelity_error = str(error)
            if fidelity_score is None or fidelity_score < fidelity_threshold:
                from .ffmpeg import FFmpegAdapter

                fallback = FFmpegAdapter().run(shot, context)
                fallback.provenance.update(
                    {
                        "gpu_workflow_id": workflow_id,
                        "gpu_prompt_id": prompt_id,
                        "source_fidelity_score": fidelity_score,
                        "source_fidelity_threshold": fidelity_threshold,
                        "source_fidelity_error": fidelity_error,
                        "identity_safe_fallback": True,
                    }
                )
                fallback.warnings.append(
                    "Generated motion failed the source-fidelity gate; supplied-photo motion was used."
                )
                return fallback
        return EngineOutput(
            shot_id=shot.id,
            engine=Engine.COMFYUI,
            status="completed",
            media_path=str(output),
            provenance={
                "endpoint": base_url,
                "profile": context.settings.comfyui_profile,
                "prompt_id": prompt_id,
                "workflow_id": workflow_id,
                "workflow": str(workflow_path),
                "source_fidelity_score": fidelity_score,
                "source_fidelity_threshold": fidelity_threshold or None,
                "workflow_sha256": file_sha256(workflow_path),
                "source_output": item,
            },
            elapsed_seconds=time.monotonic() - started,
        )
