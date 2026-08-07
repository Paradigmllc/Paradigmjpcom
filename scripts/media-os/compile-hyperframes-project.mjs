import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { compileHyperframesProject, loadChannelDesignSystems } from "./hyperframes-compiler-core.mjs";
import { copyNarrationMedia } from "./hyperframes-narration-media.mjs";
import { loadProductionMedia } from "./hyperframes-production-media.mjs";

function parseArgs(argv) {
  const blueprintPath = argv[0];
  if (!blueprintPath) throw new Error("Usage: node scripts/compile-hyperframes-project.mjs <blueprint.json> --output <directory> [--preview-seconds 60]");
  const outputIndex = argv.indexOf("--output");
  if (outputIndex < 0 || !argv[outputIndex + 1]) throw new Error("--output is required.");
  const previewIndex = argv.indexOf("--preview-seconds");
  const previewSeconds = previewIndex >= 0 ? Number(argv[previewIndex + 1]) : null;
  if (previewSeconds !== null && (!Number.isFinite(previewSeconds) || previewSeconds < 30 || previewSeconds > 180)) throw new Error("--preview-seconds must be between 30 and 180.");
  return { blueprintPath: resolve(blueprintPath), outputDirectory: resolve(argv[outputIndex + 1]), previewSeconds };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const blueprint = JSON.parse(readFileSync(options.blueprintPath, "utf8"));
  const qualityPath = resolve(dirname(options.blueprintPath), "quality-report.json");
  const qualityReport = JSON.parse(readFileSync(qualityPath, "utf8"));
  const designSystems = loadChannelDesignSystems(resolve("config/channel-design-systems.json"));
  const media = loadProductionMedia(blueprint);
  const compiled = compileHyperframesProject({ blueprint, qualityReport, designSystems, previewSeconds: options.previewSeconds, media });
  for (const [relativePath, content] of Object.entries(compiled.files)) {
    const destination = resolve(options.outputDirectory, relativePath);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, content, "utf8");
  }
  copyNarrationMedia(media, options.outputDirectory);
  process.stdout.write(`${JSON.stringify({ outputDirectory: options.outputDirectory, ...compiled.manifest })}\n`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
