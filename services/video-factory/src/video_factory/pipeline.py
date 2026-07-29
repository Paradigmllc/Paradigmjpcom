from __future__ import annotations

from pathlib import Path

from .adapters.base import EngineContext
from .adapters.registry import AdapterRegistry
from .compositor import compose_master
from .delivery import deliver_project
from .finalization import finalize_project
from .io import load_brief, write_json, write_model
from .models import (
    ClientBrief,
    DeliverableSpec,
    PipelineResult,
    ReviewStage,
    ReviewStatus,
    ShotManifest,
    ValidationReport,
)
from .orchestration import flow, task
from .planner import plan_brief
from .qa import run_technical_qa
from .review import approve_review, create_pending_review
from .router import route_manifest
from .settings import Settings
from .state import initialize_project_state, transition_project_state
from .validation import validate_brief
from .workspace import ProjectWorkspace

SERVICE_ROOT = Path(__file__).resolve().parents[2]


def _dry_run_spec(spec: DeliverableSpec, *, max_dimension: int = 640) -> DeliverableSpec:
    largest = max(spec.width, spec.height)
    if largest <= max_dimension and spec.fps <= 15:
        return spec
    scale = min(1.0, max_dimension / largest)
    width = max(320, int(round(spec.width * scale / 2) * 2))
    height = max(320, int(round(spec.height * scale / 2) * 2))
    return spec.model_copy(update={"width": width, "height": height, "fps": 15})


def _dry_run_manifest(manifest: ShotManifest) -> ShotManifest:
    deliverables = [_dry_run_spec(item) for item in manifest.deliverables]
    primary_name = manifest.primary_deliverable.name
    primary = next(item for item in deliverables if item.name == primary_name)
    return manifest.model_copy(
        update={"primary_deliverable": primary, "deliverables": deliverables}
    )


@task(retries=0)
def validate_task(brief_path: str) -> tuple[ClientBrief, ValidationReport]:
    brief = load_brief(brief_path)
    report = validate_brief(brief)
    if not report.valid:
        messages = "; ".join(item.message for item in report.findings)
        raise ValueError(f"Brief validation failed: {messages}")
    return brief, report


@task(retries=0)
def plan_task(brief: ClientBrief, settings: Settings, provider: str) -> ShotManifest:
    return plan_brief(brief, settings, provider=provider)


@task(retries=0)
def route_task(
    manifest: ShotManifest, settings: Settings, dry_run: bool
) -> ShotManifest:
    return route_manifest(
        manifest,
        settings,
        SERVICE_ROOT / "config" / "engine-routing.yaml",
        dry_run=dry_run,
    )


