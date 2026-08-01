from __future__ import annotations

import hashlib
import time
from urllib.parse import urlsplit

import httpx

from ..engine_profiles import EngineProfile
from ..io import write_json
from ..models import Engine, EngineOutput, Shot
from .base import EngineAdapter, EngineContext


class ManagedOssWorkerAdapter(EngineAdapter):
    """Execute a pinned external OSS profile on the authenticated GPU worker."""

    def __init__(self, profile: EngineProfile) -> None:
        self.profile = profile

    @staticmethod
    def _validate_endpoint(base_url: str, environment: str) -> str:
        parsed = urlsplit(base_url)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            raise RuntimeError("Managed OSS worker URL must be an absolute HTTP(S) URL")
        if parsed.username or parsed.password:
            raise RuntimeError("Managed OSS worker URL must not contain credentials")
        if environment == "production" and parsed.scheme != "https":
            raise RuntimeError("Production managed OSS worker URL must use HTTPS")
        return base_url.rstrip("/")

    def run(self, shot: Shot, context: EngineContext) -> EngineOutput:
        started = time.monotonic()
        settings = context.settings
        if not settings.oss_worker_base_url or not settings.oss_worker_api_key:
            raise RuntimeError("Authenticated managed OSS worker is not configured")
        base_url = self._validate_endpoint(
            settings.oss_worker_base_url,
            settings.environment,
        )
        output = self.output_path(shot, context)
        output.parent.mkdir(parents=True, exist_ok=True)
        request_path = (
            context.workspace.assets_generated
            / context.namespace
            / f"{shot.id}-{self.profile.id}-request.json"
        )
        request_payload = {
            "protocol_version": 1,
            "profile_id": self.profile.id,
            "profile_revision": self.profile.revision,
            "shot": shot.model_dump(mode="json"),
            "deliverable": context.deliverable.model_dump(mode="json"),
            "brand": context.manifest.brand.model_dump(mode="json"),
            "rights": context.manifest.rights.model_dump(mode="json"),
        }
        write_json(request_path, request_payload)
        temporary = output.with_suffix(output.suffix + ".part")
        digest = hashlib.sha256()
        received = 0
        headers = {
            "Authorization": f"Bearer {settings.oss_worker_api_key}",
            "X-API-Key": settings.oss_worker_api_key,
        }
        try:
            with (
                httpx.Client(timeout=settings.oss_worker_timeout_seconds) as client,
                client.stream(
                    "POST",
                    f"{base_url}/v1/execute",
                    headers=headers,
                    json=request_payload,
                ) as response,
            ):
                response.raise_for_status()
                content_type = response.headers.get("content-type", "").split(";", 1)[0]
                if content_type != "video/mp4":
                    raise RuntimeError("Managed OSS worker returned a non-MP4 response")
                with temporary.open("wb") as target:
                    for chunk in response.iter_bytes():
                        received += len(chunk)
                        if received > settings.oss_worker_max_output_bytes:
                            raise RuntimeError("Managed OSS worker output exceeded the size limit")
                        digest.update(chunk)
                        target.write(chunk)
            if received == 0:
                raise RuntimeError("Managed OSS worker returned an empty output")
            temporary.replace(output)
        except (httpx.HTTPError, OSError, RuntimeError):
            temporary.unlink(missing_ok=True)
            raise
        return EngineOutput(
            shot_id=shot.id,
            engine=Engine.OSS,
            status="completed",
            media_path=str(output),
            provenance={
                "request": str(request_path),
                "engine_profile_id": self.profile.id,
                "source_url": str(self.profile.source_url),
                "revision": self.profile.revision,
                "code_license": self.profile.code_license,
                "model_license": self.profile.model_license,
                "execution_target": "managed_gpu",
                "output_sha256": digest.hexdigest(),
                "output_bytes": received,
            },
            elapsed_seconds=time.monotonic() - started,
        )
