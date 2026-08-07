import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir, rename, stat, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { comfyOutputFiles, comfyOutputVerification, generatedAssetRecord, materializeProfileWorkflow, materializeWorkflow, validateVisualAssetManifest } from "./gpu-asset-core.mjs";
import { loadProductionProfileRegistry, profileForVisualMode, resolveProfileBindings, resolveProfileWorkflow, runtimeProductionProfile } from "./production-profile-core.mjs";
import { withVastComfyInstance } from "./vast-lifecycle.mjs";
import { evaluateGeneratedAsset, evaluateGeneratedAssetSet } from "./visual-asset-quality-core.mjs";

function valueAfter(argv, flag, fallback = null) {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

function parseArgs(argv) {
  const manifestPath = argv[0];
  const output = valueAfter(argv, "--output");
  if (!manifestPath || !output) throw new Error("Usage: node scripts/run-comfyui-assets.mjs <visual-assets.json> --output <directory> [--provision-vast]");
  return { manifestPath: resolve(manifestPath), output: resolve(output), provisionVast: argv.includes("--provision-vast") };
}

async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

function headers() {
  const apiKey = process.env.COMFYUI_API_KEY?.trim();
  return { "Content-Type": "application/json", ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) };
}

async function requestJson(url, options = {}, timeoutMs = 60_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, headers: { ...headers(), ...options.headers }, signal: controller.signal });
    const body = await response.json();
    if (!response.ok) throw new Error(`ComfyUI HTTP ${response.status}: ${JSON.stringify(body).slice(0, 1000)}`);
    return body;
  } finally {
    clearTimeout(timer);
  }
}

async function waitUntilReady(endpoint) {
  for (let attempt = 0; attempt < 180; attempt += 1) {
    try {
      await requestJson(new URL("system_stats", endpoint), {}, 10_000);
      return;
    } catch (error) {
      if (attempt === 179) throw error;
      await new Promise((resolveWait) => setTimeout(resolveWait, 5_000));
    }
  }
}

