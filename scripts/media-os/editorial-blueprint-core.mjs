import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const BLUEPRINT_VERSION = "2026-08-03.2";

const ARC_PATTERNS = {
  ledger_reversal: ["hook", "baseline", "evidence", "mechanism", "timeline", "evidence", "human_impact", "counterclaim", "mechanism", "reversal", "evidence", "implications", "method", "outro"],
  paper_trail: ["hook", "document", "context", "evidence", "timeline", "mechanism", "document", "counterclaim", "evidence", "human_impact", "reversal", "implications", "method", "outro"],
  mechanism_first: ["hook", "mechanism", "baseline", "evidence", "mechanism", "timeline", "counterclaim", "evidence", "human_impact", "document", "reversal", "implications", "method", "outro"],
  testimony_spiral: ["hook", "testimony", "context", "evidence", "testimony", "corroboration", "timeline", "counterclaim", "evidence", "authority", "reversal", "implications", "method", "outro"],
  silence_break: ["hook", "silence", "baseline", "warning", "timeline", "evidence", "institution", "counterclaim", "corroboration", "human_impact", "response", "implications", "method", "outro"],
  institutional_response: ["hook", "warning", "routing", "institution", "evidence", "timeline", "response", "counterclaim", "corroboration", "remedy", "gap", "implications", "method", "outro"],
  attack_path: ["hook", "entry", "identity", "evidence", "privilege", "movement", "detection", "counterclaim", "impact", "containment", "recovery", "lessons", "method", "outro"],
  control_failure: ["hook", "control", "baseline", "evidence", "bypass", "identity", "timeline", "detection", "counterclaim", "impact", "remediation", "lessons", "method", "outro"],
  recovery_clock: ["hook", "impact", "clock_start", "dependency", "evidence", "containment", "recovery", "setback", "counterclaim", "restoration", "cost", "lessons", "method", "outro"],
  legal_issue_tree: ["hook", "parties", "issue", "rule", "evidence", "application", "defense", "evidence", "finding", "remedy", "gap", "implications", "method", "outro"],
  enforcement_clock: ["hook", "conduct", "complaint", "timeline", "evidence", "response", "issue", "defense", "finding", "remedy", "compliance", "implications", "method", "outro"],
  remedy_gap: ["hook", "harm", "conduct", "evidence", "issue", "finding", "remedy", "distribution", "counterclaim", "remaining_gap", "precedent", "implications", "method", "outro"],
  incentive_map: ["hook", "patient_path", "payment", "incentive", "evidence", "decision", "uncertainty", "counterclaim", "outcome", "access", "safeguard", "implications", "method", "outro"],
  clinical_claim_audit: ["hook", "claim", "population", "evidence", "denominator", "uncertainty", "counterclaim", "regulation", "outcome", "risk", "safeguard", "implications", "method", "outro"],
  access_bottleneck: ["hook", "patient_path", "eligibility", "approval", "evidence", "delay", "incentive", "counterclaim", "outcome", "appeal", "remedy", "implications", "method", "outro"],
  failure_chain: ["hook", "normal_state", "initiator", "barrier", "evidence", "propagation", "operator_context", "counterclaim", "failure", "response", "recommendation", "implications", "method", "outro"],
  defense_in_depth: ["hook", "system", "barrier_one", "barrier_two", "evidence", "erosion", "timeline", "counterclaim", "coupling", "failure", "redesign", "implications", "method", "outro"],
  normalization_of_deviance: ["hook", "first_deviation", "normalization", "incentive", "evidence", "warning", "timeline", "counterclaim", "threshold", "failure", "learning", "implications", "method", "outro"],
  oversight_gap: ["hook", "authority", "collection", "boundary", "evidence", "oversight", "testimony", "counterclaim", "corroboration", "gap", "response", "implications", "method", "outro"],
  authority_boundary: ["hook", "mandate", "boundary", "action", "evidence", "challenge", "oversight", "defense", "finding", "gap", "reform", "implications", "method", "outro"],
  state_machine_breach: ["hook", "state_zero", "credential", "transition", "evidence", "privilege", "persistence", "detection", "impact", "containment", "rollback", "lessons", "method", "outro"],
  identity_chain: ["hook", "principal", "credential", "trust", "evidence", "delegation", "privilege", "counterclaim", "abuse", "impact", "redesign", "lessons", "method", "outro"],
  procedural_posture: ["hook", "parties", "allegation", "procedure", "evidence", "defense", "motion", "finding", "remedy", "appeal", "status", "implications", "method", "outro"],
  coupled_failure: ["hook", "system_a", "system_b", "coupling", "evidence", "constraint", "trigger", "propagation", "response", "stabilization", "recommendation", "implications", "method", "outro"],
  barrier_erosion: ["hook", "barrier_map", "maintenance", "deviation", "evidence", "erosion", "warning", "counterclaim", "breach", "response", "redesign", "implications", "method", "outro"],
  constraint_cascade: ["hook", "operating_envelope", "constraint_one", "constraint_two", "evidence", "load_transfer", "cascade", "counterclaim", "collapse", "response", "new_envelope", "implications", "method", "outro"],
  consent_path: ["hook", "entry_screen", "choice", "disclosure", "evidence", "commitment", "consequence", "counterclaim", "cancellation", "remedy", "comparison", "implications", "method", "outro"],
  dark_pattern_loop: ["hook", "interface", "default", "friction", "evidence", "loop", "fee", "counterclaim", "exit", "enforcement", "redesign", "implications", "method", "outro"],
  contract_consequence: ["hook", "promise", "clause", "transaction", "evidence", "trigger", "consequence", "defense", "finding", "remedy", "alternative", "implications", "method", "outro"],
  model_lineage: ["hook", "deployment", "data", "lineage", "evidence", "evaluation", "handoff", "counterclaim", "failure", "accountability", "remediation", "implications", "method", "outro"],
  automation_boundary: ["hook", "human_role", "automation", "boundary", "evidence", "override", "drift", "counterclaim", "impact", "accountability", "redesign", "implications", "method", "outro"],
  evaluation_gap: ["hook", "metric", "test_set", "claim", "evidence", "deployment", "distribution_shift", "counterclaim", "failure", "audit", "new_test", "implications", "method", "outro"]
};

