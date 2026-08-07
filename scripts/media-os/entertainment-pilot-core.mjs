import { createHash } from "node:crypto";
import { loadProductionProfileRegistry, profileForVisualMode } from "./production-profile-core.mjs";

export const ENTERTAINMENT_PILOT_VERSION = "2026-08-03.2";
export const ENTERTAINMENT_PLAN_THRESHOLD = 92;
const PRODUCTION_PROFILES = loadProductionProfileRegistry();

const FORMAT_PROFILES = Object.freeze({
  investigative_docudrama: {
    family: "cinematic_investigator",
    visualModes: ["avatar_fullscreen", "cinematic_reconstruction", "archive_macro", "source_document", "avatar_pip", "motion_comic", "data_motion"],
    avatarTarget: 0.22,
    tone: "A fictional investigative host guides viewers through escalating evidence, then disappears whenever the story should take over.",
  },
  audio_document_drama: {
    family: "archive_mystery",
    visualModes: ["archive_macro", "cinematic_reconstruction", "motion_comic", "source_document", "avatar_pip", "evidence_map", "data_motion"],
    avatarTarget: 0.14,
    tone: "Testimony and documents arrive like clues in an audio drama, with the host used only to redirect suspicion.",
  },
  animated_systems_teardown: {
    family: "screenlife_thriller",
    visualModes: ["screenlife", "system_reconstruction", "avatar_pip", "data_motion", "motion_comic", "source_document", "cinematic_reconstruction"],
    avatarTarget: 0.16,
    tone: "Logs, interfaces, and system states become the action while a restrained host marks the turning points.",
  },
  courtroom_manga: {
    family: "motion_comic_casefile",
    visualModes: ["motion_comic", "source_document", "anime_reenactment", "avatar_pip", "evidence_map", "cinematic_reconstruction", "data_motion"],
    avatarTarget: 0.12,
    tone: "A graphic-novel case file turns allegations, findings, and consequences into confrontational panel changes.",
  },
  screenlife_investigation: {
    family: "screenlife_thriller",
    visualModes: ["screenlife", "source_document", "avatar_pip", "cinematic_reconstruction", "evidence_map", "motion_comic", "data_motion"],
    avatarTarget: 0.15,
    tone: "The investigation advances through screens, transactions, clauses, and consequences rather than static explanation.",
  },
});

const DEFAULT_PROFILE = Object.freeze({
  family: "cinematic_evidence_story",
  visualModes: ["avatar_fullscreen", "cinematic_reconstruction", "source_document", "motion_comic", "archive_macro", "data_motion", "avatar_pip"],
  avatarTarget: 0.18,
  tone: "A recurring fictional narrator opens loops, while reconstructions, documents, and graphic sequences deliver the evidence.",
});

const STORY_FUNCTIONS = [
  "cold_open", "contradiction", "question", "first_clue", "context", "micro_reveal",
  "complication", "evidence", "false_answer", "pattern_interrupt", "reversal", "consequence",
  "new_question", "proof", "human_stake", "deeper_mechanism", "second_reveal", "unresolved_risk",
  "chapter_cliffhanger", "aftermath", "forward_promise", "audience_question", "chapter_turn",
];

const TRANSITIONS = ["cinematic_zoom", "smash_cut", "focus_pull", "whip_pan", "page_turn_blur", "ink_wipe"];
const SFX = ["paper_snap", "sub_bass_hit", "camera_shutter", "tape_stop", "marker_scratch", "room_tone_cut"];
const CAMERA_LANGUAGE = Object.freeze({
  avatar_fullscreen: "85mm eye-level portrait, shallow depth of field, practical newsroom edge light",
  avatar_pip: "clean waist-up host plate with negative space, soft key and motivated rim light",
  cinematic_reconstruction: "35mm dramatic insert, foreground occlusion, motivated practical light, documentary realism",
  archive_macro: "100mm macro detail, tactile paper grain, raking light, shallow focus pull",
  motion_comic: "graphic-novel panel depth, inked foreground silhouette, cinematic perspective",
  anime_reenactment: "restrained seinen animation keyframe, dramatic blocking, editorial color script",
  data_motion: "kinetic data choreography with one dominant comparison and strong depth hierarchy",
  source_document: "evidence macro with one highlighted locator, no fabricated readable text",
  evidence_map: "spatial evidence map, causal path and one focal contradiction",
  screenlife: "cinematic screenlife closeup, cursor-scale detail and controlled reflection",
  system_reconstruction: "layered system cutaway, visible state change and causal flow",
});

