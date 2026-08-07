import { createHash } from "node:crypto";

const FACTUAL_BEATS = new Set([
  "authority", "baseline", "boundary", "collection", "corroboration", "counterclaim",
  "document", "evidence", "gap", "human_impact", "mechanism", "oversight", "response",
  "reversal", "testimony", "timeline",
]);
const ROLES = new Set(["hook", "evidence", "transition", "outcome", "cta"]);

function result(id, pass, detail, category, blocking = true) {
  return { id, pass, detail, category, blocking };
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function estimateSpeechSeconds(text, language) {
  const normalized = cleanText(text);
  if (language === "ja") {
    return [...normalized.replace(/[\s\p{P}\p{S}]/gu, "")].length / 4.7;
  }
  return normalized.split(/\s+/).filter(Boolean).length / 2.35;
}

export function validateEvidencePack(input, blueprint) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Evidence pack must be an object.");
  if (input.version !== 1 || input.episodeId !== blueprint.episodeId) throw new Error("Evidence pack identity mismatch.");
  if (!Array.isArray(input.claims) || input.claims.length < 6) throw new Error("Evidence pack needs at least six claims.");
  const blueprintClaims = new Set(blueprint.provenance?.claimIds ?? []);
  const ids = new Set();
  const claims = input.claims.map((claim, index) => {
    const id = cleanText(claim.id);
    if (!id || ids.has(id) || !blueprintClaims.has(id)) throw new Error(`Evidence claim ${index} is unknown or duplicated.`);
    ids.add(id);
    const status = cleanText(claim.status);
    if (!new Set(["confirmed", "alleged", "disputed"]).has(status)) throw new Error(`${id} has invalid status.`);
    const sourceTitle = cleanText(claim.sourceTitle);
    const sourceUrl = cleanText(claim.sourceUrl);
    const locator = cleanText(claim.locator);
    const statement = cleanText(claim.statement);
    if (!sourceTitle || !/^https:\/\//.test(sourceUrl) || !locator || statement.length < 30) {
      throw new Error(`${id} has incomplete primary-source provenance.`);
    }
    return { id, status, sourceTitle, sourceUrl, locator, statement };
  });
  return { version: 1, episodeId: input.episodeId, language: blueprint.language, claims };
}

