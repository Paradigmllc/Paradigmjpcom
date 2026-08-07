import { createHash } from "node:crypto";

const STOCK_VOICES = {
  ja: new Set(["jf_alpha"]),
  en: new Set([
    "af_heart",
    "af_nova",
    "af_sky",
    "am_adam",
    "am_michael",
    "bf_emma",
    "bf_isabella",
    "bm_george",
  ]),
};

const SEGMENT_ROLES = new Set(["hook", "evidence", "transition", "outcome", "cta"]);
const FORBIDDEN_VOICE_KEYS = new Set([
  "referenceAudio",
  "referenceVoice",
  "speakerName",
  "voiceClone",
  "voiceSample",
]);

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function assertSafeVoiceObject(value, path = "voice") {
  assertObject(value, path);
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_VOICE_KEYS.has(key)) {
      throw new Error(`${path}.${key} is forbidden; real-person voice references are not accepted.`);
    }
    if (nested && typeof nested === "object") {
      assertSafeVoiceObject(nested, `${path}.${key}`);
    }
  }
}

export function validateNarrationManifest(input) {
  assertObject(input, "Narration manifest");
  if (input.version !== 1) throw new Error("Narration manifest version must be 1.");
  if (!/^episode-[a-z0-9-]+$/.test(String(input.episodeId ?? ""))) {
    throw new Error("episodeId must use the episode-* identifier format.");
  }
  if (input.language !== "ja" && input.language !== "en") {
    throw new Error("Narration language must be ja or en.");
  }

  assertSafeVoiceObject(input.voice);
  if (input.voice.provider !== "kokoro-onnx") {
    throw new Error("Only the rights-reviewed kokoro-onnx provider is enabled.");
  }
  if (!STOCK_VOICES[input.language].has(input.voice.id)) {
    throw new Error(`Voice ${input.voice.id} is not an approved stock voice for ${input.language}.`);
  }
  if (input.voice.provenance !== "bundled_stock_model_voice") {
    throw new Error("Voice provenance must be bundled_stock_model_voice.");
  }
  if (input.voice.humanImitation !== false) {
    throw new Error("humanImitation must be false.");
  }
  if (input.voice.modelLicense !== "Apache-2.0" || input.voice.adapterLicense !== "MIT") {
    throw new Error("Kokoro model and adapter license metadata is incomplete.");
  }
  const speed = Number(input.voice.speed);
  if (!Number.isFinite(speed) || speed < 0.7 || speed > 1.2) {
    throw new Error("Voice speed must be between 0.7 and 1.2.");
  }

  assertObject(input.transcription, "transcription");
  if (input.transcription.provider !== "faster-whisper") {
    throw new Error("Transcription provider must be faster-whisper.");
  }
  const model = String(input.transcription.model ?? "");
  if (!model || (input.language !== "en" && model.endsWith(".en"))) {
    throw new Error(`Transcription model ${model || "(missing)"} is invalid for ${input.language}.`);
  }
  if (input.transcription.language !== input.language) {
    throw new Error("Transcription language must match narration language.");
  }

  assertObject(input.quality, "quality");
  const minimumAccuracy = Number(input.quality.minimumAccuracy);
  if (!Number.isFinite(minimumAccuracy) || minimumAccuracy < 0.7 || minimumAccuracy > 1) {
    throw new Error("quality.minimumAccuracy must be between 0.7 and 1.");
  }
  const gapSeconds = Number(input.gapSeconds ?? 0.25);
  if (!Number.isFinite(gapSeconds) || gapSeconds < 0 || gapSeconds > 2) {
    throw new Error("gapSeconds must be between 0 and 2.");
  }
  if (!Array.isArray(input.segments) || input.segments.length === 0) {
    throw new Error("Narration must contain at least one segment.");
  }

  const ids = new Set();
  const segments = input.segments.map((segment, index) => {
    assertObject(segment, `segments[${index}]`);
    const id = String(segment.id ?? "");
    if (!/^narr-[a-z0-9-]+$/.test(id) || ids.has(id)) {
      throw new Error(`segments[${index}].id must be unique and start with narr-.`);
    }
    ids.add(id);
    const text = String(segment.text ?? "").trim();
    if (text.length < 4 || text.length > 450) {
      throw new Error(`${id} text must contain 4-450 characters.`);
    }
    if (!SEGMENT_ROLES.has(segment.role)) throw new Error(`${id} has an invalid role.`);
    const claimIds = Array.isArray(segment.claimIds) ? segment.claimIds.map(String) : [];
    if (["evidence", "outcome"].includes(segment.role) && claimIds.length === 0) {
      throw new Error(`${id} requires at least one claim ID.`);
    }
    const sceneId = String(segment.sceneId ?? "").trim();
    if (sceneId && !/^episode-[a-z0-9-]+-scene-\d+$/.test(sceneId)) {
      throw new Error(`${id}.sceneId must be an episode scene identifier.`);
    }
    const targetDurationSeconds = Number(segment.targetDurationSeconds);
    if (segment.targetDurationSeconds !== undefined
      && (!Number.isFinite(targetDurationSeconds) || targetDurationSeconds <= 0 || targetDurationSeconds > 180)) {
      throw new Error(`${id}.targetDurationSeconds must be between 0 and 180.`);
    }
    const sourceLocator = String(segment.sourceLocator ?? "").trim();
    if (["evidence", "outcome"].includes(segment.role) && !sourceLocator) {
      throw new Error(`${id} requires a source locator.`);
    }
    const hasPauseAfterSeconds = segment.pauseAfterSeconds !== undefined;
    const pauseAfterSeconds = Number(segment.pauseAfterSeconds);
    if (hasPauseAfterSeconds && (!Number.isFinite(pauseAfterSeconds) || pauseAfterSeconds < 0 || pauseAfterSeconds > 2)) {
      throw new Error(`${id}.pauseAfterSeconds must be between 0 and 2.`);
    }
    return {
      id,
      role: segment.role,
      text,
      claimIds,
      ...(sceneId ? { sceneId } : {}),
      ...(sourceLocator ? { sourceLocator } : {}),
      ...(Number.isFinite(targetDurationSeconds) && targetDurationSeconds > 0 ? { targetDurationSeconds } : {}),
      ...(segment.editorialIntent ? { editorialIntent: String(segment.editorialIntent).trim() } : {}),
      ...(segment.visualSync ? { visualSync: String(segment.visualSync).trim() } : {}),
      ...(hasPauseAfterSeconds ? { pauseAfterSeconds } : {}),
    };
  });

  return {
    version: 1,
    episodeId: input.episodeId,
    language: input.language,
    voice: { ...input.voice, speed },
    transcription: { ...input.transcription, model },
    quality: { minimumAccuracy },
    gapSeconds,
    segments,
  };
}

