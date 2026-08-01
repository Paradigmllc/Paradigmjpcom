from __future__ import annotations

from pathlib import Path

from .io import write_model
from .media import create_variant
from .models import CreativeReview, ReviewStage, ShotManifest
from .qa import run_technical_qa
from .review import create_pending_review, require_approved_review
from .settings import Settings
from .state import transition_project_state
from .workspace import ProjectWorkspace


def finalize_project(
    manifest: ShotManifest,
    workspace: ProjectWorkspace,
    settings: Settings,
) -> CreativeReview:
    del settings  # reserved for future dedicated final-render workers
    draft_path = workspace.review / "draft-review.json"
    draft = require_approved_review(draft_path, ReviewStage.DRAFT)

    state_path = workspace.root / "state.json"
    transition_project_state(
        state_path,
        "finalizing",
        expected="draft_approved",
        draft_review_path=str(draft_path),
    )

    final_root = workspace.master / "final"
    final_root.mkdir(parents=True, exist_ok=True)
    final_master_paths: dict[str, str] = {}
    qa_paths: dict[str, str] = {}
    all_qa_passed = True

    for spec in manifest.deliverables:
        source_value = draft.master_paths.get(spec.name)
        if not source_value:
            raise ValueError(f"Draft review has no master for deliverable: {spec.name}")
        source = Path(source_value)
        target = final_root / f"{spec.name}.{spec.format}"
        create_variant(source, target, spec)
        qa = run_technical_qa(target, spec, manifest.duration_seconds)
        qa_path = workspace.qa / f"final-technical-qa-{spec.name}.json"
        write_model(qa_path, qa)
        final_master_paths[spec.name] = str(target)
        qa_paths[spec.name] = str(qa_path)
        all_qa_passed = all_qa_passed and qa.passed

    primary_name = manifest.primary_deliverable.name
    primary_path = Path(final_master_paths[primary_name])
    final_review_path = workspace.review / "final-review.json"
    review = create_pending_review(
        manifest.project_id,
        primary_path,
        all_qa_passed,
        final_review_path,
        stage=ReviewStage.FINAL,
        master_paths=final_master_paths,
    )
    transition_project_state(
        state_path,
        "final_review_required" if all_qa_passed else "qa_failed",
        expected="finalizing",
        draft_review_path=str(draft_path),
        final_review_path=str(final_review_path),
        master_paths=final_master_paths,
        qa_paths=qa_paths,
    )
    if not all_qa_passed:
        raise ValueError("Final technical QA failed")
    return review
