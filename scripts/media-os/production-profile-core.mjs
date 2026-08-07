import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const READINESS = new Set(["production", "preview", "blocked"]);
const OUTPUT_KINDS = new Set(["image", "video", "composition"]);

function assertString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`${label} must be a non-empty string.`);
}

export function validateProductionProfileRegistry(registry) {
  if (!registry || typeof registry.version !== "string" || !Array.isArray(registry.profiles) || registry.profiles.length < 5) {
    throw new Error("Production profile registry requires a version and at least five profiles.");
  }
  const ids = new Set();
  const visualModes = new Set();
  for (const profile of registry.profiles) {
    assertString(profile.id, "profile.id");
    assertString(profile.label, `${profile.id}.label`);
    if (ids.has(profile.id)) throw new Error(`Duplicate production profile ${profile.id}.`);
    ids.add(profile.id);
    if (!OUTPUT_KINDS.has(profile.outputKind)) throw new Error(`${profile.id}.outputKind is unsupported.`);
    if (!READINESS.has(profile.readiness)) throw new Error(`${profile.id}.readiness is unsupported.`);
    if (!Array.isArray(profile.visualModes) || profile.visualModes.length === 0) throw new Error(`${profile.id} requires visualModes.`);
    for (const mode of profile.visualModes) {
      if (visualModes.has(mode)) throw new Error(`Visual mode ${mode} is assigned to multiple production profiles.`);
      visualModes.add(mode);
    }
    if (profile.outputKind !== "composition" && !profile.workflowPath && !profile.workflowPathEnv) {
      throw new Error(`${profile.id} requires workflowPath or workflowPathEnv.`);
    }
    const quality = profile.quality;
    if (!quality || !Number.isFinite(quality.minimumWidth) || !Number.isFinite(quality.minimumHeight)) {
      throw new Error(`${profile.id} requires a quality contract.`);
    }
  }
  return registry;
}

export function loadProductionProfileRegistry(path = resolve("config/comfyui/production-profiles.json")) {
  return validateProductionProfileRegistry(JSON.parse(readFileSync(path, "utf8")));
}

export function profileForVisualMode(registry, visualMode) {
  const profile = registry.profiles.find((candidate) => candidate.visualModes.includes(visualMode));
  if (!profile) throw new Error(`No production profile owns visual mode ${visualMode}.`);
  return profile;
}

export function resolveProfileWorkflow(profile, registryPath, environment = process.env) {
  if (profile.outputKind === "composition") return null;
  const configured = profile.workflowPathEnv ? environment[profile.workflowPathEnv]?.trim() : null;
  const value = configured || profile.workflowPath;
  if (!value) throw new Error(`${profile.id} is blocked until ${profile.workflowPathEnv} is configured.`);
  const path = resolve(dirname(registryPath), value);
  if (!existsSync(path)) throw new Error(`${profile.id} workflow is missing: ${path}`);
  return path;
}

export function resolveProfileBindings(profile, registryPath, environment = process.env) {
  if (profile.outputKind === "composition") return null;
  if (profile.bindings) return profile.bindings;
  const configured = profile.bindingPathEnv ? environment[profile.bindingPathEnv]?.trim() : null;
  if (!configured) throw new Error(`${profile.id} is blocked until ${profile.bindingPathEnv ?? "bindings"} is configured.`);
  const path = resolve(dirname(registryPath), configured);
  if (!existsSync(path)) throw new Error(`${profile.id} binding descriptor is missing: ${path}`);
  const descriptor = JSON.parse(readFileSync(path, "utf8"));
  if (!descriptor || descriptor.version !== 1 || !Array.isArray(descriptor.patches) || descriptor.patches.length === 0) {
    throw new Error(`${profile.id} binding descriptor must contain version 1 patches.`);
  }
  return descriptor;
}

export function runtimeProductionProfile(profile, registryPath, environment = process.env) {
  let workflowReady = profile.outputKind === "composition";
  let bindingsReady = profile.outputKind === "composition";
  let blocker = null;
  try {
    workflowReady = resolveProfileWorkflow(profile, registryPath, environment) !== null || workflowReady;
    bindingsReady = resolveProfileBindings(profile, registryPath, environment) !== null || bindingsReady;
  } catch (error) {
    blocker = error instanceof Error ? error.message : String(error);
  }
  const productionReady = profile.readiness === "production" && workflowReady && bindingsReady;
  return { ...profile, workflowReady, bindingsReady, productionReady, blocker };
}
