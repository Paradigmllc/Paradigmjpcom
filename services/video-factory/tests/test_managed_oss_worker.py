from __future__ import annotations

import base64
import hashlib
import sys
from pathlib import Path

import pytest
import yaml
from fastapi.testclient import TestClient

import video_factory.engine_worker_api as engine_worker_api
from video_factory.engine_worker_api import WorkerRequest, _materialize_source_assets, app
from video_factory.gpu_lifecycle import _assert_worker_profiles
from video_factory.models import ClientBrief, MediaProbe, ShotKind
from video_factory.planner import deterministic_plan


def _approved_framepack_catalog(service_root: Path, target: Path) -> str:
    source = yaml.safe_load(
        (service_root / "config" / "engine-profiles.yaml").read_text(encoding="utf-8")
    )
    framepack = next(item for item in source["profiles"] if item["id"] == "framepack")
    framepack.update(
        approval="approved",
        commercial_policy="allowed",
        reviewed_by="Automated worker contract test",
        reviewed_at="2026-08-01T00:00:00Z",
        block_reason=None,
    )
    target.write_text(yaml.safe_dump(source, sort_keys=False), encoding="utf-8")
    return str(framepack["revision"])


def _worker_script(path: Path) -> None:
    path.write_text(
        """from __future__ import annotations
import argparse
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--request', required=True)
parser.add_argument('--output', required=True)
args = parser.parse_args()
Path(args.output).write_bytes(b'worker-mp4-fixture' * 100)
""",
        encoding="utf-8",
    )


def test_worker_requires_auth_and_streams_validated_mp4(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    service_root: Path,
    example_brief: ClientBrief,
) -> None:
    catalog_path = tmp_path / "engine-profiles.yaml"
    revision = _approved_framepack_catalog(service_root, catalog_path)
    script_path = tmp_path / "worker.py"
    _worker_script(script_path)
    secret = "worker-secret-" + "x" * 32
    monkeypatch.setenv("VIDEO_FACTORY_OSS_WORKER_API_KEY", secret)
    monkeypatch.setenv("VIDEO_FACTORY_ENGINE_PROFILE_CATALOG", str(catalog_path))
    monkeypatch.setenv("FRAMEPACK_ADAPTER_COMMAND", f"{sys.executable} {script_path}")
    monkeypatch.setattr(
        engine_worker_api,
        "probe_media",
        lambda path: MediaProbe(
            path=str(path),
            duration_seconds=1,
            width=320,
            height=240,
            fps=15,
            has_audio=False,
            codec="h264",
        ),
    )

    manifest = deterministic_plan(example_brief)
    shot = manifest.shots[0].model_copy(update={"kind": ShotKind.GENERATIVE})
    request = {
        "protocol_version": 1,
        "profile_id": "framepack",
        "profile_revision": revision,
        "shot": shot.model_dump(mode="json"),
        "deliverable": manifest.primary_deliverable.model_dump(mode="json"),
        "brand": manifest.brand.model_dump(mode="json"),
        "rights": manifest.rights.model_dump(mode="json"),
    }

    client = TestClient(app)
    assert client.get("/v1/health").status_code == 401
    health = client.get("/v1/health", headers={"X-API-Key": secret})
    assert health.status_code == 200
    installed = next(item for item in health.json()["profiles"] if item["id"] == "framepack")
    assert installed["command_configured"] is True
    assert installed["executable_available"] is True

    response = client.post(
        "/v1/execute",
        headers={"Authorization": f"Bearer {secret}"},
        json=request,
    )

    assert response.status_code == 200, response.text
    assert response.headers["content-type"].startswith("video/mp4")
    assert response.headers["x-video-factory-profile"] == "framepack"
    assert response.headers["x-video-factory-revision"] == revision
    assert len(response.headers["x-video-factory-sha256"]) == 64
    assert len(response.content) > 1_000


def test_gpu_preflight_requires_exact_profile_revision() -> None:
    revision = "a" * 40
    payload = {
        "profiles": [
            {
                "id": "framepack",
                "revision": revision,
                "command_configured": True,
                "executable_available": True,
            }
        ]
    }

    _assert_worker_profiles(payload, (("framepack", revision),))
    with pytest.raises(ValueError, match="missing exact approved installations"):
        _assert_worker_profiles(payload, (("framepack", "b" * 40),))


def test_protocol_v2_materializes_and_verifies_private_source_assets(
    tmp_path: Path,
    example_brief: ClientBrief,
) -> None:
    manifest = deterministic_plan(example_brief)
    source = b"private-pet-image-fixture"
    shot = manifest.shots[0].model_copy(
        update={"kind": ShotKind.GENERATIVE, "source_assets": ["control-plane-only.image"]}
    )
    request = WorkerRequest.model_validate(
        {
            "protocol_version": 2,
            "profile_id": "framepack",
            "profile_revision": "a" * 40,
            "shot": shot.model_dump(mode="json"),
            "deliverable": manifest.primary_deliverable.model_dump(mode="json"),
            "brand": manifest.brand.model_dump(mode="json"),
            "rights": manifest.rights.model_dump(mode="json"),
            "source_assets": [
                {
                    "name": "pet.image",
                    "content_type": "image/jpeg",
                    "sha256": hashlib.sha256(source).hexdigest(),
                    "data_base64": base64.b64encode(source).decode("ascii"),
                }
            ],
        }
    )

    materialized = _materialize_source_assets(request, tmp_path)
    assert materialized.source_assets == []
    assert len(materialized.shot.source_assets) == 1
    assert Path(materialized.shot.source_assets[0]).read_bytes() == source
