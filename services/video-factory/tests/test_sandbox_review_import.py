import json
import runpy

import pytest

from video_factory.console_api import _project_summary
from video_factory.models import ReviewStatus
from video_factory.review import load_review, verify_review_artifacts


def setup_case(service_root, tmp_path, defects=None):
    register = runpy.run_path(str(service_root / "tools/register_sandbox_review.py"))["register"]
    root = tmp_path / "projects/fixture-internal-qa"
    root.mkdir(parents=True)
    (root / "review.mp4").write_bytes(b"fixture media, never rendered")
    report = tmp_path / "evidence.json"
    report.write_text(json.dumps({"human_approved": False, "blocking_defects": defects or []}))
    return register, root, report


@pytest.mark.parametrize("defects,status", [([], "draft_review_required"), (["unintended person"], "qa_failed")])
def test_existing_console_lists_unapproved_review(service_root, tmp_path, defects, status):
    register, root, report = setup_case(service_root, tmp_path, defects)
    register(root, report, ["review.mp4"])
    summary = _project_summary(root)
    assert summary["status"] == status
    assert summary["preview"]["name"] == "review.mp4"
    review = load_review(root / "review/draft-review.json")
    assert review.status == ReviewStatus.PENDING
    assert review.qa_passed is False
    assert review.reviewer is None
    for folder in ("assets/input", "assets/generated", "scenes/raw", "scenes/normalized", "qa", "deliverables"):
        assert (root / folder).is_dir()
    verify_review_artifacts(review)
    with pytest.raises(FileExistsError):
        register(root, report, ["review.mp4"])


def test_import_rejects_external_video_and_production_project(service_root, tmp_path):
    register, root, report = setup_case(service_root, tmp_path)
    (root.parent / "external.mp4").write_bytes(b"external")
    with pytest.raises(ValueError, match="inside"):
        register(root, report, ["../external.mp4"])
    production = tmp_path / "client-project"
    production.mkdir()
    with pytest.raises(ValueError, match="internal"):
        register(production, report, ["review.mp4"])
    assert not (root / "state.json").exists()


def test_import_rejects_claimed_approval(service_root, tmp_path):
    register, root, report = setup_case(service_root, tmp_path)
    report.write_text(json.dumps({"human_approved": True, "blocking_defects": []}))
    with pytest.raises(ValueError, match="unapproved"):
        register(root, report, ["review.mp4"])