function round(value, digits = 3) {
  return Number(value.toFixed(digits));
}

function hashInt(value) {
  return Number.parseInt(createHash("sha256").update(value).digest("hex").slice(0, 8), 16);
}

function assertInput(blueprint, narration, durationSeconds) {
  if (!blueprint?.episodeId || !Array.isArray(blueprint.scenes) || blueprint.scenes.length === 0) throw new Error("Entertainment pilot requires an editorial blueprint.");
  if (narration?.episodeId !== blueprint.episodeId || !Array.isArray(narration.segments) || narration.segments.length === 0) throw new Error("Entertainment pilot requires matching narration segments.");
  if (!Number.isFinite(durationSeconds) || durationSeconds < 45 || durationSeconds > 120) throw new Error("Entertainment pilot duration must be 45-120 seconds.");
}

export function resolveFormatProfile(channelFormat) {
  return FORMAT_PROFILES[channelFormat] ?? DEFAULT_PROFILE;
}

function selectNarrationSegments(segments, targetSeconds) {
  const selected = [];
  let cursor = 0;
  for (const segment of segments) {
    if (cursor >= targetSeconds) break;
    const declared = Number(segment.targetDurationSeconds) + Number(segment.pauseAfterSeconds ?? 0);
    const duration = Math.min(Math.max(4, declared), targetSeconds - cursor);
    selected.push({ ...segment, pilotStartSeconds: round(cursor), pilotDurationSeconds: round(duration) });
    cursor += duration;
  }
  if (cursor < targetSeconds && selected.length > 0) selected[selected.length - 1].pilotDurationSeconds = round(selected.at(-1).pilotDurationSeconds + (targetSeconds - cursor));
  return selected;
}

function modeForShot(profile, shotIndex, totalShots) {
  const hostIndices = new Set([0, Math.floor(totalShots * 0.38), Math.floor(totalShots * 0.72)]);
  if (hostIndices.has(shotIndex)) return shotIndex === 0 ? "avatar_fullscreen" : "avatar_pip";
  const nonHost = profile.visualModes.filter((mode) => !mode.startsWith("avatar_"));
  return nonHost[(shotIndex - 1 + nonHost.length) % nonHost.length];
}

function textFragments(value, language) {
  const maximum = language === "ja" ? 28 : 54;
  const sentences = String(value ?? "").match(/[^。！？.!?]+[。！？.!?]?/g) ?? [];
  const fragments = sentences.flatMap((sentence) => sentence.split(language === "ja" ? /[、；：]/ : /[,;:]/))
    .map((fragment) => fragment.trim()).filter(Boolean);
  return fragments.flatMap((fragment) => {
    if (fragment.length <= maximum) return [fragment];
    const chunks = [];
    for (let start = 0; start < fragment.length; start += maximum) chunks.push(fragment.slice(start, start + maximum));
    return chunks;
  });
}

function screenCopy(segment, occurrence, language, storyFunction) {
  const fragments = textFragments(segment.text, language);
  const selected = fragments[occurrence % Math.max(1, fragments.length)] ?? String(segment.text ?? "");
  return { kicker: storyFunction.replaceAll("_", " "), headline: selected };
}

