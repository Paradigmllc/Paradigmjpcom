import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { bedFfmpegArgs, buildOriginalScorePlan, cueFfmpegArgs } from "./original-score-core.mjs";
import { evaluateSoundDesignPlan, validateSoundDesignManifest } from "./sound-design-core.mjs";

function parseArgs(argv) {
  const values = { blueprint: argv[0] };
  for (let index = 1; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || value === undefined) throw new Error(`Invalid argument near ${flag ?? "end"}.`);
    values[flag.slice(2)] = value;
  }
  return values;
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed: ${(result.stderr || result.stdout).slice(-3000)}`);
}

async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

async function sha256(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

function sourceFrom(manifestPath, filePath) {
  return relative(dirname(manifestPath), filePath).replaceAll("\\", "/");
}

const ORIGINAL_RIGHTS = {
  license: "project-original",
  commercialUse: true,
  provenance: "deterministic_ffmpeg_synthesis_v1",
  attribution: "YouTube Media OS original procedural score",
  aiGenerated: false,
};

export async function generateOriginalScore(options) {
  const projectRoot = resolve(options.projectRoot ?? ".");
  const blueprintPath = resolve(projectRoot, options.blueprint);
  const manifestPath = resolve(projectRoot, options.manifest);
  const outputDirectory = resolve(projectRoot, options.output ?? `renders/sound/${options.episodeId ?? "episode"}`);
  const blueprint = JSON.parse(await readFile(blueprintPath, "utf8"));
  const baseManifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const plan = buildOriginalScorePlan(blueprint);
  await mkdir(outputDirectory, { recursive: true });
  const ffmpeg = process.env.FFMPEG_PATH?.trim() || "ffmpeg";
  const tracks = [];

  for (const bed of plan.beds) {
    const output = resolve(outputDirectory, `${bed.id}.wav`);
    run(ffmpeg, bedFfmpegArgs(bed, output));
    tracks.push({
      id: bed.id,
      kind: "music",
      source: sourceFrom(manifestPath, output),
      startSeconds: bed.startSeconds,
      durationSeconds: bed.durationSeconds,
      gainDb: bed.gainDb,
      loop: false,
      sha256: await sha256(output),
      rights: ORIGINAL_RIGHTS,
      sceneId: bed.sceneId,
      motif: bed.motif,
    });
  }
  for (const cue of plan.cues) {
    const output = resolve(outputDirectory, `${cue.id}.wav`);
    run(ffmpeg, cueFfmpegArgs(cue, output));
    tracks.push({
      id: cue.id,
      kind: "sfx",
      source: sourceFrom(manifestPath, output),
      startSeconds: Number(cue.startSeconds.toFixed(3)),
      durationSeconds: cue.durationSeconds,
      gainDb: cue.gainDb,
      loop: false,
      sha256: await sha256(output),
      rights: ORIGINAL_RIGHTS,
      sceneId: cue.sceneId,
      emphasis: cue.emphasis,
    });
  }
  const manifest = { ...baseManifest, version: 1, episodeId: blueprint.episodeId, generatedMusicAllowed: false, tracks };
  await writeJsonAtomic(manifestPath, manifest);
  const validated = validateSoundDesignManifest(manifest, manifestPath, {
    episodeId: blueprint.episodeId,
    durationSeconds: blueprint.targetDurationSeconds,
    generatedMusicAllowed: false,
  });
  const quality = evaluateSoundDesignPlan(validated, blueprint.targetDurationSeconds, true);
  if (quality.status !== "pass") throw new Error(`Original score blocked: ${quality.blockers.map((item) => item.id).join(", ")}`);
  const reportPath = resolve(options.report ?? resolve(outputDirectory, "score-generation.json"));
  await writeJsonAtomic(reportPath, { ...plan, status: "pass", manifestPath, quality });
  return { manifestPath, reportPath, outputDirectory, plan, quality };
}

async function main(argv) {
  const args = parseArgs(argv);
  if (!args.blueprint || !args.manifest) {
    throw new Error("Usage: node scripts/generate-original-score.mjs <blueprint.json> --manifest <sound-design.json> [--output <dir>] [--report <report.json>]");
  }
  const state = await generateOriginalScore({
    blueprint: args.blueprint,
    manifest: args.manifest,
    output: args.output,
    report: args.report,
  });
  process.stdout.write(`${JSON.stringify({
    ok: true,
    status: state.quality.status,
    beds: state.plan.beds.length,
    cues: state.plan.cues.length,
    manifestPath: state.manifestPath,
    reportPath: state.reportPath,
  })}\n`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
