from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from .io import file_sha256, write_model
from .models import CreativeReview, ReviewStage, ReviewStatus


def review_filename(stage: ReviewStage) -> str:
    return f"{stage.value}-review.json"


def create_pending_review(
    project_id: str,
    master_path: Path,
    qa_passed: bool,
    target: Path,
    *,
    stage: ReviewStage,
    master_paths: dict[str, str] | None = None,
    revision: int = 1,
) -> CreativeReview:
    paths = master_paths or {"primary": str(master_path)}
    artifact_sha256 = {
        name: file_sha256(Path(path)) for name, path in paths.items() if Path(path).is_file()
    }
    if len(artifact_sha256) != len(paths):
        missing = sorted(set(paths) - set(artifact_sha256))
        raise ValueError(f"Review artifacts are missing: {', '.join(missing)}")
    review = CreativeReview(
        project_id=project_id,
        stage=stage,
        revision=revision,
        status=ReviewStatus.PENDING,
        master_path=str(master_path),
        master_paths=paths,
        artifact_sha256=artifact_sha256,
        qa_passed=qa_passed,
    )
    write_model(target, review)
    return review


def load_review(path: str | Path) -> CreativeReview:
    return CreativeReview.model_validate_json(Path(path).read_text(encoding="utf-8"))


def verify_review_artifacts(review: CreativeReview) -> None:
    current = {
        name: file_sha256(Path(path))
        for name, path in review.master_paths.items()
        if Path(path).is_file()
    }
    if current != review.artifact_sha256:
        raise ValueError(
            "Review artifacts changed after the approval record was created; "
            "create a new review revision"
        )


def approve_review(
    path: str | Path,
    reviewer: str,
    notes: str | None = None,
    *,
    expected_stage: ReviewStage | None = None,
) -> CreativeReview:
    source = Path(path)
    review = load_review(source)
    if expected_stage is not None and review.stage is not expected_stage:
        raise ValueError(
            f"Expected {expected_stage.value} review, got {review.stage.value}"
        )
    if not review.qa_passed:
        raise ValueError("Creative review cannot be approved while technical QA is failing")
    verify_review_artifacts(review)
    approved = review.model_copy(
        update={
            "status": ReviewStatus.APPROVED,
            "reviewer": reviewer,
            "reviewed_at": datetime.now(UTC).isoformat(),
            "notes": notes,
        }
    )
    write_model(source, approved)
    return approved


def request_changes(
    path: str | Path,
    reviewer: str,
    notes: str,
    *,
    expected_stage: ReviewStage | None = None,
) -> CreativeReview:
    source = Path(path)
    review = load_review(source)
    if expected_stage is not None and review.stage is not expected_stage:
        raise ValueError(
            f"Expected {expected_stage.value} review, got {review.stage.value}"
        )
    changed = review.model_copy(
        update={
            "status": ReviewStatus.CHANGES_REQUESTED,
            "reviewer": reviewer,
            "reviewed_at": datetime.now(UTC).isoformat(),
            "notes": notes,
        }
    )
    write_model(source, changed)
    return changed


def require_approved_review(
    path: str | Path,
    stage: ReviewStage,
) -> CreativeReview:
    review = load_review(path)
    if review.stage is not stage:
        raise ValueError(f"Expected {stage.value} review, got {review.stage.value}")
    if review.status is not ReviewStatus.APPROVED or not review.reviewer:
        raise ValueError(f"{stage.value.title()} approval is required")
    verify_review_artifacts(review)
    return review
