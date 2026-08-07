import { jaccardSimilarity } from "./editorial-blueprint-core.mjs";

export const QUALITY_GATE_VERSION = "2026-08-02.1";

const FACTUAL_EXEMPT_BEATS = new Set(["hook", "outro", "method", "silence", "implications", "lessons"]);

function result(id, pass, detail, blocking = true) {
  return { id, pass, detail, blocking };
}

function uniqueRatio(values) {
  return values.length === 0 ? 0 : new Set(values).size / values.length;
}

export function evaluateEditorialBlueprint(blueprint, peers = []) {
  const scenes = blueprint.scenes;
  const factualScenes = scenes.filter((scene) => !FACTUAL_EXEMPT_BEATS.has(scene.beat));
  const evidenceScenes = scenes.filter((scene) => scene.claimIds.length > 0 && scene.sourceLocator);
  const usedClaimIds = new Set(scenes.flatMap((scene) => scene.claimIds));
  const declaredClaimIds = new Set(blueprint.provenance.claimIds);
  const peerScores = peers
    .filter((peer) => peer.episodeId !== blueprint.episodeId)
    .map((peer) => ({ episodeId: peer.episodeId, channelId: peer.channelId, similarity: jaccardSimilarity(blueprint, peer) }))
    .sort((a, b) => b.similarity - a.similarity);
  const nearestPeer = peerScores[0] ?? null;
  const consecutiveBeatViolation = scenes.some((scene, index) => index >= 2 && scene.beat === scenes[index - 1].beat && scene.beat === scenes[index - 2].beat);
  const forbiddenText = JSON.stringify({ narrative: blueprint.narrative, scenes: blueprint.scenes }).toLowerCase();
  const forbiddenMatches = blueprint.forbiddenCliches.filter((term) => forbiddenText.includes(term.toLowerCase()));
  const checks = [
    result("duration_10_to_20_minutes", blueprint.targetDurationSeconds >= 600 && blueprint.targetDurationSeconds <= 1200, `${blueprint.targetDurationSeconds}s`),
    result("scene_count_12_to_20", scenes.length >= 12 && scenes.length <= 20, `${scenes.length} scenes`),
    result("visual_density", scenes.every((scene) => scene.visualElements.length >= 8 && scene.visualElements.length <= 12), "Every scene has 8-12 authored visual elements."),
    result("source_linked_factual_scenes", factualScenes.every((scene) => scene.claimIds.length > 0 && Boolean(scene.sourceLocator)), `${evidenceScenes.length}/${factualScenes.length} factual scenes linked.`),
    result("declared_claim_coverage", [...declaredClaimIds].every((id) => usedClaimIds.has(id)), `${usedClaimIds.size}/${declaredClaimIds.size} claims used.`),
    result("source_count", blueprint.provenance.sourceCount >= 2, `${blueprint.provenance.sourceCount} distinct sources.`),
    result("visual_world_variety", new Set(scenes.map((scene) => scene.visualWorld)).size >= 6, `${new Set(scenes.map((scene) => scene.visualWorld)).size} visual worlds.`),
    result("transition_variety", new Set(scenes.map((scene) => scene.transitionOut)).size >= 4, `${new Set(scenes.map((scene) => scene.transitionOut)).size} transition families.`),
    result("evidence_mode_variety", new Set(scenes.map((scene) => scene.evidenceMode)).size >= 4, `${new Set(scenes.map((scene) => scene.evidenceMode)).size} evidence modes.`),
    result("originality_anchor_uniqueness", uniqueRatio(scenes.map((scene) => scene.originalityAnchor)) === 1, "All scene anchors are unique."),
    result("no_triplicate_beat", !consecutiveBeatViolation, "No beat repeats three times consecutively."),
    result("peer_structural_similarity", !nearestPeer || nearestPeer.similarity < 0.58, nearestPeer ? `${(nearestPeer.similarity * 100).toFixed(1)}% vs ${nearestPeer.episodeId}` : "No peers supplied."),
    result("no_channel_cliches", forbiddenMatches.length === 0, forbiddenMatches.length ? forbiddenMatches.join(", ") : "No forbidden cliches detected."),
    result("no_synthetic_expert_persona", blueprint.authenticity.narratorMode === "editorial_voice_no_synthetic_persona" && !blueprint.syntheticMedia.syntheticExpertPersonaAllowed, blueprint.authenticity.narratorMode),
    result("no_real_person_clone", !blueprint.syntheticMedia.realPersonLikenessAllowed && !blueprint.syntheticMedia.realPersonVoiceCloneAllowed, "Real-person likeness and voice cloning disabled."),
    result("synthetic_disclosure_consistency", blueprint.syntheticMedia.visualReality === "non_photoreal_abstract_reconstruction" ? !blueprint.syntheticMedia.youtubeDisclosureRequired : blueprint.syntheticMedia.youtubeDisclosureRequired, blueprint.syntheticMedia.disclosureReason),
    result("advertiser_safe_visual_boundary", !blueprint.advertiserSafety.graphicImageryAllowed && !blueprint.advertiserSafety.distressAsSpectacleAllowed, "Graphic imagery and distress-as-spectacle disabled."),
    result("human_review_for_sensitive_topic", blueprint.riskLevel === "low" || blueprint.advertiserSafety.sensitiveTopicHumanReviewRequired, `risk=${blueprint.riskLevel}`),
    result("custom_editorial_voice", [blueprint.narrative.thesis, blueprint.narrative.counterpoint, blueprint.narrative.takeaway].every((value) => typeof value === "string" && value.trim().length >= 24), "Thesis, counterpoint, and takeaway are substantive."),
    result("deterministic_provenance", blueprint.provenance.sourceLinkedClaimsOnly && blueprint.provenance.generatedAt === null, "No volatile timestamp in deterministic blueprint.")
  ];
  const categoryRules = {
    sourceIntegrity: ["source_linked_factual_scenes", "declared_claim_coverage", "source_count", "deterministic_provenance"],
    originality: ["originality_anchor_uniqueness", "no_triplicate_beat", "peer_structural_similarity", "custom_editorial_voice"],
    visualDirection: ["visual_density", "visual_world_variety", "transition_variety", "evidence_mode_variety", "no_channel_cliches"],
    narrative: ["duration_10_to_20_minutes", "scene_count_12_to_20"],
    policySafety: ["no_synthetic_expert_persona", "no_real_person_clone", "synthetic_disclosure_consistency", "advertiser_safe_visual_boundary", "human_review_for_sensitive_topic"]
  };
  const weights = { sourceIntegrity: 25, originality: 25, visualDirection: 20, narrative: 15, policySafety: 15 };
  const scores = Object.fromEntries(Object.entries(categoryRules).map(([category, ids]) => {
    const categoryChecks = checks.filter((check) => ids.includes(check.id));
    const passed = categoryChecks.filter((check) => check.pass).length;
    return [category, Math.round((passed / categoryChecks.length) * weights[category])];
  }));
  const score = Object.values(scores).reduce((sum, value) => sum + value, 0);
  const blockers = checks.filter((check) => check.blocking && !check.pass);
  return {
    version: QUALITY_GATE_VERSION,
    episodeId: blueprint.episodeId,
    status: blockers.length === 0 && score >= 92 ? "pass" : "blocked",
    score,
    threshold: 92,
    scores,
    checks,
    blockers,
    nearestPeer,
    peerCount: peers.length
  };
}
