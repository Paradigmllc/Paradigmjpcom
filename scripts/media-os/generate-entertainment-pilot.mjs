import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildEntertainmentPilot } from "./entertainment-pilot-core.mjs";

function parseArgs(argv) {
  const [episodeId, ...rest] = argv;
  if (!/^episode-[a-z0-9-]+$/.test(String(episodeId ?? ""))) throw new Error("Usage: node scripts/generate-entertainment-pilot.mjs <episode-id> [--duration 90] [--output directory]");
  const value = (name, fallback) => {
    const index = rest.indexOf(name);
    return index >= 0 ? rest[index + 1] : fallback;
  };
  const durationSeconds = Number(value("--duration", "90"));
  const outputDirectory = resolve(value("--output", `renders/entertainment/${episodeId}`));
  return { episodeId, durationSeconds, outputDirectory };
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function expandedPrompt(plan) {
  const shots = plan.shots.map((shot) => `### ${shot.id} — ${shot.storyFunction} (${shot.startSeconds}s–${(shot.startSeconds + shot.durationSeconds).toFixed(3)}s)

- Concept: ${shot.visualDirection}
- Mood direction: ${shot.energy} energy; ${shot.visualMode.replaceAll("_", " ")}; never a presentation slide.
- Depth layers: cinematic background plate; evidence or character midground; captions, source attribution, and tactile foreground accents.
- Choreography: ${shot.transitionOut}; host mode ${shot.hostMode}; sound cue ${shot.sfxCue}.
- Evidence: ${shot.sourceLocator ?? "editorial bridge with no factual claim"}
- Synthetic disclosure: ${shot.syntheticDisclosureRequired ? "required" : "not required"}
`).join("\n");
  return `# ${plan.title} — 90-second entertainment pilot

## Style block

- Format family: ${plan.formatFamily}
- Host: original fictional channel host; no public-figure likeness
- Rhythm: ${plan.rhythm}
- Primary transitions: cinematic zoom and focus pull
- Accent transitions: whip pan, page-turn blur, and editorial smash cut

## Global rules

- The host is a story guide, never a permanent lower-right webinar overlay.
- Every shot is a visual world with a new focal point; cards and dashboards cannot become the primary image.
- Realistic synthetic shots carry disclosure metadata and cannot depict a real person.
- Factual claims retain claim IDs and source locators.
- Generated characters, locations, and reconstructions must be commercially usable and project-original.

## Shot beats

${shots}
## Recurring motifs

- Paper fibers, cash-flow gaps, hard pools of light, and evidence marks connect otherwise distinct shots.
- The fictional host appears full-screen at the cold open, returns briefly at chapter turns, and leaves for dramatic sequences.

## Negative prompt

Corporate presentation slides, webinar framing, permanent talking-head bubble, dashboard UI, matrix rain, hooded hacker, generic skyscraper montage, fake quotation, copied character, real-person likeness, fabricated readable evidence, repetitive shot template.
`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const blueprintPath = resolve(`renders/editorial/${options.episodeId}/blueprint.json`);
  const narrationPath = resolve(`operations/${options.episodeId}/narration.json`);
  const blueprint = JSON.parse(readFileSync(blueprintPath, "utf8"));
  const narration = JSON.parse(readFileSync(narrationPath, "utf8"));
  const databaseSeed = readFileSync(resolve("src/lib/media-os/database.ts"), "utf8");
  const channelPattern = new RegExp(`\\["${blueprint.channelId}",\\s*"[^"]+",\\s*"[^"]+",\\s*"(?:ja|en)",\\s*"([^"]+)"\\]`);
  const channelFormat = databaseSeed.match(channelPattern)?.[1] ?? "investigative_docudrama";
  const { plan, report } = buildEntertainmentPilot({ blueprint, narration, channelFormat, durationSeconds: options.durationSeconds });
  mkdirSync(resolve(options.outputDirectory, ".hyperframes"), { recursive: true });
  const planPath = resolve(options.outputDirectory, "pilot-plan.json");
  const reportPath = resolve(options.outputDirectory, "creative-quality-report.json");
  const visualManifestPath = resolve(options.outputDirectory, "visual-assets.json");
  const expandedPromptPath = resolve(options.outputDirectory, ".hyperframes", "expanded-prompt.md");
  writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(visualManifestPath, `${JSON.stringify(plan.visualAssetManifest, null, 2)}\n`, "utf8");
  writeFileSync(expandedPromptPath, expandedPrompt(plan), "utf8");
  const state = {
    version: plan.version,
    status: report.status === "pass" ? "review_required" : "blocked",
    episodeId: options.episodeId,
    formatFamily: plan.formatFamily,
    durationSeconds: plan.durationSeconds,
    shotCount: plan.shots.length,
    planPath,
    reportPath,
    visualManifestPath,
    expandedPromptPath,
    planSha256: sha256(planPath),
    reportSha256: sha256(reportPath),
    qualityScore: report.score,
    qualityThreshold: report.threshold,
    metrics: report.metrics,
    renderReady: false,
    nextGate: "fictional_host_style_and_90_second_direction_review",
  };
  const statePath = resolve(options.outputDirectory, "pilot-run.json");
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ ...state, statePath })}\n`);
  if (report.status !== "pass") process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
