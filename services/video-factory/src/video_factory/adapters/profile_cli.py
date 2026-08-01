from __future__ import annotations

from ..engine_profiles import (
    ExecutionTarget,
    load_engine_profile_catalog,
    profile_external_command,
    resolved_execution_target,
)
from ..models import Engine, EngineOutput, Shot
from .base import EngineAdapter, EngineContext
from .external import ExternalCliAdapter
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