function buildShots({ blueprint, selectedSegments, profile, durationSeconds }) {
  const targetShotCount = Math.max(14, Math.min(26, Math.round(durationSeconds / 4.8)));
  const baseDuration = durationSeconds / targetShotCount;
  const sceneById = new Map(blueprint.scenes.map((scene) => [scene.id, scene]));
  const shots = [];
  const segmentOccurrences = new Map();
  let cursor = 0;
  for (let index = 0; index < targetShotCount; index += 1) {
    const remaining = durationSeconds - cursor;
    const duration = index === targetShotCount - 1
      ? remaining
      : Math.min(remaining, baseDuration * ([0.78, 1.08, 0.92, 1.22][index % 4]));
    const midpoint = cursor + duration / 2;
    const segment = selectedSegments.find((candidate) => midpoint >= candidate.pilotStartSeconds && midpoint < candidate.pilotStartSeconds + candidate.pilotDurationSeconds) ?? selectedSegments.at(-1);
    const scene = sceneById.get(segment.sceneId);
    const visualMode = modeForShot(profile, index, targetShotCount);
    const productionProfile = profileForVisualMode(PRODUCTION_PROFILES, visualMode);
    const occurrence = segmentOccurrences.get(segment.id) ?? 0;
    segmentOccurrences.set(segment.id, occurrence + 1);
    const photorealistic = ["avatar_fullscreen", "avatar_pip", "cinematic_reconstruction"].includes(visualMode);
    const claimIds = Array.isArray(segment.claimIds) ? segment.claimIds : [];
    shots.push({
      id: `shot-${String(index + 1).padStart(3, "0")}`,
      ordinal: index + 1,
      startSeconds: round(cursor),
      durationSeconds: round(duration),
      storyFunction: STORY_FUNCTIONS[index % STORY_FUNCTIONS.length],
      energy: index < 4 ? "high" : index % 6 === 5 ? "breath" : "medium",
      visualMode,
      productionProfileId: productionProfile.id,
      expectedOutputKind: productionProfile.outputKind,
      motionTreatment: productionProfile.id === "realistic_host"
        ? "performance_motion"
        : productionProfile.outputKind === "video"
          ? "full_motion"
          : productionProfile.outputKind === "composition"
            ? "designed_motion"
            : productionProfile.compositingRole === "parallax_panel"
              ? "parallax_motion"
              : "camera_motion",
      hostMode: visualMode === "avatar_fullscreen" ? "fictional_host_fullscreen" : visualMode === "avatar_pip" ? "fictional_host_pip" : "offscreen_narration",
      narrationSegmentId: segment.id,
      narrationExcerpt: segment.text,
      onScreenCopy: screenCopy(segment, occurrence, blueprint.language, STORY_FUNCTIONS[index % STORY_FUNCTIONS.length]),
      claimIds,
      claimStatus: scene?.claimStatus ?? null,
      sourceLocator: segment.sourceLocator ?? scene?.sourceLocator ?? null,
      visualDirection: `${segment.visualSync} Story function: ${STORY_FUNCTIONS[index % STORY_FUNCTIONS.length]}. Camera and art direction: ${CAMERA_LANGUAGE[visualMode] ?? "cinematic editorial composition with foreground, midground, and background separation"}. Treat this as ${visualMode.replaceAll("_", " ")}; create a new focal composition rather than a slide or dashboard.`,
      compositionVariant: (index % 4) + 1,
      transitionOut: TRANSITIONS[index % TRANSITIONS.length],
      sfxCue: SFX[index % SFX.length],
      syntheticDisclosureRequired: photorealistic,
      realPersonLikenessAllowed: false,
      presentationCard: visualMode === "presentation_card",
      assetRequired: productionProfile.outputKind !== "composition",
    });
    cursor += duration;
  }
  shots[shots.length - 1].durationSeconds = round(durationSeconds - shots.at(-1).startSeconds);
  return shots;
}

function treatmentCandidates(profile, language) {
  const localized = language === "ja";
  return [
    { id: "treatment-cinematic-host", name: localized ? "シネマティック調査記者" : "Cinematic Investigator", family: profile.family, rank: 1, rationale: profile.tone },
    { id: "treatment-motion-comic", name: localized ? "モーションコミック事件簿" : "Motion-comic Casefile", family: "motion_comic_casefile", rank: 2, rationale: "Use panel reveals, reaction inserts, and document closeups to dramatize procedural turns without inventing testimony." },
    { id: "treatment-screenlife", name: localized ? "スクリーンライフ・スリラー" : "Screenlife Evidence Thriller", family: "screenlife_thriller", rank: 3, rationale: "Let records, timelines, messages, and transactions become the action while the narrator opens and closes questions." },
  ];
}

