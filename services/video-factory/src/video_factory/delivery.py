from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from .commands import run_command
from .frameio import upload_frameio_file
from .io import file_sha256, write_model
from .media import create_variant
from .models import DeliveryItem, DeliveryRecord, ReviewStage, ShotManifest
from .review import require_approved_review
from .settings import Settings
from .state import transition_project_state
from .workspace import ProjectWorkspace


def build_variants(
    manifest: ShotManifest,
    master_path: Path,
    workspace: ProjectWorkspace,
    master_paths: dict[str, str] | None = None,
) -> list[DeliveryItem]:
    items: list[DeliveryItem] = []
    sources = master_paths or {}
    for spec in manifest.deliverables:
        language = spec.language.split("-")[0]
        source = Path(sources.get(spec.name) or sources.get(language) or str(master_path))
        output = workspace.deliverables / f"{spec.name}.{spec.format}"
        create_variant(source, output, spec)
        items.append(
            DeliveryItem(name=spec.name, local_path=str(output), sha256=file_sha256(output))
        )
    return items


def deliver_project(
    manifest: ShotManifest,
    workspace: ProjectWorkspace,
    settings: Settings,
    *,
    target: str = "local",
) -> DeliveryRecord:
    review_path = workspace.review / "final-review.json"
    review = require_approved_review(review_path, ReviewStage.FINAL)
    master_path = Path(review.master_path)
    items = build_variants(manifest, master_path, workspace, master_paths=review.master_paths)

    if target == "frameio":
        if not settings.frameio_access_token or not settings.frameio_create_file_url:
            raise ValueError("Frame.io delivery is not configured")
        items = [
            item.model_copy(
                update={
                    "remote_uri": upload_frameio_file(
                        Path(item.local_path),
                        access_token=settings.frameio_access_token,
                        create_file_url=settings.frameio_create_file_url,
                        api_base_url=settings.frameio_api_base_url,
                        timeout_seconds=settings.frameio_timeout_seconds,
                    )
                }
            )
            for item in items
        ]
    elif target == "rclone":
        if not settings.rclone_remote:
            raise ValueError("RCLONE_REMOTE is not configured")
        destination = f"{settings.rclone_remote}:{settings.rclone_base_path}/{manifest.project_id}"
        run_command(
            ["rclone", "copy", str(workspace.deliverables), destination, "--checksum"],
            timeout=settings.external_timeout_seconds,
        )
        items = [
            item.model_copy(update={"remote_uri": f"{destination}/{Path(item.local_path).name}"})
            for item in items
        ]
    elif target != "local":
        raise ValueError(f"Unsupported delivery target: {target}")

    if not review.reviewer:
        raise ValueError("Final approval reviewer is missing")
    record = DeliveryRecord(
        project_id=manifest.project_id,
        delivered_at=datetime.now(UTC).isoformat(),
        target=target,
        items=items,
        reviewer=review.reviewer,
    )
    write_model(workspace.deliverables / "delivery.json", record)
    transition_project_state(
        workspace.root / "state.json",
        "delivered",
        expected="final_approved",
        delivery_path=str(workspace.deliverables / "delivery.json"),
    )
    return record
