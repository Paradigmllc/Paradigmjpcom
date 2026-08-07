import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export function loadNarrationMedia(episodeId, root = resolve(".")) {
  const narrationDirectory = resolve(root, "renders", "narration", episodeId);
  const statePath = resolve(narrationDirectory, "narration-run.json");
  const captionsPath = resolve(narrationDirectory, "captions.json");
  const narrationPath = resolve(narrationDirectory, "narration.wav");
  if (![statePath, captionsPath, narrationPath].every((path) => existsSync(path))) return null;
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  const captionDocument = JSON.parse(readFileSync(captionsPath, "utf8"));
  if (state.status !== "review_required") throw new Error(`Narration for ${episodeId} is not ready for review.`);
  if (!Array.isArray(captionDocument.captions) || captionDocument.captions.length === 0) {
    throw new Error(`Narration captions for ${episodeId} are empty.`);
  }
  if (!Number.isFinite(state.durationSeconds) || state.durationSeconds <= 0) {
    throw new Error(`Narration duration for ${episodeId} is invalid.`);
  }
  return {
    sourceNarrationPath: narrationPath,
    sourceCaptionsPath: captionsPath,
    narrationRelativePath: "assets/narration.wav",
    narrationDurationSeconds: state.durationSeconds,
    narrationSha256: state.narrationSha256,
    captionSha256: state.captionSha256,
    captions: captionDocument.captions,
    rights: state.rights,
  };
}

export function copyNarrationMedia(media, projectDirectory) {
  if (media?.sourceNarrationPath && media?.sourceCaptionsPath && media?.narrationRelativePath) {
    const narrationDestination = resolve(projectDirectory, media.narrationRelativePath);
    mkdirSync(dirname(narrationDestination), { recursive: true });
    copyFileSync(media.sourceNarrationPath, narrationDestination);
    copyFileSync(media.sourceCaptionsPath, resolve(projectDirectory, "assets", "captions.json"));
  }
  for (const asset of media?.visualAssets ?? []) {
    const destination = resolve(projectDirectory, asset.relativePath);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(asset.sourcePath, destination);
  }
}