function assetManifest(blueprint, shots) {
  const requests = shots.filter((shot) => shot.assetRequired).map((shot) => {
    const productionProfile = PRODUCTION_PROFILES.profiles.find((candidate) => candidate.id === shot.productionProfileId);
    if (!productionProfile) throw new Error(`Shot ${shot.id} has unknown production profile ${shot.productionProfileId}.`);
    return {
      id: `${blueprint.episodeId.replace(/^episode-/, "")}-${shot.id}`,
      sceneOrdinal: shot.ordinal,
      seed: hashInt(`${blueprint.fingerprint}:${shot.id}`),
      width: productionProfile.outputKind === "video" ? 1024 : 1344,
      height: productionProfile.outputKind === "video" ? 1024 : 768,
      durationSeconds: shot.durationSeconds,
      startSeconds: shot.startSeconds,
      prompt: `${shot.visualDirection} Original fictional characters only. Editorial documentary lighting. No readable fabricated document text.`,
      negativePrompt: `real public figure, celebrity likeness, copied character, fake quotation, fake logo, readable fabricated evidence, corporate presentation slide, dashboard UI, watermark, low detail`,
      photorealistic: shot.syntheticDisclosureRequired,
      disclosureRequired: shot.syntheticDisclosureRequired,
      realPersonLikeness: false,
      generationRole: shot.visualMode,
      productionProfileId: productionProfile.id,
      expectedOutputKind: productionProfile.outputKind,
      shotId: shot.id,
      inputs: {
        narrationSegmentId: shot.narrationSegmentId,
        fictionalIdentityId: shot.hostMode === "offscreen_narration" ? null : `${blueprint.channelId}-fictional-host-v1`,
      },
      rights: { mode: "project_generated", commercialUse: true, thirdPartyReference: false },
    };
  });
  return {
    version: 2,
    episodeId: blueprint.episodeId,
    registryPath: "../../../config/comfyui/production-profiles.json",
    assets: requests,
  };
}

function check(id, pass, detail, category) {
  return { id, pass, detail, category, blocking: true };
}

function evaluatePlan(plan) {
  const durations = plan.shots.map((shot) => shot.durationSeconds);
  const modes = new Set(plan.shots.map((shot) => shot.visualMode));
  const avatarSeconds = plan.shots.filter((shot) => shot.hostMode !== "offscreen_narration").reduce((sum, shot) => sum + shot.durationSeconds, 0);
  const presentationSeconds = plan.shots.filter((shot) => shot.presentationCard).reduce((sum, shot) => sum + shot.durationSeconds, 0);
  const sourcedClaimShots = plan.shots.filter((shot) => shot.claimIds.length > 0);
  const attributedClaimShots = sourcedClaimShots.filter((shot) => shot.sourceLocator);
  const disclosureSafe = plan.shots.filter((shot) => shot.syntheticDisclosureRequired).every((shot) => !shot.realPersonLikenessAllowed);
  const dynamicMotionSeconds = plan.shots.filter((shot) => ["performance_motion", "full_motion"].includes(shot.motionTreatment))
    .reduce((sum, shot) => sum + shot.durationSeconds, 0);
  const avatarShare = avatarSeconds / plan.durationSeconds;
  const dynamicMotionShare = dynamicMotionSeconds / plan.durationSeconds;
  const presentationShare = presentationSeconds / plan.durationSeconds;
  const averageShot = plan.durationSeconds / plan.shots.length;
  const checks = [
    check("shot_density", plan.shots.length >= 14 && plan.shots.length <= 26, `${plan.shots.length} shots / ${plan.durationSeconds}s`, "pacing"),
    check("average_shot_length", averageShot >= 3 && averageShot <= 7, `${averageShot.toFixed(2)}s average`, "pacing"),
    check("maximum_shot_length", Math.max(...durations) <= 9, `${Math.max(...durations).toFixed(2)}s longest`, "pacing"),
    check("visual_mode_diversity", modes.size >= 6, `${modes.size} visual modes`, "entertainment"),
    check("story_reveal_density", plan.shots.filter((shot) => ["micro_reveal", "reversal", "chapter_cliffhanger", "complication"].includes(shot.storyFunction)).length >= 3, "At least three retention beats", "entertainment"),
    check("onscreen_copy_uniqueness", new Set(plan.shots.map((shot) => `${shot.onScreenCopy.kicker}:${shot.onScreenCopy.headline}`)).size >= Math.ceil(plan.shots.length * 0.7), "Shot overlays use distinct retention function and copy", "entertainment"),
    check("presentation_share_cap", presentationShare <= 0.15, `${(presentationShare * 100).toFixed(1)}% presentation graphics`, "entertainment"),
    check("avatar_presence", avatarShare >= 0.12 && avatarShare <= 0.3, `${(avatarShare * 100).toFixed(1)}% host presence`, "host"),
    check("avatar_not_constant", plan.shots.some((shot) => shot.hostMode === "offscreen_narration"), "Host exits for story-led sequences", "host"),
    check("dynamic_motion_budget", dynamicMotionShare >= 0.25 && dynamicMotionShare <= 0.45, `${(dynamicMotionShare * 100).toFixed(1)}% full/performance motion`, "host"),
    check("claim_attribution", attributedClaimShots.length === sourcedClaimShots.length, `${attributedClaimShots.length}/${sourcedClaimShots.length} claim shots sourced`, "evidence"),
    check("allegation_labels_retained", plan.shots.filter((shot) => shot.claimStatus === "alleged").every((shot) => shot.sourceLocator), "Allegations retain attribution", "evidence"),
    check("synthetic_disclosure_contract", disclosureSafe, "Realistic synthetic shots are flagged; real-person likeness is disabled", "safety"),
    check("production_profile_routing", plan.visualAssetManifest.assets.every((asset) => asset.productionProfileId && asset.expectedOutputKind), "Every GPU asset is routed through a typed production profile", "safety"),
    check("asset_rights_contract", plan.visualAssetManifest.assets.every((asset) => asset.rights.commercialUse && !asset.rights.thirdPartyReference), `${plan.visualAssetManifest.assets.length} generated assets rights-scoped`, "safety"),
  ];
  const weights = { pacing: 25, entertainment: 25, host: 15, evidence: 20, safety: 15 };
  const scores = Object.fromEntries(Object.entries(weights).map(([category, weight]) => {
    const candidates = checks.filter((candidate) => candidate.category === category);
    return [category, Math.round((candidates.filter((candidate) => candidate.pass).length / candidates.length) * weight)];
  }));
  const score = Object.values(scores).reduce((sum, value) => sum + value, 0);
  const blockers = checks.filter((candidate) => candidate.blocking && !candidate.pass);
  return {
    version: ENTERTAINMENT_PILOT_VERSION,
    kind: "creative_plan",
    episodeId: plan.episodeId,
    status: blockers.length === 0 && score >= ENTERTAINMENT_PLAN_THRESHOLD ? "pass" : "blocked",
    score,
    threshold: ENTERTAINMENT_PLAN_THRESHOLD,
    scores,
    checks,
    blockers,
    metrics: {
      durationSeconds: plan.durationSeconds,
      shotCount: plan.shots.length,
      averageShotSeconds: round(averageShot),
      maximumShotSeconds: round(Math.max(...durations)),
      avatarShare: round(avatarShare, 4),
      dynamicMotionShare: round(dynamicMotionShare, 4),
      presentationShare: round(presentationShare, 4),
      visualModeCount: modes.size,
      assetRequestCount: plan.visualAssetManifest.assets.length,
    },
  };
}

