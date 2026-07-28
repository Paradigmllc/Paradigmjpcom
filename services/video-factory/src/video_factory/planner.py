from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path

from .io import model_sha256
from .models import ClientBrief, LocalizationSpec, Shot, ShotKind, ShotManifest
from .settings import Settings
from .workspace import slugify


class PlanningError(RuntimeError):
    pass


_JA_SEGMENT_COPY: dict[str, tuple[str, str]] = {
    "Hook": ("冒頭", "成果を端的に提示します。"),
    "Product": ("プロダクト", "実際の画面または正確な構造モーションで示します。"),
    "Problem": ("課題", "現在の摩擦を概念映像として示します。"),
    "Solution": ("解決策", "サービスの仕組みを正確に説明します。"),
    "Proof": ("根拠", "承認済みの事実だけを使用します。"),
    "CTA": ("次のアクション", "一つの明確な行動を提示します。"),
    "Opening": ("オープニング", "動画の約束を明確にします。"),
    "Context": ("背景", "課題の背景を短く整理します。"),
    "Workflow": ("ワークフロー", "実際の流れを画面または図解で示します。"),
    "Demonstration": ("デモ", "支給素材または実画面で示します。"),
    "Summary": ("まとめ", "価値を一文で整理します。"),
}


def _localized_shots(
    source: list[Shot], language: str, localization: LocalizationSpec
) -> list[Shot]:
    normalized = language.split("-")[0]
    localized: list[Shot] = []
    for index, shot in enumerate(source):
        override = localization.segment_overrides.get(
            shot.id
        ) or localization.segment_overrides.get(
            shot.title
        )
        default_title, default_body = (
            _JA_SEGMENT_COPY.get(shot.title, (shot.title, shot.body))
            if normalized == "ja"
            else (shot.title, shot.body)
        )
        if index == 0:
            headline = localization.objective
        elif index == len(source) - 1:
            headline = localization.cta
        else:
            headline = override.headline if override and override.headline else default_title
        body = override.body if override and override.body else default_body
        localized.append(
            shot.model_copy(
                deep=True,
                update={
                    "title": default_title,
                    "language": language,
                    "headline": headline[:500],
                    "body": body[:2000],
                },
            )
        )
    return localized


def _narrative_segments(duration: float) -> list[tuple[str, float, ShotKind, str, str]]:
    if duration <= 15:
        weights = [
            (
                "Hook",
                0.28,
                ShotKind.TEXT_MOTION,
                "Name the urgent outcome",
                "A clear, immediate promise.",
            ),
            (
                "Product",
                0.47,
                ShotKind.UI_CAPTURE,
                "Show the product or workflow",
                "Use exact UI or structured motion.",
            ),
            (
                "CTA",
                0.25,
                ShotKind.TEXT_MOTION,
                "State the next action",
                "One direct call to action.",
            ),
        ]
    elif duration <= 45:
        weights = [
            (
                "Hook",
                0.16,
                ShotKind.TEXT_MOTION,
                "Stop the scroll",
                "Lead with the business outcome.",
            ),
            (
                "Problem",
                0.20,
                ShotKind.GENERATIVE,
                "Visualize the current friction",
                "Keep it conceptual, not evidentiary.",
            ),
            (
                "Solution",
                0.30,
                ShotKind.UI_CAPTURE,
                "Show how the service works",
                "Use exact UI where product behavior is claimed.",
            ),
            (
                "Proof",
                0.19,
                ShotKind.CHART,
                "Make the operating value concrete",
                "Use approved facts only.",
            ),
            (
                "CTA",
                0.15,
                ShotKind.TEXT_MOTION,
                "Give one next step",
                "Keep the final frame readable.",
            ),
        ]
    else:
        weights = [
            (
                "Opening",
                0.10,
                ShotKind.TEXT_MOTION,
                "Establish the promise",
                "High-clarity opening.",
            ),
            ("Context", 0.16, ShotKind.GENERATIVE, "Frame the problem", "Conceptual B-roll only."),
            (
                "Workflow",
                0.24,
                ShotKind.UI_CAPTURE,
                "Show the operating flow",
                "Use real UI or structured diagrams.",
            ),
            (
                "Demonstration",
                0.22,
                ShotKind.SUPPLIED_EDIT,
                "Demonstrate the product",
                "Prefer supplied or captured evidence.",
            ),
            ("Proof", 0.14, ShotKind.CHART, "Present approved proof", "No invented metrics."),
            ("Summary", 0.08, ShotKind.TEXT_MOTION, "Summarize the value", "One sentence."),
            ("CTA", 0.06, ShotKind.TEXT_MOTION, "Ask for the next action", "One clear CTA."),
        ]

    raw = [round(duration * item[1], 3) for item in weights]
    raw[-1] = round(duration - sum(raw[:-1]), 3)
    return [
        (title, seconds, kind, purpose, body)
        for (title, _weight, kind, purpose, body), seconds in zip(weights, raw, strict=True)
    ]


