const EVIDENCE_ROLES = new Set(["evidence", "outcome"]);

function clampRatio(value) {
  return Number(Math.max(0, Math.min(1, value)).toFixed(4));
}

function result(id, pass, detail, blocking = true) {
  return { id, pass, detail, category: "narration", blocking };
}

function estimatedSpeechSeconds(segment, language) {
  const explicit = Number(segment.targetDurationSeconds);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const text = String(segment.text ?? "").trim();
  if (language === "ja") {
    const characters = [...text.replace(/[\s\p{P}\p{S}]/gu, "")].length;
    return characters / 4.7;
  }
  const words = text.split(/\s+/).filter(Boolean).length;
  return words / 2.35;
}

export function evaluateLongformNarrationPlan({ blueprint, narrationManifest, narrationState = null }) {
  const scenes = Array.isArray(blueprint?.scenes) ? blueprint.scenes : [];
  const segments = Array.isArray(narrationManifest?.segments) ? narrationManifest.segments : [];
  const sceneIds = new Set(scenes.map((scene) => scene.id));
  const claimIds = new Set(blueprint?.provenance?.claimIds ?? []);
  const plannedSceneIds = new Set(segments.map((segment) => segment.sceneId).filter((id) => sceneIds.has(id)));
  const unknownSceneIds = segments.map((segment) => segment.sceneId).filter((id) => id && !sceneIds.has(id));
  const unknownClaimIds = segments.flatMap((segment) => segment.claimIds ?? []).filter((id) => !claimIds.has(id));
  const unsourcedEvidence = segments.filter((segment) => EVIDENCE_ROLES.has(segment.role)
    && (!(segment.claimIds?.length) || !String(segment.sourceLocator ?? "").trim()));
  const estimatedSeconds = segments.reduce(
    (sum, segment) => sum + estimatedSpeechSeconds(segment, blueprint.language),
    0,
  );
  const targetSeconds = Number(blueprint?.targetDurationSeconds ?? 0);
  const plannedDurationCoverage = targetSeconds > 0 ? clampRatio(estimatedSeconds / targetSeconds) : 0;
  const renderedSpeechSeconds = Number(narrationState?.speechDurationSeconds ?? narrationState?.durationSeconds);
  const renderedDurationCoverage = targetSeconds > 0 && renderedSpeechSeconds > 0
    ? clampRatio(renderedSpeechSeconds / targetSeconds)
    : 0;
  const alignment = narrationState?.alignment;
  const alignedSceneIds = new Set((alignment?.placements ?? []).map((placement) => placement.sceneId));
  const timelineAligned = !narrationState || (alignment?.mode === "scene_aligned"
    && alignedSceneIds.size === scenes.length
    && Number(alignment.durationSeconds) === targetSeconds);
  const sceneCoverage = scenes.length > 0 ? clampRatio(plannedSceneIds.size / scenes.length) : 0;
  const checks = [
    result("narration_scene_mapping", plannedSceneIds.size === scenes.length, `${plannedSceneIds.size}/${scenes.length} scenes mapped`),
    result("narration_unknown_scene_ids", unknownSceneIds.length === 0, `${unknownSceneIds.length} unknown scene IDs`),
    result("narration_known_claim_ids", unknownClaimIds.length === 0, `${unknownClaimIds.length} unknown claim IDs`),
    result("narration_evidence_locators", unsourcedEvidence.length === 0, `${unsourcedEvidence.length} evidence segments without claim + locator`),
    result("narration_planned_duration", plannedDurationCoverage >= 0.68 && plannedDurationCoverage <= 0.9, `${(plannedDurationCoverage * 100).toFixed(1)}% planned speech coverage`),
    result("narration_rendered_duration", renderedDurationCoverage >= 0.68 && renderedDurationCoverage <= 0.95, `${(renderedDurationCoverage * 100).toFixed(1)}% rendered speech coverage`),
    result("narration_scene_timeline_alignment", timelineAligned, timelineAligned ? "rendered narration aligned to every scene" : "rendered narration is not scene-aligned"),
  ];
  const blockers = checks.filter((check) => check.blocking && !check.pass);
  return {
    version: "2026-08-03.1",
    status: blockers.length === 0 ? "pass" : "blocked",
    checks,
    blockers,
    metrics: {
      sceneCoverage,
      plannedDurationCoverage,
      renderedDurationCoverage,
      estimatedSpeechSeconds: Number(estimatedSeconds.toFixed(3)),
      mappedSceneCount: plannedSceneIds.size,
      segmentCount: segments.length,
    },
  };
}
