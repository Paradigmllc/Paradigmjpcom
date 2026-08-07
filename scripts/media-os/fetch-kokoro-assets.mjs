import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, existsSync } from "node:fs";
import { copyFile, mkdir, rename, rm } from "node:fs/promises";
import { get } from "node:https";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { pipeline } from "node:stream/promises";

const ASSETS = [
  {
    name: "kokoro-v1.0.onnx",
    url: "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx",
    sha256: "7d5df8ecf7d4b1878015a32686053fd0eebe2bc377234608764cc0ef3636a6c5",
    hyperframesCache: resolve(homedir(), ".cache/hyperframes/tts/models/kokoro-v1.0.onnx"),
  },
  {
    name: "voices-v1.0.bin",
    url: "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin",
    sha256: "bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d",
    hyperframesCache: resolve(homedir(), ".cache/hyperframes/tts/voices/voices-v1.0.bin"),
  },
];

async function fileHash(path) {
  return new Promise((resolveHash, reject) => {
    const hash = createHash("sha256");
    createReadStream(path)
      .on("data", (chunk) => hash.update(chunk))
      .on("end", () => resolveHash(hash.digest("hex")))
      .on("error", reject);
  });
}

async function verified(path, sha256) {
  return existsSync(path) && await fileHash(path) === sha256;
}

async function download(url, destination, redirects = 0) {
  if (redirects > 5) throw new Error(`Too many redirects while downloading ${url}.`);
  await mkdir(dirname(destination), { recursive: true });
  return new Promise((resolveDownload, reject) => {
    const request = get(url, { headers: { "User-Agent": "youtube-media-os/0.1" } }, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        download(new URL(response.headers.location, url).href, destination, redirects + 1)
          .then(resolveDownload, reject);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Download failed with HTTP ${response.statusCode}: ${url}`));
        return;
      }
      const temporary = `${destination}.${process.pid}.download`;
      pipeline(response, createWriteStream(temporary))
        .then(async () => {
          await rename(temporary, destination);
          resolveDownload();
        })
        .catch(async (error) => {
          await rm(temporary, { force: true });
          reject(error);
        });
    });
    request.on("error", reject);
  });
}

export async function ensureKokoroAssets(root = resolve(".cache/voice-models")) {
  await mkdir(root, { recursive: true });
  const output = {};
  for (const asset of ASSETS) {
    const destination = resolve(root, asset.name);
    if (!await verified(destination, asset.sha256)) {
      await rm(destination, { force: true });
      if (await verified(asset.hyperframesCache, asset.sha256)) {
        await copyFile(asset.hyperframesCache, destination);
      } else {
        await download(asset.url, destination);
      }
    }
    if (!await verified(destination, asset.sha256)) {
      throw new Error(`Kokoro asset checksum mismatch: ${asset.name}`);
    }
    output[asset.name] = destination;
  }
  return output;
}

async function main() {
  const assets = await ensureKokoroAssets();
  process.stdout.write(`${JSON.stringify({ ok: true, assets })}\n`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
