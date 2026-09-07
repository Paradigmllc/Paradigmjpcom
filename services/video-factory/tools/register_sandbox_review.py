"""Expose existing internal QA media through the authenticated Factory console.

Uses the existing project state / pending-review contract. Never approves a
workflow, client output, technical QA, delivery or publishing. Create-only.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from video_factory.models import ReviewStage
from video_factory.review import create_pending_review
from video_factory.state import initialize_project_state, transition_project_state
from video_factory.workspace import ProjectWorkspace


def register(root: Path, evidence: Path, videos: list[str]) -> None:
    root = root.resolve(strict=True)
    if root.parent.name != "projects" or not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,71}", root.name) or not (
        root.name.startswith("wan-qa-") or root.name.endswith("-internal-qa")
    ):
        raise ValueError("Only named internal QA projects may be imported")
    report = json.loads(evidence.read_text())
    if report.get("human_approved") is not False or not isinstance(report.get("blocking_defects"), list):
        raise ValueError("Explicit unapproved evidence and blocking-defect list required")
    if not videos or len(videos) > 12 or len(set(videos)) != len(videos):
        raise ValueError("Require 1-12 unique existing review videos")
    paths = {}
    for name in videos:
        source = (root / name).resolve(strict=True)
        if not source.is_relative_to(root) or not source.is_file() or source.suffix != ".mp4":
            raise ValueError("Review video must be an MP4 inside this project")
        paths[name] = str(source)
    for reserved in ("state.json", "review/draft-review.json", "internal-qa-evidence.json"):
        if (root / reserved).exists():
            raise FileExistsError(root / reserved)
    # A persistent exclusive marker makes interrupted imports fail closed.
    with (root / ".internal-review-import.lock").open("x") as handle:
        handle.write("create-only internal QA import\n")
    if (root / "state.json").exists():
        raise FileExistsError(root / "state.json")
    # The existing read API initializes these folders too. Prepare all of them
    # before publishing state, including when the importer and web user differ.
    ProjectWorkspace.create(root.parent.parent, root.name)
    report_path = root / "internal-qa-evidence.json"
    with report_path.open("x") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2)
    review_path = root / "review/draft-review.json"
    review_path.parent.mkdir(exist_ok=True)
    create_pending_review(root.name, Path(next(iter(paths.values()))), False, review_path,
                          stage=ReviewStage.DRAFT, master_paths=paths)
    # Publish only the complete final state: console readers must not observe
    # an intermediate production status or a partially written JSON document.
    pending_state_path = root / ".internal-review-state.tmp"
    initialize_project_state(pending_state_path, root.name, purpose="internal_quality_review",
                             production_approved=False)
    target = "qa_failed" if report["blocking_defects"] else "draft_review_required"
    transition_project_state(pending_state_path, target, expected="production",
                             master_paths=paths, qa_paths={"internal_review": str(report_path)},
                             draft_review_path=str(review_path))
    pending_state_path.replace(root / "state.json")
    print(json.dumps({"project_id": root.name, "status": target, "videos": len(paths),
                      "human_approved": False}), flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-root", type=Path, required=True)
    parser.add_argument("--evidence", type=Path, required=True)
    parser.add_argument("--video", action="append", required=True)
    args = parser.parse_args()
    register(args.project_root, args.evidence, args.video)