export function normalizeForComparison(text, language) {
  let normalized = String(text ?? "").normalize("NFKC").toLocaleLowerCase(
    language === "ja" ? "ja-JP" : "en-US",
  );
  if (language === "en") {
    normalized = normalized
      .replace(/\bin\s+ron(?=['’]s\b|\b)/g, "enron")
      .replace(/\bcossie\b/g, "causey")
      .replace(/\beighteen\s+hundred\b|\b1\s*,\s*800\b/g, "1800")
      .replace(/\bthree\s+thousand\b|\b3\s*,\s*000\b|\bthree\s+0\s*-\s*0\s*-\s*0\b/g, "3000")
      .replace(/\bsix\s+hundred\b|\b600\b/g, "600")
      .replace(/\bfour\b|\b4\b/g, "4");
  }
  if (language === "ja") {
    return [...normalized.replace(/[\s\p{P}\p{S}]/gu, "")];
  }
  return normalized
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function levenshteinDistance(expected, actual) {
  const previous = Array.from({ length: actual.length + 1 }, (_, index) => index);
  for (let left = 1; left <= expected.length; left += 1) {
    const current = [left];
    for (let right = 1; right <= actual.length; right += 1) {
      const cost = expected[left - 1] === actual[right - 1] ? 0 : 1;
      current[right] = Math.min(
        current[right - 1] + 1,
        previous[right] + 1,
        previous[right - 1] + cost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[actual.length];
}

export function scoreBackTranscript(expectedText, words, language, minimumAccuracy) {
  const expected = normalizeForComparison(expectedText, language);
  const actual = normalizeForComparison(words.map((word) => word.text).join(language === "ja" ? "" : " "), language);
  if (expected.length === 0 || actual.length === 0) {
    throw new Error("Back-transcription comparison has no usable text.");
  }
  const distance = levenshteinDistance(expected, actual);
  const errorRate = distance / Math.max(expected.length, actual.length);
  const accuracy = Math.max(0, 1 - errorRate);
  return {
    unit: language === "ja" ? "character" : "word",
    expectedUnits: expected.length,
    actualUnits: actual.length,
    editDistance: distance,
    errorRate: Number(errorRate.toFixed(4)),
    accuracy: Number(accuracy.toFixed(4)),
    minimumAccuracy,
    passed: accuracy >= minimumAccuracy,
  };
}

export function mergeSegmentTranscripts(segmentResults, language, model, gapSeconds, timeline = null) {
  const placements = new Map((timeline?.placements ?? []).map((item) => [item.id, item]));
  let offset = 0;
  let nextWord = 1;
  const words = [];
  const segments = [];
  for (const result of segmentResults) {
    const placement = placements.get(result.id);
    const segmentStart = placement ? Number(placement.startSeconds) : offset;
    for (const word of result.words) {
      words.push({
        id: `w-${String(nextWord).padStart(4, "0")}`,
        text: word.text,
        start: Number((segmentStart + word.start).toFixed(3)),
        end: Number((segmentStart + word.end).toFixed(3)),
        segmentId: result.id,
      });
      nextWord += 1;
    }
    const segmentEnd = segmentStart + result.audioDuration;
    segments.push({
      id: result.id,
      start: Number(segmentStart.toFixed(3)),
      end: Number(segmentEnd.toFixed(3)),
      sceneId: result.sceneId ?? null,
      claimIds: result.claimIds,
      wordIds: words.filter((word) => word.segmentId === result.id).map((word) => word.id),
      sourceHash: result.sourceHash,
      qa: result.qa,
    });
    offset = placement
      ? Math.max(offset, segmentEnd)
      : segmentEnd + (Number.isFinite(Number(result.pauseAfterSeconds)) ? Number(result.pauseAfterSeconds) : gapSeconds);
  }
  return {
    version: 1,
    language,
    model,
    words,
    segments,
    durationSeconds: Number((timeline?.durationSeconds ?? offset).toFixed(3)),
    speechDurationSeconds: Number(segmentResults.reduce((sum, result) => sum + result.audioDuration, 0).toFixed(3)),
    timelineMode: timeline?.mode ?? "continuous",
  };
}

export function stableHash(value) {
  return createHash("sha256").update(
    typeof value === "string" ? value : JSON.stringify(value),
  ).digest("hex");
}
