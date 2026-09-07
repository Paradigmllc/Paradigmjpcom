"""Compile authored chapters, never stretch generic copy to manufacture duration."""

from __future__ import annotations

from .creative_templates import template_for_shot
from .io import model_sha256
from .models import ClientBrief, Shot, ShotKind, ShotManifest
from .workspace import slugify


def editorial_plan(brief: ClientBrief) -> ShotManifest:
    shots: list[Shot] = []
    chapters: list[dict[str, object]] = []
    cursor = 0.0
    total = sum(len(chapter.shots) for chapter in brief.chapters)
    for chapter in brief.chapters:
        chapter_start = cursor
        chapter_shots: list[str] = []
        for authored in chapter.shots:
            index = len(shots) + 1
            shot_id = f"shot-{index:03d}"
            end = round(cursor + authored.duration_seconds, 6)
            metadata: dict[str, object] = {
                "chapter_id": chapter.id, "chapter_title": chapter.title,
                "timeline_start_seconds": cursor, "timeline_end_seconds": end,
                "prompt": authored.visual_direction,
                "narration": authored.narration, "narration_path": authored.narration_path,
                "visual_points": authored.visual_points, "editorial": True,
                "reference_urls": brief.reference_urls,
            }
            if authored.kind is ShotKind.GENERATIVE:
                metadata["comfyui_workflow_id"] = authored.workflow_id or "abstract-broll-t2v"
            if authored.kind in brief.engine_profile_overrides:
                metadata["engine_profile_id"] = brief.engine_profile_overrides[authored.kind]
            shots.append(Shot(
                id=shot_id, order=index, title=authored.title,
                purpose=authored.visual_direction[:1000], kind=authored.kind,
                duration_seconds=authored.duration_seconds,
                language=brief.deliverables[0].language,
                headline=authored.headline, body=authored.body,
                source_assets=authored.source_assets,
                template_id=brief.template_id if brief.template_id != "auto" else
                template_for_shot(authored.kind, order=index, total=total),
                metadata=metadata,
            ))
            chapter_shots.append(shot_id)
            cursor = end
        chapters.append({"id": chapter.id, "title": chapter.title,
                         "start_seconds": chapter_start, "end_seconds": cursor,
                         "shot_ids": chapter_shots})
    return ShotManifest(
        project_id=slugify(brief.project_name), project_name=brief.project_name,
        brief_sha256=model_sha256(brief), duration_seconds=brief.duration_seconds,
        primary_deliverable=brief.deliverables[0], deliverables=brief.deliverables,
        brand=brief.brand, template_id=brief.template_id, audio=brief.audio,
        rights=brief.rights, approver=brief.approver, shots=shots,
        metadata={"planning_mode": "authored_chapters", "chapters": chapters},
    )
