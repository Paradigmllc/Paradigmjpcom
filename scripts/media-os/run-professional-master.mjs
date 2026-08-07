import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

function parseArgs(argv) {
  const episodeId = argv[0];
  if (!/^episode-[a-z0-9-]+$/.test(String(episodeId ?? ""))) {
    throw new Error("Usage: node scripts/run-professional-master.mjs <episode-id> [--preview-seconds 30-180] [--workers 1|2] [--generate-script]");
  }
  const previewIndex = argv.indexOf("--preview-seconds");
  const previewSeconds = previewIndex >= 0 ? Number(argv[previewIndex + 1]) : null;
  if (previewSeconds !== null && (!Number.isFinite(previewSeconds) || previewSeconds < 30 || previewSeconds > 180)) {
    throw new Error("--preview-seconds must be between 30 and 180.");
  }
  const workerIndex = argv.indexOf("--workers");
  const workers = Number(workerIndex >= 0 ? argv[workerIndex + 1] : 2);
  if (![1, 2].includes(workers)) throw new Error("--workers must be 1 or 2.");
  return { episodeId, previewSeconds, workers, generateScript: argv.includes("--generate-script") };
}

async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

async function previewSoundManifest(sourcePath, outputPath, durationSeconds) {
  const input = JSON.parse(readFileSync(sourcePath, "utf8"));
  const sourceBase = dirname(sourcePath);
  const beds = input.tracks
    .filter((track) => track.kind !== "sfx" && track.startSeconds < durationSeconds)
    .map((track) => ({
      ...track,
      source: resolve(sourceBase, track.source),
      durationSeconds: Math.min(track.durationSeconds, durationSeconds - track.startSeconds),
    }));
  const cueTimes = [8, 26, 44].filter((time) => time < durationSeconds - 1);
  const cues = input.tracks.filter((track) => track.kind === "sfx").slice(0, cueTimes.length).map((track, index) => ({
    ...track,
    id: `${track.id}-preview-${index + 1}`,
    source: resolve(sourceBase, track.source),
    startSeconds: cueTimes[index],
    durationSeconds: Math.min(track.durationSeconds, durationSeconds - cueTimes[index]),
  }));
  if (beds.length === 0 || cues.length < Math.min(3, cueTimes.length)) {
    throw new Error("Preview sound design could not provide complete bed and cue coverage.");
  }
  await writeJsonAtomic(outputPath, { ...input, tracks: [...beds, ...cues] });
  return outputPath;
}

