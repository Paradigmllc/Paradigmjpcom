from __future__ import annotations

from .gpu_lifecycle import run_lifecycle
from .models import ClientBrief, DeliverableSpec, QaReport, ShotManifest
from .operator_events import emit_operator_event
from .settings import Settings


def emit_studio_project_started(
    settings: Settings,
    brief: ClientBrief,
    manifest: ShotManifest,
    *,
    dry_run: bool,
) -> None:
    run_lifecycle(
        emit_operator_event(
            settings,
            event_type="studio_project_created",
            title="Studio案件を制作開始",
            message=f"{manifest.project_name} の商用制作を開始しました。",
            project_id=manifest.project_id,
            state="preview" if dry_run else "production",
            progress=0,
            payload={
                "project_name": manifest.project_name,
                "template_id": manifest.template_id,
                "brand": manifest.brand.model_dump(mode="json"),
                "brief": brief.model_dump(mode="json"),
                "manifest": manifest.model_dump(mode="json"),
            },
        )
    )


def emit_studio_qa_completed(
    settings: Settings,
    manifest: ShotManifest,
    deliverable: DeliverableSpec,
    qa: QaReport,
) -> None:
    run_lifecycle(
        emit_operator_event(
            settings,
            event_type="studio_qa_completed",
            title="Studio品質検査を完了",
            message=f"{deliverable.name}: {'合格' if qa.passed else '要修正'}",
            project_id=manifest.project_id,
            state="passed" if qa.passed else "failed",
            progress=85,
            payload={
                "deliverable_name": deliverable.name,
                "qa": qa.model_dump(mode="json"),
            },
        )
    )
