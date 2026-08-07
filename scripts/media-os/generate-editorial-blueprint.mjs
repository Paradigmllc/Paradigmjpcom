import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateEditorialBlueprint, loadEditorialDna, stableJsonHash } from "./editorial-blueprint-core.mjs";
import { evaluateEditorialBlueprint } from "./editorial-quality-core.mjs";

function parseArgs(argv) {
  const manifestPath = argv[0];
  if (!manifestPath) throw new Error("Usage: node scripts/generate-editorial-blueprint.mjs <editorial.json> [--output directory]");
  const outputIndex = argv.indexOf("--output");
  return {
    manifestPath: resolve(manifestPath),
    outputDirectory: resolve(outputIndex >= 0 ? argv[outputIndex + 1] : `renders/editorial/${JSON.parse(readFileSync(manifestPath, "utf8")).episodeId}`)
  };
}

function collectPeerBlueprints(root, episodeId) {
  if (!existsSync(root)) return [];
  const peers = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === episodeId) continue;
    const path = resolve(root, entry.name, "blueprint.json");
    if (!existsSync(path)) continue;
    try {
      peers.push(JSON.parse(readFileSync(path, "utf8")));
    } catch (error) {
      throw new Error(`Cannot read peer blueprint ${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return peers;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const manifest = JSON.parse(readFileSync(options.manifestPath, "utf8"));
  const dna = loadEditorialDna(resolve("config/editorial-dna.json"));
  const blueprint = generateEditorialBlueprint(manifest, dna);
  const peers = collectPeerBlueprints(resolve("renders/editorial"), manifest.episodeId);
  const report = evaluateEditorialBlueprint(blueprint, peers);
  mkdirSync(options.outputDirectory, { recursive: true });
  const blueprintPath = resolve(options.outputDirectory, "blueprint.json");
  const reportPath = resolve(options.outputDirectory, "quality-report.json");
  const runPath = resolve(options.outputDirectory, "editorial-run.json");
  writeFileSync(blueprintPath, `${JSON.stringify(blueprint, null, 2)}\n`, "utf8");
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  const run = {
    status: report.status === "pass" ? "review_required" : "blocked",
    episodeId: manifest.episodeId,
    blueprintPath,
    reportPath,
    blueprintSha256: stableJsonHash(blueprint),
    reportSha256: stableJsonHash(report),
    qualityScore: report.score,
    qualityThreshold: report.threshold,
    reviewGate: "originality_policy_and_structure_review",
    blockers: report.blockers
  };
  writeFileSync(runPath, `${JSON.stringify(run, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(run)}\n`);
  if (run.status === "blocked") process.exitCode = 1;
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
}
