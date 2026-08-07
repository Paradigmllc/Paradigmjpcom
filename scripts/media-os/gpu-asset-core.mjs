import { createHash } from "node:crypto";

export function sha256(value) {
  return createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
}

export function validateVisualAssetManifest(manifest) {
  if (!manifest || ![1, 2].includes(manifest.version) || !/^episode-[a-z0-9-]+$/.test(String(manifest.episodeId ?? ""))) {
    throw new Error("Visual asset manifest requires version 1 or 2 and a valid episodeId.");
  }
  if (!Array.isArray(manifest.assets) || manifest.assets.length === 0) {
    throw new Error("Visual asset manifest requires assets.");
  }
  if (manifest.version === 1 && typeof manifest.workflowPath !== "string") {
    throw new Error("Version 1 visual asset manifest requires workflowPath.");
  }
  if (manifest.version === 2 && typeof manifest.registryPath !== "string") {
    throw new Error("Version 2 visual asset manifest requires registryPath.");
  }
  const ids = new Set();
  for (const asset of manifest.assets) {
    if (!/^[a-z0-9-]+$/.test(String(asset.id ?? "")) || ids.has(asset.id)) throw new Error(`Invalid or duplicate asset id ${asset.id}.`);
    ids.add(asset.id);
    if (!Number.isInteger(asset.sceneOrdinal) || asset.sceneOrdinal < 1 || asset.sceneOrdinal > 20) throw new Error(`${asset.id}.sceneOrdinal must be 1-20.`);
    if (!Number.isInteger(asset.seed) || asset.seed < 0) throw new Error(`${asset.id}.seed must be a non-negative integer.`);
    if (typeof asset.prompt !== "string" || asset.prompt.length < 40 || typeof asset.negativePrompt !== "string") {
      throw new Error(`${asset.id} requires authored positive and negative prompts.`);
    }
    if (asset.realPersonLikeness !== false) throw new Error(`${asset.id} must explicitly disable real-person likeness.`);
    if (asset.rights?.mode !== "project_generated" || !asset.rights?.commercialUse) throw new Error(`${asset.id} lacks commercial-use generation rights metadata.`);
    if (asset.photorealistic && asset.disclosureRequired !== true) throw new Error(`${asset.id} photorealistic output requires disclosure.`);
    if (manifest.version === 2) {
      if (!/^[a-z0-9_]+$/.test(String(asset.productionProfileId ?? ""))) throw new Error(`${asset.id} requires productionProfileId.`);
      if (!['image', 'video'].includes(asset.expectedOutputKind)) throw new Error(`${asset.id} requires image or video expectedOutputKind.`);
      if (asset.expectedOutputKind === "video" && (!Number.isFinite(asset.durationSeconds) || asset.durationSeconds <= 0 || asset.durationSeconds > 12)) {
        throw new Error(`${asset.id} video duration must be greater than zero and at most 12 seconds.`);
      }
    }
  }
  return manifest;
}

function node(workflow, id, classType) {
  const candidate = workflow[String(id)];
  if (!candidate || candidate.class_type !== classType || !candidate.inputs) throw new Error(`Workflow node ${id} must be ${classType}.`);
  return candidate;
}

export function materializeWorkflow(baseWorkflow, bindings, asset) {
  const workflow = structuredClone(baseWorkflow);
  node(workflow, bindings.positiveTextNode, "CLIPTextEncode").inputs.text = asset.prompt;
  node(workflow, bindings.negativeTextNode, "CLIPTextEncode").inputs.text = asset.negativePrompt;
  node(workflow, bindings.samplerNode, "KSampler").inputs.seed = asset.seed;
  const latent = node(workflow, bindings.latentNode, "EmptyLatentImage").inputs;
  latent.width = asset.width ?? 1344;
  latent.height = asset.height ?? 768;
  node(workflow, bindings.saveNode, "SaveImage").inputs.filename_prefix = asset.id;
  return workflow;
}

