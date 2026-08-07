import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ensureKokoroAssets } from "./fetch-kokoro-assets.mjs";
import { voiceEnvironment } from "./voice-runtime.mjs";

function fileHash(path) {
  return new Promise((resolveHash, reject) => {
    const hash = createHash("sha256");
    createReadStream(path)
      .on("data", (chunk) => hash.update(chunk))
      .on("end", () => resolveHash(hash.digest("hex")))
      .on("error", reject);
  });
}

async function main() {
  const projectRoot = resolve(".");
  const cacheRoot = resolve(process.env.XDG_CACHE_HOME?.trim() || ".cache");
  const voiceModelRoot = resolve(cacheRoot, "voice-models");
  const whisperRoot = resolve(process.env.MEDIA_OS_WHISPER_CACHE?.trim() || resolve(cacheRoot, "faster-whisper"));
  const models = process.env.MEDIA_OS_WHISPER_MODELS?.trim() || "small,small.en";
  await mkdir(cacheRoot, { recursive: true });
  const assets = await ensureKokoroAssets(voiceModelRoot);
  const runtime = voiceEnvironment(projectRoot);
  const result = spawnSync(runtime.python, [
    resolve(projectRoot, "scripts/preload-faster-whisper.py"),
    "--models", models,
    "--download-root", whisperRoot,
  ], {
    cwd: projectRoot,
    env: runtime.env,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`Faster Whisper preload failed${detail ? `: ${detail.slice(-3000)}` : ""}`);
  }
  const whisper = JSON.parse(String(result.stdout).trim());
  const readiness = {
    version: 1,
    ready: true,
    runtime: "kokoro-onnx-0.5.0+faster-whisper-1.2.1",
    models: whisper.models,
    assets: {
      kokoroModelSha256: await fileHash(assets["kokoro-v1.0.onnx"]),
      kokoroVoicesSha256: await fileHash(assets["voices-v1.0.bin"]),
    },
  };
  const readinessPath = resolve(cacheRoot, "voice-runtime-ready.json");
  const temporary = `${readinessPath}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(readiness, null, 2)}\n`, "utf8");
  await rename(temporary, readinessPath);
  process.stdout.write(`${JSON.stringify({ ok: true, readinessPath, models: readiness.models })}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