function openingKey(text, language) {
  const normalized = cleanText(text).toLocaleLowerCase(language === "ja" ? "ja-JP" : "en-US");
  return language === "ja"
    ? [...normalized.replace(/[\s\p{P}\p{S}]/gu, "")].slice(0, 10).join("")
    : normalized.replace(/[^a-z0-9'\s]/g, " ").split(/\s+/).filter(Boolean).slice(0, 4).join(" ");
}

function repeatedOpeningShare(segments, language) {
  const counts = new Map();
  for (const segment of segments) {
    const key = openingKey(segment.text, language);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return segments.length ? (Math.max(...counts.values()) - 1) / segments.length : 1;
}

function genericPhraseHits(segments, language) {
  const phrases = language === "ja"
    ? ["詳しく見ていきましょう", "いかがでしたか", "結論から言うと", "重要なのは"]
    : ["let's dive in", "in today's video", "as you can see", "the key takeaway is"];
  return segments.flatMap((segment) => phrases.filter((phrase) => segment.text.toLocaleLowerCase().includes(phrase)));
}

export function evaluateProductionScript({ script, blueprint, evidencePack }) {
  const evidenceById = new Map(evidencePack.claims.map((claim) => [claim.id, claim]));
  const plannedScenes = Array.isArray(script?.scenes) ? script.scenes : [];
  const flattened = plannedScenes.flatMap((scene) => Array.isArray(scene.segments) ? scene.segments : []);
  const sceneIds = plannedScenes.map((scene) => scene.sceneId);
  const expectedSceneIds = blueprint.scenes.map((scene) => scene.id);
  const exactSceneOrder = sceneIds.length === expectedSceneIds.length
    && sceneIds.every((id, index) => id === expectedSceneIds[index]);
  const unknownClaims = flattened.flatMap((segment) => segment.claimIds ?? []).filter((id) => !evidenceById.has(id));
  const invalidRoles = flattened.filter((segment) => !ROLES.has(segment.role));
  const badText = flattened.filter((segment) => {
    const length = cleanText(segment.text).length;
    return length < 20 || length > 450;
  });
  const fabricatedQuotes = flattened.filter((segment) => /[“”「」]/u.test(segment.text));
  const unsourcedFacts = flattened.filter((segment) => {
    const ids = Array.isArray(segment.claimIds) ? segment.claimIds : [];
    if (ids.length === 0) return segment.role === "evidence" || segment.role === "outcome";
    return ids.some((id) => !evidenceById.has(id));
  });
  const underSourcedScenes = plannedScenes.filter((scene, index) => {
    const beat = blueprint.scenes[index]?.beat;
    return FACTUAL_BEATS.has(beat) && !scene.segments?.some((segment) => (segment.claimIds?.length ?? 0) > 0);
  });
  const sceneCoverage = plannedScenes.map((scene, index) => {
    const seconds = (scene.segments ?? []).reduce((sum, segment) => sum + estimateSpeechSeconds(segment.text, blueprint.language), 0);
    return { sceneId: scene.sceneId, ratio: seconds / blueprint.scenes[index].durationSeconds, seconds };
  });
  const weakScenePacing = sceneCoverage.filter((scene) => scene.ratio < 0.45 || scene.ratio > 1.05);
  const speechSeconds = sceneCoverage.reduce((sum, scene) => sum + scene.seconds, 0);
  const durationCoverage = speechSeconds / blueprint.targetDurationSeconds;
  const repeatedShare = repeatedOpeningShare(flattened, blueprint.language);
  const genericHits = genericPhraseHits(flattened, blueprint.language);
  const sceneDirectionComplete = plannedScenes.filter((scene) => cleanText(scene.editorialIntent).length >= 20
    && cleanText(scene.visualSync).length >= 15
    && Number(scene.pauseAfterSeconds) >= 0.2 && Number(scene.pauseAfterSeconds) <= 1.5).length;
  const checks = [
    result("script_scene_order", exactSceneOrder, `${plannedScenes.length}/${expectedSceneIds.length} scenes in exact order`, "structure"),
    result("script_segment_density", flattened.length >= blueprint.scenes.length * 2, `${flattened.length} narration segments`, "structure"),
    result("script_segment_roles", invalidRoles.length === 0, `${invalidRoles.length} invalid roles`, "structure"),
    result("script_segment_length", badText.length === 0, `${badText.length} segments outside 20-450 characters`, "craft"),
    result("script_scene_direction", sceneDirectionComplete === blueprint.scenes.length, `${sceneDirectionComplete}/${blueprint.scenes.length} directed scenes`, "craft"),
    result("script_scene_pacing", weakScenePacing.length === 0, `${weakScenePacing.length} scenes outside 45-105% speech coverage`, "pacing"),
    result("script_master_pacing", durationCoverage >= 0.68 && durationCoverage <= 0.86, `${(durationCoverage * 100).toFixed(1)}% planned speech coverage`, "pacing"),
    result("script_known_claims", unknownClaims.length === 0, `${unknownClaims.length} unknown claim references`, "evidence"),
    result("script_evidence_locators", unsourcedFacts.length === 0, `${unsourcedFacts.length} factual segments without an exact locator`, "evidence"),
    result("script_factual_scene_coverage", underSourcedScenes.length === 0, `${underSourcedScenes.length} factual scenes without evidence`, "evidence"),
    result("script_no_fabricated_quotes", fabricatedQuotes.length === 0, `${fabricatedQuotes.length} unsupported direct quotations`, "evidence"),
    result("script_opening_variety", repeatedShare <= 0.12, `${(repeatedShare * 100).toFixed(1)}% maximum repeated opening`, "originality"),
    result("script_no_generic_filler", genericHits.length === 0, `${genericHits.length} generic filler phrases`, "originality"),
  ];
  const blockers = checks.filter((check) => check.blocking && !check.pass);
  const weights = { structure: 20, craft: 20, pacing: 20, evidence: 30, originality: 10 };
  const scores = Object.fromEntries(Object.entries(weights).map(([category, weight]) => {
    const group = checks.filter((check) => check.category === category);
    return [category, Math.round(group.filter((check) => check.pass).length / group.length * weight)];
  }));
  const score = Object.values(scores).reduce((sum, value) => sum + value, 0);
  return {
    version: "2026-08-03.2",
    kind: "production_script",
    status: blockers.length === 0 && score >= 94 ? "pass" : "blocked",
    score,
    threshold: 94,
    scores,
    checks,
    blockers,
    metrics: {
      sceneCount: plannedScenes.length,
      segmentCount: flattened.length,
      speechSeconds: Number(speechSeconds.toFixed(3)),
      durationCoverage: Number(durationCoverage.toFixed(4)),
      repeatedOpeningShare: Number(repeatedShare.toFixed(4)),
    },
  };
}

export function normalizeProductionScript(script, blueprint, evidencePack) {
  const normalized = structuredClone(script);
  const evidenceById = new Map(evidencePack.claims.map((claim) => [claim.id, claim]));
  normalized.version = 1;
  normalized.scenes = (normalized.scenes ?? []).map((scene, index) => {
    const output = { ...scene, sceneId: blueprint.scenes[index]?.id ?? scene.sceneId };
    output.pauseAfterSeconds = Math.max(0.2, Math.min(1.5, Number(output.pauseAfterSeconds) || 0.5));
    output.segments = (output.segments ?? []).map((segment) => {
      const claimIds = (Array.isArray(segment.claimIds) ? segment.claimIds : []).filter((id) => evidenceById.has(id));
      const role = claimIds.length === 0 && (segment.role === "evidence" || segment.role === "outcome")
        ? "transition"
        : segment.role;
      return {
        ...segment,
        role,
        text: cleanText(segment.text)
          .replaceAll("重要なのは", "焦点は")
          .replace(/\bthe key takeaway is\b/gi, "the record leaves one conclusion"),
        claimIds,
        sourceLocator: claimIds.length ? evidenceById.get(claimIds[0]).locator : "",
      };
    });
    const targetDuration = blueprint.scenes[index]?.durationSeconds ?? 1;
    const speechRatio = () => output.segments.reduce((sum, segment) => sum + estimateSpeechSeconds(segment.text, blueprint.language), 0) / targetDuration;
    while (speechRatio() > 1.05 && output.segments.length > 2) {
      const removable = output.segments.findLastIndex((segment) => segment.claimIds.length === 0
        && (segment.role === "transition" || segment.role === "outcome"));
      if (removable < 0) break;
      output.segments.splice(removable, 1);
    }
    return output;
  });
  const totalRatio = () => normalized.scenes.flatMap((scene) => scene.segments)
    .reduce((sum, segment) => sum + estimateSpeechSeconds(segment.text, blueprint.language), 0)
    / blueprint.targetDurationSeconds;
  while (totalRatio() > 0.86) {
    const candidates = normalized.scenes.flatMap((scene, sceneIndex) => scene.segments.map((segment, segmentIndex) => ({
      scene,
      sceneIndex,
      segment,
      segmentIndex,
      seconds: estimateSpeechSeconds(segment.text, blueprint.language),
    }))).filter((item) => item.scene.segments.length > 2
      && item.sceneIndex > 0 && item.sceneIndex < normalized.scenes.length - 1
      && item.segment.claimIds.length === 0 && item.segment.role === "transition")
      .sort((left, right) => right.seconds - left.seconds);
    if (candidates.length === 0) break;
    const selected = candidates[0];
    selected.scene.segments.splice(selected.segmentIndex, 1);
  }
  return normalized;
}

export function toNarrationManifest(script, blueprint, evidencePack, baseManifest) {
  const evidenceById = new Map(evidencePack.claims.map((claim) => [claim.id, claim]));
  const segments = script.scenes.flatMap((scene, sceneIndex) => scene.segments.map((segment, segmentIndex) => {
    const claimIds = Array.isArray(segment.claimIds) ? segment.claimIds : [];
    const sourceLocator = claimIds.length ? evidenceById.get(claimIds[0])?.locator : undefined;
    return {
      id: `narr-${String(sceneIndex + 1).padStart(2, "0")}-${String(segmentIndex + 1).padStart(2, "0")}`,
      role: segment.role,
      sceneId: scene.sceneId,
      targetDurationSeconds: Number(estimateSpeechSeconds(segment.text, blueprint.language).toFixed(3)),
      text: cleanText(segment.text),
      claimIds,
      ...(sourceLocator ? { sourceLocator } : {}),
      editorialIntent: cleanText(scene.editorialIntent),
      visualSync: cleanText(scene.visualSync),
      pauseAfterSeconds: Number(scene.pauseAfterSeconds),
    };
  }));
  return { ...baseManifest, version: 1, episodeId: blueprint.episodeId, language: blueprint.language, segments };
}

export function productionScriptFingerprint(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function buildScriptPrompt(blueprint, evidencePack) {
  const languageInstruction = blueprint.language === "ja"
    ? "Write natural contemporary Japanese narration. Avoid translationese and excessive nominal sentences."
    : "Write idiomatic documentary English with varied sentence length and controlled dramatic tension.";
  return `You are the senior writer of an evidence-led documentary studio. ${languageInstruction}

Create a complete ${blueprint.targetDurationSeconds}-second narration plan for all ${blueprint.scenes.length} scenes. This must sound authored, specific, and cinematic, never like generic AI exposition.

Non-negotiable rules:
- Return JSON only, with {"version":1,"scenes":[...]}. No markdown.
- Keep scenes in the exact order and use the exact sceneId values.
- Each scene has editorialIntent, visualSync, pauseAfterSeconds (0.2-1.5), and 2-6 segments.
- Segment fields: role, text, claimIds, sourceLocator. Roles: hook, evidence, transition, outcome, cta.
- Each scene's spoken text must fill 68-84% of its scene duration. English pace is 2.35 words/second. Japanese pace is 4.7 non-punctuation characters/second.
- Every factual sentence cites one or more claimIds. Use the exact locator for the first claim as sourceLocator.
- Preserve alleged versus confirmed language. Never convert an allegation into a fact.
- Do not invent dialogue, quotations, emails, motives, thoughts, scenes, or composite characters.
- No direct quotation marks. Paraphrase the record.
- Open with tension in the first sentence. Change rhythm and sentence openings. Use silence deliberately.
- Explain mechanisms with concrete cause-and-effect, not jargon. End scenes on a forward-driving question, contrast, or consequence when appropriate.
- Never use generic phrases such as let's dive in, in today's video, as you can see, or the key takeaway is.

Narrative thesis: ${blueprint.narrative.thesis}
Key question: ${blueprint.narrative.keyQuestion}
Counterpoint: ${blueprint.narrative.counterpoint}
Takeaway: ${blueprint.narrative.takeaway}

Scene plan:
${JSON.stringify(blueprint.scenes.map((scene) => ({
    sceneId: scene.id,
    beat: scene.beat,
    durationSeconds: scene.durationSeconds,
    claimIds: scene.claimIds,
    claimStatus: scene.claimStatus,
    sourceLocator: scene.sourceLocator,
    visualWorld: scene.visualWorld,
    evidenceMode: scene.evidenceMode,
    rhythm: scene.rhythm,
  })), null, 2)}

Evidence pack. These are the only factual assertions you may use:
${JSON.stringify(evidencePack.claims, null, 2)}`;
}
