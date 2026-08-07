import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { buildSoundMixGraph, buildStemInputArgs } from "./sound-mix-filter-core.mjs";
import { evaluateSoundDesignPlan, validateSoundDesignManifest } from "./sound-design-core.mjs";

function valueAfter(argv, flag, fallback = null) {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr || result.stdout}`);
  return { stdout: result.stdout, stderr: result.stderr };
}

function probeDuration(path) {
  const value = run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", path]).stdout.trim();
  const duration = Number(value);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error(`Invalid media duration for ${path}.`);
  return duration;
}

function parseLoudness(log) {
  const matches = [...log.matchAll(/\{[\s\S]*?"input_i"[\s\S]*?\}/g)];
  if (matches.length === 0) throw new Error("FFmpeg did not return a loudness measurement.");
  return JSON.parse(matches.at(-1)[0]);
}

function fileHash(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function main() {
  const argv = process.argv.slice(2);
  const input = argv[0];
  const manifestArg = valueAfter(argv, "--manifest");
  const outputArg = valueAfter(argv, "--output");
  const reportArg = valueAfter(argv, "--report");
  if (!input || !manifestArg || !outputArg) {
    throw new Error("Usage: node scripts/render-sound-designed-master.mjs <input.mp4> --manifest <sound-design.json> --output <master.mp4> [--report report.json] [--allow-generated-music]");
  }
  const source = resolve(input);
  const manifestPath = resolve(manifestArg);
  const output = resolve(outputArg);
  const durationSeconds = probeDuration(source);
  const raw = JSON.parse(readFileSync(manifestPath, "utf8"));
  const manifest = validateSoundDesignManifest(raw, manifestPath, {
    episodeId: raw.episodeId,
    durationSeconds,
    generatedMusicAllowed: argv.includes("--allow-generated-music"),
  });
  const plan = evaluateSoundDesignPlan(manifest, durationSeconds, true);
  if (plan.status !== "pass") throw new Error(`Sound design quality blocked: ${plan.blockers.map((item) => item.id).join(", ")}`);
  mkdirSync(dirname(output), { recursive: true });
  const tempDirectory = mkdtempSync(resolve(tmpdir(), "media-os-sound-mix-"));
  try {
    const mixed = resolve(tempDirectory, "mixed.wav");
    const graph = buildSoundMixGraph(manifest, durationSeconds);
    run("ffmpeg", ["-hide_banner", "-y", "-i", source, ...buildStemInputArgs(manifest), "-filter_complex", graph, "-map", "[mix]", "-c:a", "pcm_s24le", "-ar", "48000", mixed]);
    const targetI = manifest.mix.targetIntegratedLufs;
    const targetTp = manifest.mix.targetTruePeakDbtp;
    const measurement = parseLoudness(run("ffmpeg", ["-hide_banner", "-nostats", "-i", mixed, "-af", `loudnorm=I=${targetI}:TP=${targetTp}:LRA=11:print_format=json`, "-f", "null", "-"]).stderr);
    const loudnorm = `loudnorm=I=${targetI}:TP=${targetTp}:LRA=11:measured_I=${measurement.input_i}:measured_LRA=${measurement.input_lra}:measured_TP=${measurement.input_tp}:measured_thresh=${measurement.input_thresh}:offset=${measurement.target_offset}:linear=true:print_format=summary`;
    run("ffmpeg", ["-hide_banner", "-y", "-i", source, "-i", mixed, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-af", loudnorm, "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest", "-movflags", "+faststart", output]);
    const report = {
      version: "2026-08-03.1",
      episodeId: manifest.episodeId,
      input: source,
      inputSha256: fileHash(source),
      output,
      outputSha256: fileHash(output),
      durationSeconds: Number(durationSeconds.toFixed(3)),
      targetIntegratedLufs: targetI,
      targetTruePeakDbtp: targetTp,
      plan,
      stems: manifest.tracks.map((track) => ({ id: track.id, kind: track.kind, sha256: track.sha256, rights: track.rights })),
    };
    const reportPath = resolve(reportArg ?? `${output}.sound-mix.json`);
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify({ output, reportPath, trackCount: manifest.tracks.length })}\n`);
  } finally {
    rmSync(tempDirectory, { recursive: true, force: true });
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
