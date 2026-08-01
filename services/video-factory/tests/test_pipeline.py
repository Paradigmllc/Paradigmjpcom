from pathlib import Path

from video_factory.io import load_data
from video_factory.pipeline import _resolve_service_root, production_flow


def test_service_root_uses_explicit_packaged_runtime_path(
    tmp_path: Path, monkeypatch
) -> None:
    root = tmp_path / "installed-video-factory"
    config = root / "config"
    config.mkdir(parents=True)
    (config / "engine-routing.yaml").write_text("rules: {}\n", encoding="utf-8")
    monkeypatch.setenv("VIDEO_FACTORY_ROOT", str(root))

    assert _resolve_service_root() == root.resolve()


def test_dry_run_pipeline_stops_for_draft_review(
    example_brief_path: Path, monkeypatch, tmp_path: Path
) -> None:
    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(tmp_path / "workspace"))
    result = production_flow(str(example_brief_path), dry_run=True)
    assert result.status == "draft_review_required"
    assert Path(result.master_path or "").is_file()
    assert Path(result.qa_path or "").is_file()
    assert Path(result.draft_review_path or "").is_file()
    assert result.final_review_path is None
    assert set(result.master_paths) == {
        "master-en-landscape",
        "social-en-vertical",
        "social-ja-square",
    }
    assert all(Path(path).is_file() for path in result.master_paths.values())
    workspace = Path(result.workspace)
    assert load_data(workspace / "state.json")["status"] == "draft_review_required"
    assert (workspace / "hyperframes/master-en-landscape/master/index.html").is_file()
    assert (workspace / "hyperframes/social-ja-square/master/index.html").is_file()
    master_html = (
        workspace / "hyperframes/master-en-landscape/master/index.html"
    ).read_text(encoding="utf-8")
    assert 'data-start="0.0"' in master_html
    assert "data-no-timeline" in master_html
    assert 'data-has-audio="true"' in master_html


def test_auto_approved_dry_run_builds_variants_after_two_reviews(
    example_brief_path: Path, monkeypatch, tmp_path: Path
) -> None:
    monkeypatch.setenv("VIDEO_FACTORY_WORKSPACE", str(tmp_path / "workspace"))
    result = production_flow(str(example_brief_path), dry_run=True, auto_approve=True)
    assert result.status == "delivered"
    assert Path(result.draft_review_path or "").is_file()
    assert Path(result.final_review_path or "").is_file()
    assert Path(result.delivery_path or "").is_file()
    state = load_data(Path(result.workspace) / "state.json")
    assert state["status"] == "delivered"


def test_dry_run_manifest_scales_deliverables() -> None:
    from video_factory.models import (
        Approver,
        BrandSpec,
        DeliverableSpec,
        LikenessConsent,
        RightsDeclaration,
        ShotManifest,
    )
    from video_factory.pipeline import _dry_run_manifest

    spec = DeliverableSpec(
        name="master-landscape",
        language="en",
        aspect_ratio="16:9",
        width=1920,
        height=1080,
        fps=30,
    )
    manifest = ShotManifest(
        project_id="preview-test",
        project_name="Preview Test",
        brief_sha256="a" * 64,
        duration_seconds=5,
        primary_deliverable=spec,
        deliverables=[spec],
        brand=BrandSpec(
            name="Paradigm",
            primary_color="#0B1020",
            accent_color="#7C5CFC",
        ),
        rights=RightsDeclaration(
            source_assets_cleared=True,
            ai_generation_allowed=True,
            likeness_consent=LikenessConsent.NOT_APPLICABLE,
            voice_consent=LikenessConsent.NOT_APPLICABLE,
            claims_approved_by_client=True,
        ),
        approver=Approver(name="Producer", email="producer@example.com"),
        shots=[
            {
                "id": "shot-001",
                "order": 1,
                "title": "Intro",
                "purpose": "Explain",
                "kind": "text_motion",
                "duration_seconds": 5,
                "language": "en",
            }
        ],
    )

    preview = _dry_run_manifest(manifest)
    assert preview.primary_deliverable.width == 640
    assert preview.primary_deliverable.height == 360
    assert preview.primary_deliverable.fps == 15
    assert preview.deliverables[0] == preview.primary_deliverable