def deterministic_plan(brief: ClientBrief) -> ShotManifest:
    project_id = slugify(brief.project_name)
    primary = brief.deliverables[0]
    language = primary.language
    segments = _narrative_segments(brief.duration_seconds)
    shots: list[Shot] = []

    for index, (title, duration, kind, purpose, body) in enumerate(segments, start=1):
        if brief.requested_shot_kinds:
            requested_index = min(index - 1, len(brief.requested_shot_kinds) - 1)
            kind = brief.requested_shot_kinds[requested_index]
        shots.append(
            Shot(
                id=f"shot-{index:03d}",
                order=index,
                title=title,
                purpose=purpose,
                kind=kind,
                duration_seconds=duration,
                language=language,
                headline=(brief.objective if index == 1 else title)[:180],
                body=body,
                source_assets=brief.source_assets,
                metadata={
                    "platforms": brief.platforms,
                    "reference_urls": brief.reference_urls,
                    **(
                        {"comfyui_workflow_id": "abstract-broll-t2v"}
                        if kind is ShotKind.GENERATIVE
                        else {}
                    ),
                },
            )
        )

    localized_shots = {
        language: _localized_shots(shots, language, localization)
        for language, localization in brief.localizations.items()
        if language.split("-")[0] != primary.language.split("-")[0]
    }

    return ShotManifest(
        project_id=project_id,
        project_name=brief.project_name,
        brief_sha256=model_sha256(brief),
        duration_seconds=brief.duration_seconds,
        primary_deliverable=primary,
        deliverables=brief.deliverables,
        brand=brief.brand,
        rights=brief.rights,
        approver=brief.approver,
        shots=shots,
        localized_shots=localized_shots,
    )


def external_plan(brief: ClientBrief, settings: Settings) -> ShotManifest:
    if not settings.planner_command:
        raise PlanningError("VIDEO_FACTORY_PLANNER_COMMAND is not configured")

    with tempfile.TemporaryDirectory(prefix="video-factory-planner-") as directory:
        root = Path(directory)
        brief_path = root / "brief.json"
        output_path = root / "manifest.json"
        schema_path = root / "shot-manifest.schema.json"
        brief_path.write_text(brief.model_dump_json(indent=2), encoding="utf-8")
        schema_path.write_text(
            json.dumps(ShotManifest.model_json_schema(), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        command = [
            *settings.planner_command,
            "--brief",
            str(brief_path),
            "--schema",
            str(schema_path),
            "--output",
            str(output_path),
        ]
        completed = subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
            timeout=settings.external_timeout_seconds,
        )
        if completed.returncode != 0:
            raise PlanningError(
                f"External planner failed ({completed.returncode}): {completed.stderr[-2000:]}"
            )
        if not output_path.exists():
            raise PlanningError("External planner did not create the requested manifest")
        return ShotManifest.model_validate_json(output_path.read_text(encoding="utf-8"))


def plan_brief(
    brief: ClientBrief,
    settings: Settings,
    provider: str = "deterministic",
) -> ShotManifest:
    if provider == "external":
        return external_plan(brief, settings)
    if provider != "deterministic":
        raise PlanningError(f"Unsupported planner provider: {provider}")
    return deterministic_plan(brief)
