import { createHash } from "node:crypto";
import { buildCompilationFiles } from "./hyperframes-composition-templates.mjs";

export const ENTERTAINMENT_HYPERFRAMES_VERSION = "2026-08-03.2";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function validateInputs(plan, blueprint, design, media) {
  if (plan?.episodeId !== blueprint?.episodeId || !Array.isArray(plan?.shots) || plan.shots.length < 14) {
    throw new Error("Entertainment HyperFrames compilation requires a matching 14+ shot pilot plan.");
  }
  if (design?.channelId !== blueprint.channelId) throw new Error("Entertainment pilot design system does not match the channel.");
  const available = new Set((media?.visualAssets ?? []).map((asset) => asset.id));
  const missing = plan.visualAssetManifest.assets.filter((asset) => !available.has(asset.id));
  if (missing.length > 0) throw new Error(`Entertainment pilot is missing ${missing.length} generated assets: ${missing.slice(0, 4).map((asset) => asset.id).join(", ")}`);
}

function shotScenes(plan) {
  return plan.shots.map((shot) => ({
    id: `${plan.episodeId}-${shot.id}`,
    ordinal: shot.ordinal,
    beat: shot.storyFunction,
    storyFunction: shot.storyFunction,
    startSeconds: shot.startSeconds,
    durationSeconds: shot.durationSeconds,
    claimIds: shot.claimIds,
    claimStatus: shot.claimStatus,
    sourceLocator: shot.sourceLocator,
    sourceLocators: shot.sourceLocator ? [{ locator: shot.sourceLocator, status: shot.claimStatus }] : [],
    visualWorld: shot.visualMode,
    visualMode: shot.visualMode,
    productionProfileId: shot.productionProfileId,
    motionTreatment: shot.motionTreatment,
    evidenceMode: shot.visualMode,
    visualElements: ["cinematic plate", "vignette", "grain", "moving light", "shot rail", "narrative anchor", "source attribution", "progress rail"],
    choreographyVerb: shot.transitionOut,
    transitionOut: shot.transitionOut,
    rhythm: shot.energy,
    narrationExcerpt: shot.narrationExcerpt,
    onScreenCopy: shot.onScreenCopy,
    compositionVariant: shot.compositionVariant,
    hostMode: shot.hostMode,
    entertainmentShot: true,
  }));
}

export function compileEntertainmentHyperframesProject({ plan, blueprint, design, media }) {
  validateInputs(plan, blueprint, design, media);
  const scenes = shotScenes(plan);
  const entertainmentBlueprint = {
    ...blueprint,
    narrative: blueprint.narrative ?? { rhythmDeclaration: plan.rhythm ?? "HOOK-fast-fast-BREATHE-reveal-REVERSAL-cliffhanger" },
    targetDurationSeconds: plan.durationSeconds,
    scenes,
  };
  const files = buildCompilationFiles({
    blueprint: entertainmentBlueprint,
    design,
    scenes,
    duration: plan.durationSeconds,
    previewSeconds: plan.durationSeconds,
    compilerVersion: ENTERTAINMENT_HYPERFRAMES_VERSION,
    media,
  });
  const manifest = {
    compilerVersion: ENTERTAINMENT_HYPERFRAMES_VERSION,
    kind: "entertainment_pilot",
    episodeId: plan.episodeId,
    channelId: plan.channelId,
    durationSeconds: plan.durationSeconds,
    shotCount: scenes.length,
    formatFamily: plan.formatFamily,
    planFingerprint: plan.fingerprint,
    generatedVisualCount: media.visualAssets.length,
    fullMotionShare: Number((scenes.filter((scene) => ["performance_motion", "full_motion"].includes(scene.motionTreatment)).reduce((sum, scene) => sum + scene.durationSeconds, 0) / plan.durationSeconds).toFixed(4)),
    hostPresenceShare: Number((scenes.filter((scene) => scene.hostMode !== "offscreen_narration").reduce((sum, scene) => sum + scene.durationSeconds, 0) / plan.durationSeconds).toFixed(4)),
  };
  manifest.files = Object.fromEntries(Object.entries(files).map(([path, content]) => [path, sha256(content)]));
  files["entertainment-compilation-manifest.json"] = `${JSON.stringify(manifest, null, 2)}\n`;
  return { files, manifest, scenes };
}
