from video_factory.creative_templates import creative_template, template_catalog_payload
from video_factory.models import ClientBrief
from video_factory.planner import deterministic_plan


def test_catalog_exposes_five_commercial_templates() -> None:
    catalog = template_catalog_payload()
    assert len(catalog) == 5
    assert {item["id"] for item in catalog} == {
        "kinetic-type",
        "product-spotlight",
        "ui-focus",
        "data-proof",
        "social-cta",
    }
    assert creative_template("ui-focus").motion_preset == "minimal"


def test_planner_assigns_varied_templates(example_brief: ClientBrief) -> None:
    manifest = deterministic_plan(example_brief)
    assert manifest.shots[0].template_id == "kinetic-type"
    assert manifest.shots[-1].template_id == "social-cta"
    assert len({shot.template_id for shot in manifest.shots}) >= 2


def test_brief_can_force_one_template(example_brief: ClientBrief) -> None:
    brief = example_brief.model_copy(update={"template_id": "product-spotlight"})
    manifest = deterministic_plan(brief)
    assert {shot.template_id for shot in manifest.shots} == {"product-spotlight"}