const EVIDENCE_BEATS = new Set(["evidence", "document", "corroboration", "rule", "finding", "claim", "denominator", "barrier", "warning", "authority", "oversight", "control", "identity", "procedure", "clause", "data", "evaluation", "metric"]);
const NON_FACTUAL_BEATS = new Set(["hook", "outro", "method", "silence", "implications", "lessons"]);

function assertString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`${label} must be a non-empty string.`);
}

function assertStringArray(value, label, minimum) {
  if (!Array.isArray(value) || value.length < minimum || value.some((item) => typeof item !== "string" || item.trim().length === 0)) {
    throw new Error(`${label} must contain at least ${minimum} non-empty strings.`);
  }
}

export function loadEditorialDna(path) {
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  assertString(parsed.version, "editorial DNA version");
  if (!Array.isArray(parsed.channels) || parsed.channels.length !== 12) throw new Error("Editorial DNA must define exactly 12 channels.");
  const ids = new Set();
  const signatures = new Set();
  for (const profile of parsed.channels) {
    assertString(profile.channelId, "channelId");
    assertString(profile.signature, `${profile.channelId}.signature`);
    assertString(profile.editorialPromise, `${profile.channelId}.editorialPromise`);
    assertString(profile.perspective, `${profile.channelId}.perspective`);
    if (!(["ja", "en"].includes(profile.language))) throw new Error(`${profile.channelId}.language must be ja or en.`);
    for (const [key, minimum] of [["hookFamilies", 4], ["arcFamilies", 3], ["visualWorlds", 6], ["evidenceModes", 4], ["motionVerbs", 4], ["transitionFamilies", 4], ["audioMotifs", 3], ["forbiddenCliches", 4]]) {
      assertStringArray(profile[key], `${profile.channelId}.${key}`, minimum);
    }
    if (ids.has(profile.channelId)) throw new Error(`Duplicate channelId ${profile.channelId}.`);
    if (signatures.has(profile.signature)) throw new Error(`Duplicate signature ${profile.signature}.`);
    for (const arc of profile.arcFamilies) if (!ARC_PATTERNS[arc]) throw new Error(`Unknown arc family ${arc}.`);
    ids.add(profile.channelId);
    signatures.add(profile.signature);
  }
  return parsed;
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function indexFor(seed, namespace, length) {
  const value = Number.parseInt(digest(`${seed}:${namespace}`).slice(0, 8), 16);
  return value % length;
}

function rotate(items, offset) {
  return items.map((_, index) => items[(index + offset) % items.length]);
}

function allocateDurations(beats, targetSeconds, seed) {
  const weights = beats.map((beat, index) => {
    if (beat === "hook") return 0.7;
    if (beat === "outro") return 0.65;
    if (beat === "method") return 0.75;
    if (EVIDENCE_BEATS.has(beat)) return 1.15;
    return 0.95 + indexFor(seed, `duration:${beat}:${index}`, 20) / 100;
  });
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  const raw = weights.map((weight) => Math.max(32, Math.round((targetSeconds * weight) / totalWeight)));
  raw[raw.length - 1] += targetSeconds - raw.reduce((sum, value) => sum + value, 0);
  return raw;
}

function visualElements(profile, visualWorld, evidenceMode, beat, index) {
  return [
    `background texture: ${visualWorld}`,
    `ambient layer: ${profile.audioMotifs[index % profile.audioMotifs.length]} translated into motion`,
    `structural layer: ${profile.signature} framing system`,
    `primary content: ${beat} focal object`,
    `secondary content: ${evidenceMode}`,
    "foreground registration marks",
    "claim status label with explicit attribution",
    "source locator readable at hero frame",
    `recurring motif: ${profile.motionVerbs[index % profile.motionVerbs.length]}`
  ];
}

export function generateEditorialBlueprint(input, dna) {
  for (const key of ["episodeId", "channelId", "title", "language", "riskLevel", "thesis", "keyQuestion", "counterpoint", "takeaway"]) assertString(input[key], key);
  if (!Array.isArray(input.claims) || input.claims.length === 0) throw new Error("At least one source-linked claim is required.");
  for (const claim of input.claims) {
    for (const key of ["id", "status", "sourceTitle", "locator"]) assertString(claim[key], `claim.${key}`);
  }
  const profile = dna.channels.find((candidate) => candidate.channelId === input.channelId);
  if (!profile) throw new Error(`No editorial DNA profile for ${input.channelId}.`);
  if (profile.language !== input.language) throw new Error(`Language mismatch for ${input.channelId}.`);
  const seed = `${input.episodeId}:${input.title}:${input.episodeNumber ?? 1}:${BLUEPRINT_VERSION}`;
  const episodeOffset = Math.max(0, Number(input.episodeNumber ?? 1) - 1);
  const arcFamily = profile.arcFamilies[(indexFor(`${input.channelId}:season`, "arc", profile.arcFamilies.length) + episodeOffset) % profile.arcFamilies.length];
  const beats = ARC_PATTERNS[arcFamily];
  const targetSeconds = input.targetMinutes
    ? Math.round(Number(input.targetMinutes) * 60)
    : 720 + indexFor(seed, "duration", 6) * 60;
  if (!Number.isFinite(targetSeconds) || targetSeconds < 600 || targetSeconds > 1200) throw new Error("targetMinutes must produce a 10-20 minute master.");
  const durations = allocateDurations(beats, targetSeconds, seed);
  const worlds = rotate(profile.visualWorlds, indexFor(seed, "world", profile.visualWorlds.length) + episodeOffset * 2);
  const evidenceModes = rotate(profile.evidenceModes, indexFor(seed, "evidence", profile.evidenceModes.length) + episodeOffset);
  const transitions = rotate(profile.transitionFamilies, indexFor(seed, "transition", profile.transitionFamilies.length) + episodeOffset);
  let elapsed = 0;
  const orderedClaims = rotate(input.claims, indexFor(seed, "claim", input.claims.length));
  const factualSceneCount = beats.filter((beat) => !NON_FACTUAL_BEATS.has(beat)).length;
  const baseClaimsPerScene = Math.floor(orderedClaims.length / factualSceneCount);
  const extraClaimScenes = orderedClaims.length % factualSceneCount;
  let claimCursor = 0;
  let factualSceneIndex = 0;
  const scenes = beats.map((beat, index) => {
    const needsClaim = !NON_FACTUAL_BEATS.has(beat);
    const claimCount = needsClaim ? Math.max(1, baseClaimsPerScene + (factualSceneIndex < extraClaimScenes ? 1 : 0)) : 0;
    const claims = needsClaim
      ? Array.from({ length: claimCount }, (_, claimIndex) => orderedClaims[(claimCursor + claimIndex) % orderedClaims.length])
      : [];
    const claim = claims[0] ?? null;
    if (needsClaim) {
      claimCursor += claimCount;
      factualSceneIndex += 1;
    }
    const durationSeconds = durations[index];
    const world = worlds[index % worlds.length];
    const evidenceMode = evidenceModes[index % evidenceModes.length];
    const startSeconds = elapsed;
    elapsed += durationSeconds;
    return {
      id: `${input.episodeId}-scene-${String(index + 1).padStart(2, "0")}`,
      ordinal: index + 1,
      beat,
      startSeconds,
      durationSeconds,
      claimIds: claims.map((item) => item.id),
      claimStatus: needsClaim ? claim.status : null,
      sourceLocator: needsClaim ? claims.map((item) => `${item.sourceTitle} — ${item.locator}`).join(" | ") : null,
      sourceLocators: claims.map((item) => ({ claimId: item.id, sourceTitle: item.sourceTitle, locator: item.locator, status: item.status })),
      visualWorld: world,
      evidenceMode,
      visualElements: visualElements(profile, world, evidenceMode, beat, index),
      choreographyVerb: profile.motionVerbs[index % profile.motionVerbs.length],
      transitionOut: index === beats.length - 1 ? "final_fade" : transitions[index % transitions.length],
      rhythm: index === 0 ? "hook" : index % 5 === 0 ? "breath" : EVIDENCE_BEATS.has(beat) ? "hold_to_read" : "advance",
      originalityAnchor: `${input.thesis} / ${beat} / ${world}`
    };
  });
  const hookFamily = profile.hookFamilies[(indexFor(`${input.channelId}:season`, "hook", profile.hookFamilies.length) + episodeOffset) % profile.hookFamilies.length];
  const fingerprintTokens = [profile.signature, arcFamily, hookFamily, ...scenes.map((scene) => `${scene.beat}:${scene.visualWorld}:${scene.transitionOut}`)];
  const blueprint = {
    version: BLUEPRINT_VERSION,
    episodeId: input.episodeId,
    channelId: input.channelId,
    language: input.language,
    title: input.title,
    riskLevel: input.riskLevel,
    targetDurationSeconds: targetSeconds,
    editorialDna: {
      version: dna.version,
      signature: profile.signature,
      promise: profile.editorialPromise,
      perspective: profile.perspective,
      hookFamily,
      arcFamily
    },
    narrative: {
      thesis: input.thesis,
      keyQuestion: input.keyQuestion,
      counterpoint: input.counterpoint,
      takeaway: input.takeaway,
      rhythmDeclaration: "hook-build-EVIDENCE-breathe-COUNTERPOINT-reversal-method-resolve"
    },
    provenance: {
      claimIds: input.claims.map((claim) => claim.id),
      sourceCount: new Set(input.claims.map((claim) => claim.sourceTitle)).size,
      sourceLinkedClaimsOnly: true,
      generatedAt: null
    },
    authenticity: {
      narratorMode: "editorial_voice_no_synthetic_persona",
      customThesisRequired: true,
      customCounterpointRequired: true,
      bespokeTakeawayRequired: true,
      identicalTemplateReuseAllowed: false
    },
    syntheticMedia: {
      visualReality: "non_photoreal_abstract_reconstruction",
      realPersonLikenessAllowed: false,
      realPersonVoiceCloneAllowed: false,
      syntheticExpertPersonaAllowed: false,
      generatedMusicAllowed: false,
      youtubeDisclosureRequired: false,
      disclosureReason: "Abstract, clearly non-photoreal motion graphics only; reassess if a realistic generated scene is introduced."
    },
    advertiserSafety: {
      documentaryContextRequired: true,
      graphicImageryAllowed: false,
      distressAsSpectacleAllowed: false,
      sensitiveTopicHumanReviewRequired: input.riskLevel !== "low"
    },
    forbiddenCliches: profile.forbiddenCliches,
    scenes,
    fingerprint: digest(fingerprintTokens.join("|")),
    fingerprintTokens
  };
  return blueprint;
}

export function structuralTokenSet(blueprint) {
  const sceneTokens = blueprint.scenes.flatMap((scene, index) => {
    const next = blueprint.scenes[index + 1];
    return [
      `beat:${scene.beat}`,
      `transition:${scene.transitionOut}`,
      `scene:${index}:${scene.beat}:${scene.visualWorld}:${scene.evidenceMode}:${scene.transitionOut}`,
      next ? `bigram:${scene.beat}>${next.beat}` : "bigram:END"
    ];
  });
  return new Set([
    `signature:${blueprint.editorialDna.signature}`,
    `arc:${blueprint.editorialDna.arcFamily}`,
    `hook:${blueprint.editorialDna.hookFamily}`,
    ...sceneTokens
  ]);
}

export function jaccardSimilarity(left, right) {
  const a = left instanceof Set ? left : structuralTokenSet(left);
  const b = right instanceof Set ? right : structuralTokenSet(right);
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 1 : intersection / union;
}

export function stableJsonHash(value) {
  return digest(JSON.stringify(value));
}
