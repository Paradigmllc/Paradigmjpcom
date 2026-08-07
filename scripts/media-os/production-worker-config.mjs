export const supportedWorkerRenderers = Object.freeze([
  "research_ingest",
  "narration",
  "editorial_blueprint",
  "entertainment_pilot",
  "hyperframes",
  "professional_master",
  "comfyui_hyperframes",
]);

export function configuredWorkerRenderers(value = process.env.MEDIA_OS_WORKER_RENDERERS) {
  const requested = (value?.trim() || supportedWorkerRenderers.join(","))
    .split(",")
    .map((renderer) => renderer.trim())
    .filter(Boolean);
  const unique = [...new Set(requested)];
  const unsupported = unique.filter((renderer) => !supportedWorkerRenderers.includes(renderer));
  if (unsupported.length > 0) {
    throw new Error(`Unsupported MEDIA_OS_WORKER_RENDERERS: ${unsupported.join(", ")}`);
  }
  if (unique.length === 0) throw new Error("MEDIA_OS_WORKER_RENDERERS must enable at least one renderer.");
  return unique;
}

export function rendererSqlList(renderers) {
  return {
    placeholders: renderers.map(() => "?").join(","),
    parameters: [...renderers],
  };
}
