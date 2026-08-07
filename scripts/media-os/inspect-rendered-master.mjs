import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { evaluateRenderedMaster } from "./rendered-master-quality-core.mjs";

function valueAfter(argv, flag, fallback = null) {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr || result.stdout}`);
  return { stdout: result.stdout, stderr: result.stderr };
}

function parseLoudness(log) {
  const matches = [...log.matchAll(/\{[\s\S]*?"input_i"[\s\S]*?\}/g)];
  if (matches.length === 0) return {};
  return JSON.parse(matches.at(-1)[0]);
}

function parseSegments(log, prefix) {
  const pattern = new RegExp(`${prefix}_start:\\s*([0-9.]+)[\\s\\S]*?${prefix}_duration:\\s*([0-9.]+)`, "g");
  return [...log.matchAll(pattern)].map((match) => ({ start: Number(match[1]), duration: Number(match[2]) }));
}

function parseFrameHashes(output) {
  return output.split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => line.split(",").at(-1)?.trim()).filter(Boolean);
}

function main() {
  const argv = process.argv.slice(2);
  const input = argv[0];
  const targetDuration = Number(valueAfter(argv, "--target-duration"));
  const output = resolve(valueAfter(argv, "--output", "renders/quality/rendered-master-quality-report.json"));
  if (!input || !Number.isFinite(targetDuration) || targetDuration <= 0) {
    throw new Error("Usage: node scripts/inspect-rendered-master.mjs <video.mp4> --target-duration <seconds> [--output report.json]");
  }
  const video = resolve(input);
  const probe = JSON.parse(run("ffprobe", ["-v", "error", "-show_format", "-show_streams", "-of", "json", video]).stdout);
  const loudnessLog = run("ffmpeg", ["-hide_banner", "-nostats", "-i", video, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"]).stderr;
  const blackLog = run("ffmpeg", ["-hide_banner", "-nostats", "-i", video, "-vf", "blackdetect=d=1.5:pix_th=0.10", "-an", "-f", "null", "-"]).stderr;
  const silenceLog = run("ffmpeg", ["-hide_banner", "-nostats", "-i", video, "-af", "silencedetect=noise=-45dB:d=2.5", "-vn", "-f", "null", "-"]).stderr;
  const frameHashes = parseFrameHashes(run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", video, "-vf", "fps=1,scale=320:-2", "-an", "-f", "framemd5", "-"]).stdout);
  const report = evaluateRenderedMaster({
    probe,
    targetDuration,
    loudness: parseLoudness(loudnessLog),
    blackSegments: parseSegments(blackLog, "black"),
    silenceSegments: parseSegments(silenceLog, "silence"),
    sampleHashes: frameHashes,
  });
  mkdirSync(dirname(output), { recursive: true });
  const inputSha256 = createHash("sha256").update(readFileSync(video)).digest("hex");
  writeFileSync(output, `${JSON.stringify({ input: video, inputSha256, ...report }, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ output, status: report.status, score: report.score, blockerIds: report.blockerIds })}\n`);
  if (report.status !== "pass") process.exitCode = 2;
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
