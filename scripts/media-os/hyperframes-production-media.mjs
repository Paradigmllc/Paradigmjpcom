import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { loadNarrationMedia } from "./hyperframes-narration-media.mjs";
import { evaluateLongformNarrationPlan } from "./longform-narration-quality-core.mjs";
import { evaluateSoundDesignPlan, validateSoundDesignManifest } from "./sound-design-core.mjs";

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function loadVisualAssets(episodeId, root) {
  const directory = resolve(root, "renders", "visual-assets", episodeId);
  const manifestPath = resolve(directory, "asset-manifest.json");
  if (!existsSync(manifestPath)) return [];
  const manifest = loadJson(manifestPath);
  if (manifest.episodeId !== episodeId || !Array.isArray(manifest.assets)) throw new Error(`Visual asset manifest for ${episodeId} is invalid.`);
  return manifest.assets.map((asset) => {
    const sourcePath = resolve(asset.outputPath);
    if (!sourcePath.startsWith(directory) || !existsSync(sourcePath)) throw new Error(`Visual asset ${asset.id} is outside its controlled render directory.`);
    const actualHash = createHash("sha256").update(readFileSync(sourcePath)).digest("hex");
    if (actualHash !== asset.outputSha256) throw new Error(`Visual asset ${asset.id} failed SHA-256 verification.`);
    if (asset.realPersonLikeness !== false || asset.rights?.commercialUse !== true) throw new Error(`Visual asset ${asset.id} failed rights review.`);
    return { ...asset, sourcePath, relativePath: `assets/generated/${basename(sourcePath)}` };
  });
}

export function loadProductionMedia(blueprint, root = resolve(".")) {
  const narration = loadNarrationMedia(blueprint.episodeId, root);
  const narrationManifestPath = resolve(root, "operations", blueprint.episodeId, "narration.json");
  const narrationManifest = existsSync(narrationManifestPath) ? loadJson(narrationManifestPath) : null;
  const narrationStatePath = resolve(root, "renders", "narration", blueprint.episodeId, "narration-run.json");
  const narrationState = existsSync(narrationStatePath) ? loadJson(narrationStatePath) : null;
  const narrationQuality = evaluateLongformNarrationPlan({ blueprint, narrationManifest, narrationState });
  const soundManifestPath = resolve(root, "operations", blueprint.episodeId, "sound-design.json");
  let soundDesign = null;
  if (existsSync(soundManifestPath)) {
    soundDesign = validateSoundDesignManifest(loadJson(soundManifestPath), soundManifestPath, {
      episodeId: blueprint.episodeId,
      durationSeconds: blueprint.targetDurationSeconds,
      generatedMusicAllowed: blueprint.syntheticMedia?.generatedMusicAllowed === true,
    });
  }
  const soundQuality = evaluateSoundDesignPlan(soundDesign, blueprint.targetDurationSeconds, false);
  const visualAssets = loadVisualAssets(blueprint.episodeId, root);
  return narration ? { ...narration, narrationQuality, soundDesign, soundQuality, visualAssets } : {
    narrationQuality,
    soundDesign,
    soundQuality,
    visualAssets,
  };
}
