from __future__ import annotations

from dataclasses import asdict, dataclass

from .models import CreativeTemplateId, ShotKind


@dataclass(frozen=True)
class CreativeTemplate:
    id: CreativeTemplateId
    display_name: str
    description: str
    category: str
    supported_shot_kinds: tuple[ShotKind, ...]
    motion_preset: str

    def as_dict(self) -> dict[str, object]:
        payload = asdict(self)
        payload["supported_shot_kinds"] = [item.value for item in self.supported_shot_kinds]
        return payload


TEMPLATES = (
    CreativeTemplate(
        id="kinetic-type",
        display_name="Kinetic Type",
        description="強いコピーと大胆なタイポグラフィでスクロールを止める構成。",
        category="social",
        supported_shot_kinds=(ShotKind.TEXT_MOTION, ShotKind.TRANSITION),
        motion_preset="energetic",
    ),
    CreativeTemplate(
        id="product-spotlight",
        display_name="Product Spotlight",
        description="商品・サービス名と価値を左右非対称レイアウトで見せる構成。",
        category="brand",
        supported_shot_kinds=(
            ShotKind.TEXT_MOTION,
            ShotKind.SUPPLIED_EDIT,
            ShotKind.GENERATIVE,
        ),
        motion_preset="confident",
    ),
    CreativeTemplate(
        id="ui-focus",
        display_name="UI Focus",
        description="実画面や操作フローをデバイスフレームと注釈で見せる構成。",
        category="product",
        supported_shot_kinds=(ShotKind.UI_CAPTURE, ShotKind.TECHNICAL_DIAGRAM),
        motion_preset="minimal",
    ),
    CreativeTemplate(
        id="data-proof",
        display_name="Data Proof",
        description="承認済みの数値・根拠・比較を大きく読みやすく示す構成。",
        category="proof",
        supported_shot_kinds=(ShotKind.CHART, ShotKind.TECHNICAL_DIAGRAM),
        motion_preset="editorial",
    ),
    CreativeTemplate(
        id="social-cta",
        display_name="Social CTA",
        description="短尺広告の終端で一つの行動を明快に促す構成。",
        category="social",
        supported_shot_kinds=(ShotKind.TEXT_MOTION, ShotKind.TRANSITION),
        motion_preset="confident",
    ),
)

_BY_ID: dict[str, CreativeTemplate] = {item.id: item for item in TEMPLATES}


def creative_template(template_id: str) -> CreativeTemplate:
    try:
        return _BY_ID[template_id]
    except KeyError as error:
        raise ValueError(f"Unknown creative template: {template_id}") from error


def template_for_shot(kind: ShotKind, *, order: int, total: int) -> CreativeTemplateId:
    if order == total:
        return "social-cta"
    mapping: dict[ShotKind, CreativeTemplateId] = {
        ShotKind.TEXT_MOTION: "kinetic-type",
        ShotKind.UI_CAPTURE: "ui-focus",
        ShotKind.CHART: "data-proof",
        ShotKind.TECHNICAL_DIAGRAM: "data-proof",
        ShotKind.SUPPLIED_EDIT: "product-spotlight",
        ShotKind.GENERATIVE: "product-spotlight",
    }
    return mapping.get(kind, "product-spotlight")


def template_catalog_payload() -> list[dict[str, object]]:
    return [item.as_dict() for item in TEMPLATES]
