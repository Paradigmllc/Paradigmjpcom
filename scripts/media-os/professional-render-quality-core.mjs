export const PROFESSIONAL_RENDER_GATE_VERSION = "2026-08-03.1";
export const PROFESSIONAL_RENDER_THRESHOLD = 92;

function matches(value, pattern) {
  return [...value.matchAll(pattern)].map((match) => match[1] ?? match[0]);
}

function result(id, pass, detail, category, blocking = true) {
  return { id, pass, detail, category, blocking };
}

function ratio(value) {
  return Number(Math.max(0, Math.min(1, value)).toFixed(4));
}

function mostCommonShare(values) {
  if (values.length === 0) return 1;
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Math.max(...counts.values()) / values.length;
}

function categoryScore(checks, category, weight) {
  const categoryChecks = checks.filter((check) => check.category === category);
  return Math.round((categoryChecks.filter((check) => check.pass).length / categoryChecks.length) * weight);
}

export function evaluateProfessionalRender({ files, manifest, media = null }) {
  const sceneFiles = Object.entries(files)
    .filter(([path]) => /^compositions\/scene-\d+\.html$/.test(path))
    .sort(([left], [right]) => left.localeCompare(right));
  const sceneHtml = sceneFiles.map(([, content]) => content);
  const rootHtml = files["index.html"] ?? "";
  const archetypes = sceneHtml.flatMap((content) => matches(content, /data-scene-archetype="([^"]+)"/g));
  const motionSignatures = sceneHtml.flatMap((content) => matches(content, /data-motion-signature="([^"]+)"/g));
  const visualCounts = sceneHtml.map((content) => matches(content, /data-visual-element=/g).length);
  const visualizationScenes = sceneHtml.filter((content) => /data-visualization-mode="[^"]+"/.test(content) && /data-visual-element="(?:ledger-comparison|mechanism-diagram|verified-timeline|source-document|authority-network|corroboration-ladder|testimony-comparison|counterclaim-balance|evidence-gap|data-reversal|implication-radar|source-matrix|review-manifest|evidence-canvas)"/.test(content)).length;
  const factualScenes = sceneHtml.filter((content) => !content.includes('data-claim-status="editorial"'));
  const sourcedFactualScenes = factualScenes.filter((content) => content.includes("data-source-locator")).length;
  const transitionFamilies = matches(rootHtml, /data-transition-family="([^"]+)"/g);
  const narrationTags = matches(rootHtml, /<audio\b[^>]*data-role="narration"/g).length;
  const captionGroups = matches(rootHtml, /data-caption-group=/g).length;
  const durationCoverage = media?.narrationDurationSeconds && manifest.durationSeconds
    ? ratio(media.narrationDurationSeconds / manifest.durationSeconds)
    : 0;
  const durationCoveragePass = manifest.mode === "full_master"
    ? durationCoverage >= 0.68 && durationCoverage <= 0.95
    : durationCoverage >= 0.92;
  const productionAudioChecks = manifest.mode === "full_master" ? [
    ...(media?.narrationQuality?.checks ?? []).map((check) => ({ ...check, category: "audio" })),
    ...(media?.soundQuality?.checks ?? []).map((check) => ({ ...check, category: "audio" })),
  ] : [];
  const minimumArchetypes = Math.min(8, Math.max(5, Math.ceil(sceneFiles.length * 0.55)));
  const maximumRepeatShare = mostCommonShare(archetypes);
  const checks = [
    result("scene_modules_emitted", sceneFiles.length === manifest.sceneCount, `${sceneFiles.length}/${manifest.sceneCount} scenes`, "visual"),
    result("actual_archetype_diversity", new Set(archetypes).size >= minimumArchetypes, `${new Set(archetypes).size}/${minimumArchetypes} actual archetypes`, "visual"),
    result("template_repetition_cap", maximumRepeatShare <= 0.25, `${(maximumRepeatShare * 100).toFixed(1)}% most-common archetype`, "visual"),
    result("actual_visual_density", visualCounts.every((count) => count >= 8), `minimum ${Math.min(...visualCounts)} actual visual elements`, "visual"),
    result("diagram_or_document_coverage", visualizationScenes / sceneFiles.length >= 0.8, `${visualizationScenes}/${sceneFiles.length} scenes`, "visual"),
    result("motion_signature_diversity", new Set(motionSignatures).size >= Math.ceil(sceneFiles.length * 0.6), `${new Set(motionSignatures).size}/${sceneFiles.length} signatures`, "motion"),
    result("transition_count", transitionFamilies.length === Math.max(0, sceneFiles.length - 1), `${transitionFamilies.length}/${Math.max(0, sceneFiles.length - 1)} boundaries`, "motion"),
    result("transition_family_budget", new Set(transitionFamilies).size >= 2 && new Set(transitionFamilies).size <= 3, `${new Set(transitionFamilies).size} families`, "motion"),
    result("factual_source_locator_coverage", sourcedFactualScenes === factualScenes.length, `${sourcedFactualScenes}/${factualScenes.length} factual scenes`, "evidence"),
    result("narration_track_embedded", narrationTags === 1, `${narrationTags} narration tracks`, "audio"),
    result("narration_duration_coverage", durationCoveragePass, `${(durationCoverage * 100).toFixed(1)}% of master`, "audio"),
    result("caption_groups_embedded", captionGroups >= 1, `${captionGroups} groups`, "audio"),
    result("deterministic_capture_contract", !Object.values(files).some((content) => content.includes("Math.random") || content.includes("Date.now") || content.includes("repeat: -1")), "No nondeterministic capture hazards", "technical"),
    result("no_unresolved_asset_placeholders", !Object.values(files).some((content) => /(?:TODO_ASSET|PLACEHOLDER_MEDIA|src="")/.test(content)), "No unresolved media placeholders", "technical"),
    ...productionAudioChecks,
  ];
  const weights = { visual: 35, motion: 20, evidence: 15, audio: 20, technical: 10 };
  const scores = Object.fromEntries(Object.entries(weights).map(([category, weight]) => [category, categoryScore(checks, category, weight)]));
  const score = Object.values(scores).reduce((sum, value) => sum + value, 0);
  const blockers = checks.filter((check) => check.blocking && !check.pass);
  return {
    version: PROFESSIONAL_RENDER_GATE_VERSION,
    kind: "professional_render",
    episodeId: manifest.episodeId,
    mode: manifest.mode,
    status: blockers.length === 0 && score >= PROFESSIONAL_RENDER_THRESHOLD ? "pass" : "blocked",
    score,
    threshold: PROFESSIONAL_RENDER_THRESHOLD,
    scores,
    checks,
    blockers,
    metrics: {
      sceneCount: sceneFiles.length,
      archetypeCount: new Set(archetypes).size,
      maximumRepeatShare: ratio(maximumRepeatShare),
      motionSignatureCount: new Set(motionSignatures).size,
      transitionFamilies: [...new Set(transitionFamilies)],
      narrationDurationCoverage: durationCoverage,
      narrationPlanStatus: media?.narrationQuality?.status ?? "blocked",
      narrationSceneCoverage: media?.narrationQuality?.metrics?.sceneCoverage ?? 0,
      soundDesignStatus: media?.soundQuality?.status ?? "blocked",
      soundTrackCount: media?.soundQuality?.metrics?.trackCount ?? 0,
      captionGroupCount: captionGroups,
    },
  };
}