@flow(name="paradigm-video-production", log_prints=True)
def production_flow(
    brief_path: str,
    dry_run: bool = False,
    planner_provider: str = "deterministic",
    auto_approve: bool = False,
    reviewer: str = "Automated test fixture",
    delivery_target: str = "local",
) -> PipelineResult:
    settings = Settings.from_env()
    brief, validation_report = validate_task(brief_path)
    manifest = plan_task(brief, settings, planner_provider)
    manifest = route_task(manifest, settings, dry_run)
    if dry_run:
        manifest = _dry_run_manifest(manifest)
    workspace = ProjectWorkspace.create(settings.workspace, manifest.project_id)

    write_model(workspace.root / "brief.json", brief)
    write_model(workspace.root / "validation.json", validation_report)
    manifest_path = write_model(workspace.root / "shot-manifest.json", manifest)
    state_path = workspace.root / "state.json"
    initialize_project_state(
        state_path,
        manifest.project_id,
        dry_run=dry_run,
    )

    registry = AdapterRegistry(settings, SERVICE_ROOT)
    outputs_by_deliverable: dict[str, list[dict[str, object]]] = {}
    master_paths: dict[str, str] = {}
    qa_paths: dict[str, str] = {}
    all_qa_passed = True

    for deliverable in manifest.deliverables:
        language = deliverable.language.split("-")[0]
        shots = manifest.shots_for_language(language)
        context = EngineContext(
            settings=settings,
            workspace=workspace,
            manifest=manifest,
            deliverable=deliverable,
            dry_run=dry_run,
            namespace=deliverable.name,
        )
        outputs = []
        for shot in shots:
            if shot.engine is None:
                raise RuntimeError(
                    f"Shot was not routed: {deliverable.name}/{shot.id}"
                )
            outputs.append(registry.get(shot.engine).run(shot, context))
        outputs_by_deliverable[deliverable.name] = [
            output.model_dump(mode="json") for output in outputs
        ]

        paths = [Path(output.media_path) for output in outputs if output.media_path]
        if len(paths) != len(shots):
            raise RuntimeError(
                "At least one engine did not return a media path for "
                f"{deliverable.name}"
            )
        is_primary = deliverable.name == manifest.primary_deliverable.name
        master_path = (
            workspace.master / "master.mp4"
            if is_primary
            else workspace.master / f"{deliverable.name}.mp4"
        )
        compose_master(
            clips=paths,
            durations=[shot.duration_seconds for shot in shots],
            output=master_path,
            manifest=manifest,
            deliverable=deliverable,
            workspace=workspace,
            namespace=deliverable.name,
            settings=settings,
            service_root=SERVICE_ROOT,
            dry_run=dry_run,
        )
        qa = run_technical_qa(master_path, deliverable, manifest.duration_seconds)
        qa_path = (
            workspace.qa / "technical-qa.json"
            if is_primary
            else workspace.qa / f"technical-qa-{deliverable.name}.json"
        )
        write_model(qa_path, qa)
        master_paths[deliverable.name] = str(master_path)
        qa_paths[deliverable.name] = str(qa_path)
        all_qa_passed = all_qa_passed and qa.passed

    write_json(workspace.root / "engine-outputs.json", outputs_by_deliverable)
    write_json(workspace.qa / "index.json", qa_paths)

    primary_name = manifest.primary_deliverable.name
    primary_master_path = Path(master_paths[primary_name])
    primary_qa_path = Path(qa_paths[primary_name])
    if not all_qa_passed:
        transition_project_state(
            state_path,
            "qa_failed",
            expected="production",
            master_paths=master_paths,
            qa_paths=qa_paths,
        )
        return PipelineResult(
            project_id=manifest.project_id,
            status="failed",
            workspace=str(workspace.root),
            manifest_path=str(manifest_path),
            master_path=str(primary_master_path),
            master_paths=master_paths,
            qa_path=str(primary_qa_path),
        )

    draft_review_path = workspace.review / "draft-review.json"
    create_pending_review(
        manifest.project_id,
        primary_master_path,
        all_qa_passed,
        draft_review_path,
        stage=ReviewStage.DRAFT,
        master_paths=master_paths,
    )
    transition_project_state(
        state_path,
        "draft_review_required",
        expected="production",
        draft_review_path=str(draft_review_path),
        master_paths=master_paths,
        qa_paths=qa_paths,
    )
    if not auto_approve:
        return PipelineResult(
            project_id=manifest.project_id,
            status="draft_review_required",
            workspace=str(workspace.root),
            manifest_path=str(manifest_path),
            master_path=str(primary_master_path),
            master_paths=master_paths,
            qa_path=str(primary_qa_path),
            review_path=str(draft_review_path),
            draft_review_path=str(draft_review_path),
            warnings=[
                "Draft approval is required before finalization; final approval is required before delivery."
            ],
        )

    if not dry_run:
        raise ValueError("auto_approve is restricted to dry-run/test executions")
    draft_approved = approve_review(
        draft_review_path,
        reviewer,
        "Dry-run fixture draft approval",
        expected_stage=ReviewStage.DRAFT,
    )
    if draft_approved.status is not ReviewStatus.APPROVED:
        raise RuntimeError("Draft approval failed")
    transition_project_state(
        state_path,
        "draft_approved",
        expected="draft_review_required",
    )
    final_review = finalize_project(manifest, workspace, settings)
    final_review_path = workspace.review / "final-review.json"
    final_approved = approve_review(
        final_review_path,
        reviewer,
        "Dry-run fixture final approval",
        expected_stage=ReviewStage.FINAL,
    )
    if final_approved.status is not ReviewStatus.APPROVED:
        raise RuntimeError("Final approval failed")
    transition_project_state(
        state_path,
        "final_approved",
        expected="final_review_required",
    )
    delivery = deliver_project(manifest, workspace, settings, target=delivery_target)
    delivery_path = workspace.deliverables / "delivery.json"
    return PipelineResult(
        project_id=manifest.project_id,
        status="delivered",
        workspace=str(workspace.root),
        manifest_path=str(manifest_path),
        master_path=final_review.master_path,
        master_paths=final_review.master_paths,
        qa_path=str(primary_qa_path),
        review_path=str(final_review_path),
        draft_review_path=str(draft_review_path),
        final_review_path=str(final_review_path),
        delivery_path=str(delivery_path),
        warnings=[f"Delivered {len(delivery.items)} dry-run variants after two approvals."],
    )