export function buildEntertainmentPilot({ blueprint, narration, channelFormat, durationSeconds = 90 }) {
  assertInput(blueprint, narration, durationSeconds);
  const profile = resolveFormatProfile(channelFormat);
  const selectedSegments = selectNarrationSegments(narration.segments, durationSeconds);
  const shots = buildShots({ blueprint, selectedSegments, profile, durationSeconds });
  const plan = {
    version: ENTERTAINMENT_PILOT_VERSION,
    episodeId: blueprint.episodeId,
    channelId: blueprint.channelId,
    language: blueprint.language,
    title: blueprint.title,
    durationSeconds,
    formatFamily: profile.family,
    selectedTreatmentId: "treatment-cinematic-host",
    treatments: treatmentCandidates(profile, blueprint.language),
    host: {
      identity: "original_fictional_channel_host",
      realPersonLikenessAllowed: false,
      persistentCornerOverlayAllowed: false,
      targetPresenceShare: profile.avatarTarget,
      visualDisclosure: "realistic_synthetic_host",
    },
    rhythm: "HOOK-fast-fast-BREATHE-reveal-fast-REVERSAL-cliffhanger",
    selectedNarrationSegmentIds: selectedSegments.map((segment) => segment.id),
    shots,
    visualAssetManifest: null,
  };
  plan.visualAssetManifest = assetManifest(blueprint, shots);
  const report = evaluatePlan(plan);
  plan.fingerprint = createHash("sha256").update(JSON.stringify(plan)).digest("hex");
  return { plan, report };
}
