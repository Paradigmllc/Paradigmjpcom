from __future__ import annotations

from pathlib import Path

from ..engine_profiles import (
    ExecutionTarget,
    load_engine_profile_catalog,
    profile_external_command,
    resolved_execution_target,
)
from ..media import MediaError, source_fidelity_score
from ..models import Engine, EngineOutput, Shot
from .base import EngineAdapter, EngineContext
from .external import ExternalCliAdapter
from .ffmpeg import FFmpegAdapter
from .managed_oss import ManagedOssWorkerAdapter


class ProfileCliAdapter(EngineAdapter):
    """Run an audited OSS worker through the common request/output contract."""

    def run(self, shot: Shot, context: EngineContext) -> EngineOutput:
        profile_id = str(shot.metadata.get("engine_profile_id") or "").strip()
        if not profile_id:
            raise RuntimeError("OSS adapter requires engine_profile_id metadata")
        catalog = load_engine_profile_catalog(context.settings.engine_profile_catalog_path)
        try:
            profile = catalog.get(profile_id)
        except KeyError as error:
            raise RuntimeError(str(error)) from error
        adapter: EngineAdapter
        if resolved_execution_target(profile) is ExecutionTarget.MANAGED_GPU:
            adapter = ManagedOssWorkerAdapter(profile)
        else:
            command = profile_external_command(profile)
            adapter = ExternalCliAdapter(Engine.OSS, command)
        output = adapter.run(shot, context)
        threshold = float(shot.metadata.get("source_fidelity_threshold") or 0)
        source = next((item for item in shot.source_assets if item), None)
        if threshold > 0 and source and output.media_path:
            fidelity_error: str | None
            try:
                fidelity = source_fidelity_score(source, output.media_path)
            except (MediaError, OSError, ValueError) as error:
                fidelity = 0.0
                fidelity_error = str(error)
            else:
                fidelity_error = None
            if fidelity < threshold:
                rejected_path = output.media_path
                fallback = FFmpegAdapter().run(shot, context)
                fallback.provenance.update(
                    {
                        "gpu_profile_id": profile.id,
                        "gpu_output_rejected": True,
                        "source_fidelity_score": fidelity,
                        "source_fidelity_threshold": threshold,
                        "source_fidelity_error": fidelity_error,
                    }
                )
                fallback.warnings.append(
                    "GPU motion failed the source-fidelity gate; the identity-safe supplied-photo edit was used."
                )
                if rejected_path and rejected_path != fallback.media_path:
                    Path(rejected_path).unlink(missing_ok=True)
                return fallback
            output.provenance.update(
                {
                    "source_fidelity_score": fidelity,
                    "source_fidelity_threshold": threshold,
                }
            )
        return output.model_copy(
            update={
                "provenance": {
                    **output.provenance,
                    "engine_profile_id": profile.id,
                    "source_url": str(profile.source_url),
                    "revision": profile.revision,
                    "code_license": profile.code_license,
                    "model_license": profile.model_license,
                }
            }
        )
