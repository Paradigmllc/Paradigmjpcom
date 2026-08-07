import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

function valueAfter(argv, flag) {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : null;
}

function run(args) {
  const result = spawnSync("ffmpeg", args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`ffmpeg failed: ${result.stderr || result.stdout}`);
  return result.stderr;
}

function parseLoudness(log) {
  const matches = [...log.matchAll(/\{[\s\S]*?"input_i"[\s\S]*?\}/g)];
  if (matches.length === 0) throw new Error("FFmpeg did not return a loudness measurement.");
  return JSON.parse(matches.at(-1)[0]);
}

function main() {
  const argv = process.argv.slice(2);
  const input = argv[0];
  const outputArg = valueAfter(argv, "--output");
  if (!input || !outputArg) throw new Error("Usage: node scripts/master-rendered-audio.mjs <input.mp4> --output <mastered.mp4>");
  const source = resolve(input);
  const output = resolve(outputArg);
  mkdirSync(dirname(output), { recursive: true });
  const measurement = parseLoudness(run([
    "-hide_banner", "-nostats", "-i", source,
    "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json",
    "-f", "null", "-",
  ]));
  const filter = [
    "loudnorm=I=-14:TP=-1.5:LRA=11",
    `measured_I=${measurement.input_i}`,
    `measured_LRA=${measurement.input_lra}`,
    `measured_TP=${measurement.input_tp}`,
    `measured_thresh=${measurement.input_thresh}`,
    `offset=${measurement.target_offset}`,
    "linear=true",
    "print_format=summary",
  ].join(":");
  run([
    "-hide_banner", "-y", "-i", source,
    "-map", "0:v:0", "-map", "0:a:0",
    "-c:v", "copy", "-af", filter,
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
    "-movflags", "+faststart", output,
  ]);
  process.stdout.write(`${JSON.stringify({ input: source, output, targetIntegratedLufs: -14, targetTruePeakDbtp: -1.5 })}\n`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
