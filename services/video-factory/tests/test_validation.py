from video_factory.models import ClientBrief, ShotKind
from video_factory.validation import validate_brief


def test_example_brief_is_valid(example_brief: ClientBrief) -> None:
    report = validate_brief(example_brief)
    assert report.valid
    assert any(item.code == "no-source-assets" for item in report.findings)


def test_portrait_requires_likeness_consent(example_brief: ClientBrief) -> None:
    brief = example_brief.model_copy(
        update={"requested_shot_kinds": [ShotKind.PORTRAIT_ANIMATION]}
    )
    report = validate_brief(brief)
    assert not report.valid
    assert any(item.code == "likeness-consent-required" for item in report.findings)


def test_workspace_rejects_path_traversal(tmp_path) -> None:
    import pytest

    from video_factory.workspace import ProjectWorkspace

    with pytest.raises(ValueError, match="safe lowercase slug"):
        ProjectWorkspace.create(tmp_path, "../../escape")