function runNode(script, args) {
  const result = spawnSync(process.execPath, [resolve(script), ...args], {
    cwd: resolve("."),
    env: process.env,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`${script} failed${detail ? `: ${detail.slice(-4000)}` : ""}`);
  }
  return String(result.stdout ?? "").trim();
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const operationDirectory = resolve("operations", options.episodeId);
  const required = ["editorial.json", "narration.json", "sound-design.json", "evidence-pack.json"];
  for (const filename of required) {
    if (!existsSync(resolve(operationDirectory, filename))) {
      throw new Error(`Professional master input is missing: ${resolve(operationDirectory, filename)}`);
    }
  }
  const suffix = options.previewSeconds ? `-professional-preview-${options.previewSeconds}s` : "-professional-master";
  const runDirectory = resolve("renders/professional", options.episodeId);
  const statePath = resolve(runDirectory, options.previewSeconds ? `preview-${options.previewSeconds}s.json` : "master.json");
  const state = {
    version: "2026-08-03.1",
    episodeId: options.episodeId,
    mode: options.previewSeconds ? "proof_preview" : "full_master",
    status: "running",
    startedAt: new Date().toISOString(),
    steps: [],
  };
  const step = async (id, action) => {
    const startedAt = new Date().toISOString();
    try {
      const output = action();
      state.steps.push({ id, status: "passed", startedAt, completedAt: new Date().toISOString(), output: output.slice(-2000) });
      await writeJsonAtomic(statePath, state);
      return output;
    } catch (error) {
      state.steps.push({ id, status: "failed", startedAt, failedAt: new Date().toISOString(), error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  };
  try {
    await step("editorial_blueprint", () => runNode("scripts/generate-editorial-blueprint.mjs", [
      resolve(operationDirectory, "editorial.json"), "--output", resolve("renders/editorial", options.episodeId),
    ]));
    const blueprintPath = resolve("renders/editorial", options.episodeId, "blueprint.json");
    if (options.generateScript) {
      await step("professional_script", () => runNode("scripts/generate-production-script.mjs", [
        blueprintPath,
        "--evidence", resolve(operationDirectory, "evidence-pack.json"),
        "--base-manifest", resolve(operationDirectory, "narration.json"),
        "--output", resolve(operationDirectory, "narration.json"),
        "--report", resolve(runDirectory, "script-generation-report.json"),
      ]));
    }
    await step("original_score", () => runNode("scripts/generate-original-score.mjs", [
      blueprintPath, "--manifest", resolve(operationDirectory, "sound-design.json"),
      "--output", resolve("renders/sound", options.episodeId),
    ]));
    await step("narration_and_back_transcription", () => runNode("scripts/run-narration-pipeline.mjs", [
      resolve(operationDirectory, "narration.json"), "--output", resolve("renders/narration", options.episodeId),
      "--timeline", blueprintPath,
    ]));
    const projectDirectory = resolve("renders/hyperframes-projects", `${options.episodeId}${suffix}`);
    const compileArgs = [blueprintPath, "--output", projectDirectory];
    if (options.previewSeconds) compileArgs.push("--preview-seconds", String(options.previewSeconds));
    await step("hyperframes_compile", () => runNode("scripts/compile-hyperframes-project.mjs", compileArgs));
    const picturePath = resolve("renders/masters", `${options.episodeId}${suffix}.picture.mp4`);
    const renderProgressPath = resolve(runDirectory, options.previewSeconds ? `render-preview-${options.previewSeconds}s.progress.json` : "render-master.progress.json");
    await step("strict_picture_render", () => runNode("scripts/render-hyperframes-safe.mjs", [
      projectDirectory, "--output", picturePath, "--workers", String(options.workers), "--progress-json", renderProgressPath,
    ]));
    const masterPath = resolve("renders/masters", `${options.episodeId}${suffix}.mp4`);
    const soundReportPath = `${masterPath}.sound-mix.json`;
    const fullSoundManifest = resolve(operationDirectory, "sound-design.json");
    const soundManifest = options.previewSeconds
      ? await previewSoundManifest(fullSoundManifest, resolve(runDirectory, `sound-preview-${options.previewSeconds}s.json`), options.previewSeconds)
      : fullSoundManifest;
    await step("sound_design_and_mastering", () => runNode("scripts/render-sound-designed-master.mjs", [
      picturePath,
      "--manifest", soundManifest,
      "--output", masterPath,
      "--report", soundReportPath,
    ]));
    const compilation = JSON.parse(readFileSync(resolve(projectDirectory, "compilation-manifest.json"), "utf8"));
    const qualityPath = `${masterPath}.quality.json`;
    await step("rendered_master_inspection", () => runNode("scripts/inspect-rendered-master.mjs", [
      masterPath, "--target-duration", String(compilation.durationSeconds), "--output", qualityPath,
    ]));
    const quality = JSON.parse(readFileSync(qualityPath, "utf8"));
    if (quality.status !== "pass") throw new Error(`Rendered master quality did not pass: ${quality.blockerIds?.join(", ")}`);
    Object.assign(state, {
      status: "review_required",
      completedAt: new Date().toISOString(),
      reviewGate: "editorial_factual_and_final_human_screening",
      masterPath,
      masterSha256: sha256(masterPath),
      qualityPath,
      qualityScore: quality.score,
      soundReportPath,
      projectDirectory,
    });
    await writeJsonAtomic(statePath, state);
    process.stdout.write(`${JSON.stringify({ ok: true, ...state })}\n`);
  } catch (error) {
    Object.assign(state, { status: "failed", failedAt: new Date().toISOString(), error: error instanceof Error ? error.message : String(error) });
    await writeJsonAtomic(statePath, state);
    throw error;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
