import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const GOOGLE_FONTS_COMMIT = "2796410152d4f9524b68ed46e69c1b60f8e0f7c3";
const FONT_SHA256 = "c2f3b4d463500a2ddcd3849cded1fceeb9fd6d1c32e6cbecd568453ba50fc68f";
const LICENSE_SHA256 = "1c05c68c34f9708415aada51f17e1b0092d2cea709bf4a94cd38114f9e73d7d9";
const BASE_URL = `https://raw.githubusercontent.com/google/fonts/${GOOGLE_FONTS_COMMIT}/ofl/notosansjp`;

export const CAPTION_FONT = {
  family: "Noto Sans JP",
  commit: GOOGLE_FONTS_COMMIT,
  filename: "NotoSansJP-wght.ttf",
  sha256: FONT_SHA256,
  license: "SIL Open Font License 1.1",
};

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function readVerified(path, expectedHash) {
  try {
    const buffer = await readFile(path);
    if (sha256(buffer) !== expectedHash) {
      throw new Error(`Cached file hash mismatch: ${path}`);
    }
    return buffer;
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function downloadVerified(url, expectedHash, label) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${label} download failed with HTTP ${response.status}.`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const actualHash = sha256(buffer);
  if (actualHash !== expectedHash) {
    throw new Error(`${label} SHA-256 mismatch. Expected ${expectedHash}, received ${actualHash}.`);
  }
  return buffer;
}

export async function ensureCaptionFont(outputDirectory) {
  const directory = resolve(outputDirectory);
  const fontPath = resolve(directory, CAPTION_FONT.filename);
  const licensePath = resolve(directory, "OFL-NotoSansJP.txt");
  await mkdir(directory, { recursive: true });

  const cachedFont = await readVerified(fontPath, FONT_SHA256);
  if (!cachedFont) {
    const font = await downloadVerified(`${BASE_URL}/NotoSansJP%5Bwght%5D.ttf`, FONT_SHA256, "Noto Sans JP font");
    await writeFile(fontPath, font);
  }

  const cachedLicense = await readVerified(licensePath, LICENSE_SHA256);
  if (!cachedLicense) {
    const license = await downloadVerified(`${BASE_URL}/OFL.txt`, LICENSE_SHA256, "Noto Sans JP license");
    await writeFile(licensePath, license);
  }

  return { fontPath, licensePath, ...CAPTION_FONT };
}

async function main(argv) {
  const outputFlag = argv.indexOf("--output-dir");
  const outputDirectory = outputFlag >= 0 ? argv[outputFlag + 1] : ".cache/fonts";
  if (!outputDirectory) throw new Error("--output-dir requires a path.");
  const result = await ensureCaptionFont(outputDirectory);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
