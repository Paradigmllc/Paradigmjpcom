import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { buildCompilationFiles } from "./hyperframes-composition-templates.mjs";
import { evaluateProfessionalRender } from "./professional-render-quality-core.mjs";

export const HYPERFRAMES_COMPILER_VERSION = "2026-08-03.1";

const BANNED_FONTS = new Set(["Inter", "Roboto", "Open Sans", "Noto Sans", "Arimo", "Lato", "Source Sans", "PT Sans", "Nunito", "Poppins", "Outfit", "Sora", "Playfair Display", "Cormorant Garamond", "Bodoni Moda", "EB Garamond", "Cinzel", "Prata", "Syne"]);

function assertString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`${label} must be a non-empty string.`);
}

function hexToRgb(hex) {
  const value = hex.slice(1);
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
}

function luminance(hex) {
  const channels = hexToRgb(hex).map((value) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(left, right) {
  const [bright, dark] = [luminance(left), luminance(right)].sort((a, b) => b - a);
  return (bright + 0.05) / (dark + 0.05);
}

export function loadChannelDesignSystems(path) {
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(parsed.channels) || parsed.channels.length !== 12) throw new Error("Exactly 12 channel design systems are required.");
  const ids = new Set();
  const names = new Set();
  for (const design of parsed.channels) {
    for (const key of ["channelId", "name", "mood", "background", "foreground", "surface", "surfaceRaised", "accent", "alleged", "muted", "displayFont", "bodyFont", "monoFont", "layoutSignature", "texture"]) assertString(design[key], `${design.channelId ?? "design"}.${key}`);
    for (const key of ["background", "foreground", "surface", "surfaceRaised", "accent", "alleged", "muted"]) {
      if (!/^#[0-9A-F]{6}$/i.test(design[key])) throw new Error(`${design.channelId}.${key} must be a six-digit hex color.`);
    }
    if (contrast(design.background, design.foreground) < 7) throw new Error(`${design.channelId} foreground contrast must be at least 7:1.`);
    if (contrast(design.background, design.muted) < 4.5) throw new Error(`${design.channelId} muted contrast must be at least 4.5:1.`);
    for (const font of [design.displayFont, design.bodyFont, design.monoFont]) if (BANNED_FONTS.has(font)) throw new Error(`${design.channelId} uses banned font ${font}.`);
    if (ids.has(design.channelId) || names.has(design.name)) throw new Error(`Duplicate design identity ${design.channelId}.`);
    ids.add(design.channelId);
    names.add(design.name);
  }
  return parsed;
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function scaledScenes(blueprint, previewSeconds) {
  if (!previewSeconds) return blueprint.scenes.map((scene) => ({ ...scene }));
  const scale = previewSeconds / blueprint.targetDurationSeconds;
  const minimumDuration = Math.min(3.5, (previewSeconds / blueprint.scenes.length) * 0.65);
  let cursor = 0;
  return blueprint.scenes.map((scene, index) => {
    const remainingScenes = blueprint.scenes.length - index;
    const remainingSeconds = previewSeconds - cursor;
    const durationSeconds = index === blueprint.scenes.length - 1
      ? remainingSeconds
      : Math.max(minimumDuration, Math.min(remainingSeconds - (remainingScenes - 1) * minimumDuration, scene.durationSeconds * scale));
    const result = { ...scene, startSeconds: Number(cursor.toFixed(3)), durationSeconds: Number(durationSeconds.toFixed(3)) };
    cursor += durationSeconds;
    return result;
  });
}

export function compileHyperframesProject({ blueprint, qualityReport, designSystems, previewSeconds = null, media = null }) {
  if (qualityReport.status !== "pass" || qualityReport.score < qualityReport.threshold || qualityReport.blockers.length > 0) throw new Error("Only a passing editorial quality report can be compiled.");
  if (blueprint.episodeId !== qualityReport.episodeId) throw new Error("Blueprint and quality report episode mismatch.");
  const design = designSystems.channels.find((candidate) => candidate.channelId === blueprint.channelId);
  if (!design) throw new Error(`No design system for ${blueprint.channelId}.`);
  const scenes = scaledScenes(blueprint, previewSeconds);
  const duration = previewSeconds ?? blueprint.targetDurationSeconds;
  const files = buildCompilationFiles({ blueprint, design, scenes, duration, previewSeconds, compilerVersion: HYPERFRAMES_COMPILER_VERSION, media });
  const manifest = {
    compilerVersion: HYPERFRAMES_COMPILER_VERSION,
    episodeId: blueprint.episodeId,
    channelId: blueprint.channelId,
    blueprintFingerprint: blueprint.fingerprint,
    qualityGateVersion: qualityReport.version,
    qualityScore: qualityReport.score,
    mode: previewSeconds ? "review_preview" : "full_master",
    durationSeconds: duration,
    sceneCount: scenes.length,
    designSystemVersion: designSystems.version,
    designSignature: design.layoutSignature,
    sourceBlueprintDurationSeconds: blueprint.targetDurationSeconds,
    media: media ? {
      narrationRelativePath: media.narrationRelativePath,
      narrationDurationSeconds: media.narrationDurationSeconds,
      captionGroupCount: Array.isArray(media.captions) ? media.captions.length : 0,
      narrationSha256: media.narrationSha256 ?? null,
      captionSha256: media.captionSha256 ?? null,
      narrationPlanStatus: media.narrationQuality?.status ?? "blocked",
      soundDesignStatus: media.soundQuality?.status ?? "blocked",
      soundTrackCount: media.soundQuality?.metrics?.trackCount ?? 0,
      generatedVisualCount: Array.isArray(media.visualAssets) ? media.visualAssets.length : 0,
    } : null,
  };
  const renderQuality = evaluateProfessionalRender({ files, manifest, media });
  files["professional-render-quality-report.json"] = `${JSON.stringify(renderQuality, null, 2)}\n`;
  manifest.professionalRender = {
    version: renderQuality.version,
    status: renderQuality.status,
    score: renderQuality.score,
    threshold: renderQuality.threshold,
    blockerIds: renderQuality.blockers.map((blocker) => blocker.id),
  };
  manifest.files = Object.fromEntries(Object.entries(files).map(([path, content]) => [path, hash(content)]));
  files["compilation-manifest.json"] = `${JSON.stringify(manifest, null, 2)}\n`;
  return { files, manifest, scenes, design, renderQuality };
}