async function probeMedia(path) {
  const executable = process.env.FFPROBE_PATH?.trim() || "ffprobe";
  const result = spawnSync(executable, ["-v", "error", "-show_entries", "format=duration,size:stream=codec_type,width,height,pix_fmt", "-of", "json", path], {
    encoding: "utf8", maxBuffer: 1024 * 1024,
  });
  if (result.error) throw new Error(`ffprobe failed for ${path}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`ffprobe rejected ${path}: ${String(result.stderr ?? "").slice(-1000)}`);
  const parsed = JSON.parse(result.stdout);
  const video = parsed.streams?.find((stream) => stream.codec_type === "video") ?? parsed.streams?.[0];
  const file = await stat(path);
  return {
    width: Number(video?.width ?? 0),
    height: Number(video?.height ?? 0),
    durationSeconds: Number.isFinite(Number(parsed.format?.duration)) ? Number(parsed.format.duration) : 0,
    pixelFormat: video?.pix_fmt ?? null,
    bytes: file.size,
  };
}

async function generateAsset(endpoint, workflow, asset, profile, outputDirectory, hourlyRateUsd) {
  const clientId = randomUUID();
  const startedAt = Date.now();
  const queued = await requestJson(new URL("prompt", endpoint), {
    method: "POST",
    body: JSON.stringify({ prompt: workflow, client_id: clientId }),
  });
  if (!queued.prompt_id) throw new Error(`ComfyUI did not return prompt_id for ${asset.id}.`);
  let history = null;
  for (let attempt = 0; attempt < 450; attempt += 1) {
    history = await requestJson(new URL(`history/${encodeURIComponent(queued.prompt_id)}`, endpoint));
    if (comfyOutputFiles(history, queued.prompt_id, profile.outputKind).length > 0) break;
    await new Promise((resolveWait) => setTimeout(resolveWait, 2_000));
  }
  const outputs = comfyOutputFiles(history, queued.prompt_id, profile.outputKind);
  if (outputs.length === 0) throw new Error(`ComfyUI generation timed out for ${asset.id}.`);
  const providerOutput = outputs[0];
  const viewUrl = new URL("view", endpoint);
  viewUrl.search = new URLSearchParams({ filename: providerOutput.filename, subfolder: providerOutput.subfolder ?? "", type: providerOutput.type ?? "output" }).toString();
  const response = await fetch(viewUrl, { headers: headers() });
  if (!response.ok) throw new Error(`ComfyUI image download failed with HTTP ${response.status}.`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 10_000) throw new Error(`ComfyUI output for ${asset.id} is unexpectedly small.`);
  const allowedExtensions = profile.outputKind === "video" ? [".mp4", ".webm", ".mov", ".gif"] : [".png", ".jpg", ".jpeg", ".webp"];
  const providerExtension = extname(providerOutput.filename).toLowerCase();
  const extension = allowedExtensions.includes(providerExtension) ? providerExtension : profile.outputKind === "video" ? ".mp4" : ".png";
  const outputPath = resolve(outputDirectory, `${asset.id}${extension}`);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buffer);
  const probe = await probeMedia(outputPath);
  return {
    generated: generatedAssetRecord({
    asset,
    workflow,
    outputPath,
    outputSha256: createHash("sha256").update(buffer).digest("hex"),
    elapsedSeconds: (Date.now() - startedAt) / 1000,
    hourlyRateUsd,
    promptId: queued.prompt_id,
      probe,
    }),
    verification: comfyOutputVerification(history, queued.prompt_id),
  };
}

async function run(endpointValue, manifest, manifestDirectory, outputDirectory) {
  const endpoint = new URL(endpointValue.endsWith("/") ? endpointValue : `${endpointValue}/`);
  if (!["http:", "https:"].includes(endpoint.protocol)) throw new Error("COMFYUI_API_URL must use HTTP or HTTPS.");
  await waitUntilReady(endpoint);
  const hourlyRateUsd = Number(process.env.VAST_HOURLY_RATE_USD ?? 0);
  const outputs = [];
  const qualityReports = [];
  const workflowCache = new Map();
  let registry = null;
  let registryPath = null;
  let legacyWorkflow = null;
  if (manifest.version === 2) {
    registryPath = resolve(manifestDirectory, manifest.registryPath);
    if (!registryPath.startsWith(resolve("."))) throw new Error("registryPath must remain inside the Media OS project.");
    registry = loadProductionProfileRegistry(registryPath);
  } else {
    const workflowPath = resolve(manifestDirectory, manifest.workflowPath);
    if (!workflowPath.startsWith(resolve("."))) throw new Error("workflowPath must remain inside the Media OS project.");
    legacyWorkflow = JSON.parse(readFileSync(workflowPath, "utf8"));
  }
  for (const asset of manifest.assets) {
    const profile = manifest.version === 2
      ? registry.profiles.find((candidate) => candidate.id === asset.productionProfileId)
      : { id: "legacy_sdxl", outputKind: "image", readiness: "preview", bindings: manifest.bindings,
        quality: { minimumWidth: asset.width ?? 1344, minimumHeight: asset.height ?? 768, minimumBytes: 10000, requireAlpha: false, requireLipSyncScore: false, requireIdentityScore: false } };
    if (!profile) throw new Error(`Unknown production profile ${asset.productionProfileId}.`);
    if (manifest.version === 2) {
      const owner = profileForVisualMode(registry, asset.generationRole);
      if (owner.id !== profile.id) throw new Error(`${asset.id} profile does not own ${asset.generationRole}.`);
      const runtime = runtimeProductionProfile(profile, registryPath);
      if (!runtime.workflowReady) throw new Error(runtime.blocker ?? `${profile.id} workflow is not ready.`);
    }
    const workflowPath = manifest.version === 2 ? resolveProfileWorkflow(profile, registryPath) : null;
    const bindings = manifest.version === 2 ? resolveProfileBindings(profile, registryPath) : manifest.bindings;
    if (workflowPath && !workflowCache.has(workflowPath)) workflowCache.set(workflowPath, JSON.parse(readFileSync(workflowPath, "utf8")));
    const baseWorkflow = workflowPath ? workflowCache.get(workflowPath) : legacyWorkflow;
    const workflow = manifest.version === 2
      ? materializeProfileWorkflow(baseWorkflow, { ...profile, bindings }, asset)
      : materializeWorkflow(baseWorkflow, manifest.bindings, asset);
    const { generated, verification } = await generateAsset(endpoint, workflow, asset, profile, outputDirectory, hourlyRateUsd);
    generated.verification = verification;
    const report = evaluateGeneratedAsset({ profile, asset, generated, verification });
    await writeJsonAtomic(resolve(outputDirectory, `${asset.id}.quality.json`), report);
    qualityReports.push(report);
    if (report.status !== "pass") throw new Error(`${asset.id} failed visual asset QA: ${report.blockerIds.join(", ")}`);
    outputs.push(generated);
  }
  const setReport = evaluateGeneratedAssetSet(outputs);
  await writeJsonAtomic(resolve(outputDirectory, "asset-set-quality.json"), setReport);
  if (setReport.status !== "pass") throw new Error(`Generated asset set contains duplicate outputs: ${setReport.duplicateAssetIds.join(", ")}`);
  return { outputs, qualityReports, setReport };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const manifest = validateVisualAssetManifest(JSON.parse(readFileSync(options.manifestPath, "utf8")));
  const manifestDirectory = dirname(options.manifestPath);
  const execute = (endpoint) => run(endpoint, manifest, manifestDirectory, options.output);
  let result;
  let vastInstanceId = null;
  if (options.provisionVast) {
    const apiKey = process.env.VAST_API_KEY?.trim();
    if (!apiKey) throw new Error("VAST_API_KEY is required for --provision-vast.");
    result = await withVastComfyInstance({
      apiKey,
      offerId: process.env.VAST_OFFER_ID?.trim(),
      image: process.env.VAST_COMFYUI_IMAGE?.trim(),
      diskGb: Number(process.env.VAST_DISK_GB ?? 60),
      label: `media-os-${manifest.episodeId}`,
      startCommand: process.env.VAST_COMFYUI_START_COMMAND?.trim() || "python main.py --listen 0.0.0.0 --port 8188",
      urlTemplate: process.env.VAST_COMFYUI_URL_TEMPLATE?.trim(),
    }, async ({ instanceId, endpoint }) => {
      vastInstanceId = instanceId;
      return execute(endpoint);
    });
  } else {
    const endpoint = process.env.COMFYUI_API_URL?.trim();
    if (!endpoint) throw new Error("COMFYUI_API_URL is required; GPU assets will not be fabricated.");
    result = await execute(endpoint);
  }
  const { outputs, qualityReports, setReport } = result;
  const assetManifest = {
    version: "2026-08-03.1",
    episodeId: manifest.episodeId,
    provider: options.provisionVast ? "comfyui_on_vast" : "comfyui",
    vastInstanceId,
    completedAt: new Date().toISOString(),
    totalCostUsd: outputs.reduce((sum, asset) => sum + asset.costUsd, 0),
    qualityStatus: setReport.status,
    qualityReportCount: qualityReports.length,
    qualityReports,
    assetSetQuality: setReport,
    assets: outputs,
  };
  const assetManifestPath = resolve(options.output, "asset-manifest.json");
  await writeJsonAtomic(assetManifestPath, assetManifest);
  process.stdout.write(`${JSON.stringify({ ok: true, assetManifestPath, assets: outputs.length, totalCostUsd: assetManifest.totalCostUsd })}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
