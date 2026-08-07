import { existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, delimiter, resolve } from "node:path";
import { spawn } from "node:child_process";
import { diskTelemetry, parseHyperframesProgressLine } from "./production-job-telemetry.mjs";

function valueAfter(argv, flag, fallback = null) {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

function parseArgs(argv) {
  const project = argv[0];
  const output = valueAfter(argv, "--output");
  const workers = Number(valueAfter(argv, "--workers", "2"));
  const progressJson = valueAfter(argv, "--progress-json");
  if (!project || !output) {
    throw new Error("Usage: node scripts/render-hyperframes-safe.mjs <project> --output <video.mp4> [--workers 1|2]");
  }
  if (![1, 2].includes(workers)) throw new Error("--workers must be 1 or 2 for deterministic workstation renders.");
  return { project: resolve(project), output: resolve(output), workers, progressJson: progressJson ? resolve(progressJson) : null };
}

function renderPath() {
  if (process.platform !== "win32") return process.env.PATH;
  const entries = [
    process.env.SystemRoot ? resolve(process.env.SystemRoot, "System32") : null,
    process.env.LOCALAPPDATA ? resolve(process.env.LOCALAPPDATA, "Microsoft", "WinGet", "Links") : null,
    dirname(process.execPath),
  ].filter(Boolean);
  return entries.join(delimiter);
}

function writeProgress(path, value) {
  if (!path) return;
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!existsSync(options.project)) throw new Error(`HyperFrames project does not exist: ${options.project}`);
  const cli = resolve("node_modules", "hyperframes", "dist", "cli.js");
  if (!existsSync(cli)) throw new Error("HyperFrames CLI is not installed. Run npm install first.");
  mkdirSync(dirname(options.output), { recursive: true });
  const env = { ...process.env, PATH: renderPath() };
  const startedAtMs = Date.now();
  writeProgress(options.progressJson, { phase: "initializing", detail: "Starting HyperFrames render", startedAt: new Date(startedAtMs).toISOString(), ...diskTelemetry() });
  const child = spawn(process.execPath, [
    cli,
    "render",
    options.project,
    "--output",
    options.output,
    "--quality",
    "high",
    "--strict-all",
    "--workers",
    String(options.workers),
  ], { env, stdio: ["ignore", "pipe", "pipe"] });
  let lineBuffer = "";
  let lastWriteMs = 0;
  const observe = (chunk, destination) => {
    destination.write(chunk);
    lineBuffer += chunk.toString("utf8");
    const lines = lineBuffer.split(/[\r\n]+/);
    lineBuffer = lines.pop() ?? "";
    for (const line of lines) {
      const metric = parseHyperframesProgressLine(line, startedAtMs);
      if (!metric) continue;
      const now = Date.now();
      if (metric.phase === "picture_render" && now - lastWriteMs < 750) continue;
      lastWriteMs = now;
      writeProgress(options.progressJson, { ...metric, updatedAt: new Date(now).toISOString(), ...diskTelemetry(dirname(options.output)) });
    }
  };
  child.stdout.on("data", (chunk) => observe(chunk, process.stdout));
  child.stderr.on("data", (chunk) => observe(chunk, process.stderr));
  const result = await new Promise((resolveChild, rejectChild) => {
    child.once("error", rejectChild);
    child.once("close", (code, signal) => resolveChild({ code, signal }));
  });
  if (result.code !== 0) throw new Error(`HyperFrames render failed with exit code ${result.code ?? "unknown"} (${result.signal ?? "no signal"}).`);
  writeProgress(options.progressJson, {
    phase: "picture_complete",
    detail: "Picture render complete",
    elapsedSeconds: (Date.now() - startedAtMs) / 1000,
    completedAt: new Date().toISOString(),
    ...diskTelemetry(dirname(options.output)),
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