export function materializeProfileWorkflow(baseWorkflow, profile, asset) {
  if (!profile?.bindings) throw new Error(`${profile?.id ?? "Unknown profile"} does not define materializable workflow bindings.`);
  if (profile.outputKind !== asset.expectedOutputKind) {
    throw new Error(`${asset.id} expects ${asset.expectedOutputKind}, but ${profile.id} produces ${profile.outputKind}.`);
  }
  if (!Array.isArray(profile.bindings.patches)) return materializeWorkflow(baseWorkflow, profile.bindings, asset);
  const workflow = structuredClone(baseWorkflow);
  for (const patch of profile.bindings.patches) {
    const candidate = workflow[String(patch.nodeId)];
    if (!candidate?.inputs) throw new Error(`${profile.id} binding node ${patch.nodeId} does not exist.`);
    if (patch.classType && candidate.class_type !== patch.classType) throw new Error(`${profile.id} binding node ${patch.nodeId} must be ${patch.classType}.`);
    const value = String(patch.source).split(".").reduce((current, key) => current?.[key], asset);
    if (value === undefined || value === null) throw new Error(`${asset.id} is missing binding source ${patch.source}.`);
    candidate.inputs[patch.input] = value;
  }
  return workflow;
}

export function generatedAssetRecord({ asset, workflow, outputPath, outputSha256, elapsedSeconds, hourlyRateUsd, promptId, probe = null }) {
  const costUsd = Number.isFinite(hourlyRateUsd) && hourlyRateUsd >= 0 ? (elapsedSeconds / 3600) * hourlyRateUsd : 0;
  return {
    id: asset.id,
    sceneOrdinal: asset.sceneOrdinal,
    provider: "comfyui",
    promptId,
    outputPath,
    outputSha256,
    workflowSha256: sha256(workflow),
    promptSha256: sha256(`${asset.prompt}\n${asset.negativePrompt}`),
    seed: asset.seed,
    width: asset.width ?? 1344,
    height: asset.height ?? 768,
    actualWidth: probe?.width ?? null,
    actualHeight: probe?.height ?? null,
    durationSeconds: probe?.durationSeconds ?? null,
    pixelFormat: probe?.pixelFormat ?? null,
    bytes: probe?.bytes ?? null,
    productionProfileId: asset.productionProfileId ?? "legacy_sdxl",
    outputKind: asset.expectedOutputKind ?? "image",
    photorealistic: Boolean(asset.photorealistic),
    disclosureRequired: Boolean(asset.disclosureRequired),
    realPersonLikeness: false,
    rights: asset.rights,
    elapsedSeconds,
    costUsd,
  };
}

export function comfyOutputFiles(history, promptId, outputKind = "image") {
  const entry = history?.[promptId] ?? history;
  const outputs = entry?.outputs;
  if (!outputs || typeof outputs !== "object") return [];
  const keys = outputKind === "video" ? ["videos", "gifs", "images"] : ["images"];
  return Object.values(outputs).flatMap((output) => keys.flatMap((key) => Array.isArray(output?.[key]) ? output[key] : []));
}

export function comfyOutputImages(history, promptId) {
  return comfyOutputFiles(history, promptId, "image");
}

export function comfyOutputVerification(history, promptId) {
  const entry = history?.[promptId] ?? history;
  const outputs = entry?.outputs;
  const verification = {};
  if (!outputs || typeof outputs !== "object") return verification;
  for (const output of Object.values(outputs)) {
    const candidates = [output, output?.verification, output?.ui];
    for (const candidate of candidates) {
      if (!candidate || typeof candidate !== "object") continue;
      const lipSync = candidate.lipSyncScore ?? candidate.lip_sync_score;
      const identity = candidate.identityScore ?? candidate.identity_score;
      if (Number.isFinite(Number(lipSync))) verification.lipSyncScore = Number(lipSync);
      if (Number.isFinite(Number(identity))) verification.identityScore = Number(identity);
    }
  }
  return verification;
}
