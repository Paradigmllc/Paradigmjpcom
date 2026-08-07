import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statfsSync } from "node:fs";
import { resolve } from "node:path";
import { validateNarrationManifest } from "./narration-core.mjs";
import { generateEditorialBlueprint, loadEditorialDna } from "./editorial-blueprint-core.mjs";
import { evaluateEditorialBlueprint } from "./editorial-quality-core.mjs";
import { findVoicePython } from "./voice-runtime.mjs";
import { evaluateProductionScript, validateEvidencePack } from "./production-script-core.mjs";
import { buildOriginalScorePlan } from "./original-score-core.mjs";
import { validateSoundDesignManifest } from "./sound-design-core.mjs";
import { validateVisualAssetManifest } from "./gpu-asset-core.mjs";
import { sourceRequests } from "./research-ingest-core.mjs";
import { buildEntertainmentPilot } from "./entertainment-pilot-core.mjs";
import { loadProductionProfileRegistry } from "./production-profile-core.mjs";

function commandReady(command, args = ["-version"]) {
  const result = spawnSync(command, args, { encoding: "utf8", timeout: 15_000 });
  return result.status === 0;
}

function check(name, ready, detail, required = true) {
  return { name, ready, detail, required };
}

function main() {
  const projectRoot = resolve(".");
  const manifests = [
    "operations/episode-enron-ja/narration.json",
    "operations/episode-enron-en/narration.json",
  ];
  const editorialManifests = [
    "operations/episode-enron-ja/editorial.json",
    "operations/episode-enron-en/editorial.json",
  ];
  const checks = [
    check("Node.js", Number(process.versions.node.split(".")[0]) >= 22, process.version),
    check("FFmpeg", commandReady(process.env.FFMPEG_PATH?.trim() || "ffmpeg"), "audio/video rendering"),
    check("FFprobe", commandReady(process.env.FFPROBE_PATH?.trim() || "ffprobe"), "media verification"),
    check(
      "HyperFrames",
      existsSync(resolve("node_modules/.bin/hyperframes.cmd")) || existsSync(resolve("node_modules/.bin/hyperframes")),
      "local deterministic renderer",
    ),
    check("Voice runtime", Boolean(findVoicePython({ projectRoot })), "isolated Kokoro + Faster Whisper runtime"),
  ];
  try {
    const profiles = loadProductionProfileRegistry();
    checks.push(check(
      "Dynamic production profiles",
      profiles.profiles.some((profile) => profile.id === "realistic_host" && profile.outputKind === "video")
        && profiles.profiles.some((profile) => profile.id === "cinematic_reenactment" && profile.outputKind === "video")
        && profiles.profiles.some((profile) => profile.id === "evidence_room" && profile.outputKind === "composition"),
      `${profiles.profiles.length} typed profiles; host + Wan motion + HyperFrames evidence routing`,
    ));
  } catch (error) {
    checks.push(check("Dynamic production profiles", false, error instanceof Error ? error.message : String(error)));
  }

  for (const manifestPath of manifests) {
    try {
      validateNarrationManifest(JSON.parse(readFileSync(resolve(manifestPath), "utf8")));
      checks.push(check(`Manifest ${manifestPath}`, true, "rights and language gates passed"));
    } catch (error) {
      checks.push(check(`Manifest ${manifestPath}`, false, error instanceof Error ? error.message : String(error)));
    }
  }

  try {
    const dna = loadEditorialDna(resolve("config/editorial-dna.json"));
    const blueprints = editorialManifests.map((manifestPath) => generateEditorialBlueprint(
      JSON.parse(readFileSync(resolve(manifestPath), "utf8")),
      dna,
    ));
    for (const [index, blueprint] of blueprints.entries()) {
      const report = evaluateEditorialBlueprint(blueprint, blueprints.filter((_, peerIndex) => peerIndex !== index));
      checks.push(check(
        `Editorial ${editorialManifests[index]}`,
        report.status === "pass",
        `quality ${report.score}/${report.threshold}; originality and policy gates`,
      ));
      const operationDirectory = resolve("operations", blueprint.episodeId);
      const evidence = validateEvidencePack(
        JSON.parse(readFileSync(resolve(operationDirectory, "evidence-pack.json"), "utf8")),
        blueprint,
      );
      const researchSources = sourceRequests(evidence);
      checks.push(check(
        `Research contract ${blueprint.episodeId}`,
        researchSources.length > 0,
        `${researchSources.length} public HTTPS sources linked to ${evidence.claims.length} claims`,
      ));
      const visualManifest = validateVisualAssetManifest(
        JSON.parse(readFileSync(resolve(operationDirectory, "visual-assets.json"), "utf8")),
      );
      checks.push(check(
        `GPU visual contract ${blueprint.episodeId}`,
        visualManifest.assets.length >= 4,
        `${visualManifest.assets.length} rights-scoped deterministic assets`,
      ));
      const narration = validateNarrationManifest(
        JSON.parse(readFileSync(resolve(operationDirectory, "narration.json"), "utf8")),
      );
      const entertainment = buildEntertainmentPilot({
        blueprint,
        narration,
        channelFormat: "investigative_docudrama",
        durationSeconds: 90,
      });
      checks.push(check(
        `Entertainment pilot ${blueprint.episodeId}`,
        entertainment.report.status === "pass",
        `${entertainment.plan.shots.length} shots; quality ${entertainment.report.score}/${entertainment.report.threshold}; ${(entertainment.report.metrics.avatarShare * 100).toFixed(1)}% host; ${(entertainment.report.metrics.dynamicMotionShare * 100).toFixed(1)}% dynamic motion`,
      ));
      const scenes = blueprint.scenes.map((scene) => {
        const segments = narration.segments.filter((segment) => segment.sceneId === scene.id);
        return {
          sceneId: scene.id,
          editorialIntent: segments[0]?.editorialIntent,
          visualSync: segments[0]?.visualSync,
          pauseAfterSeconds: segments[0]?.pauseAfterSeconds,
          segments,
        };
      });
      const scriptReport = evaluateProductionScript({ script: { version: 1, scenes }, blueprint, evidencePack: evidence });
      checks.push(check(
        `Production script ${blueprint.episodeId}`,
        scriptReport.status === "pass",
        `quality ${scriptReport.score}/${scriptReport.threshold}; ${scriptReport.metrics.segmentCount} authored segments`,
      ));
      validateSoundDesignManifest(
        JSON.parse(readFileSync(resolve(operationDirectory, "sound-design.json"), "utf8")),
        resolve(operationDirectory, "sound-design.json"),
        { episodeId: blueprint.episodeId, durationSeconds: blueprint.targetDurationSeconds, generatedMusicAllowed: false },
      );
      const scorePlan = buildOriginalScorePlan(blueprint);
      checks.push(check(
        `Original score plan ${blueprint.episodeId}`,
        scorePlan.beds.length === blueprint.scenes.length && scorePlan.cues.length === blueprint.scenes.length - 1,
        `${scorePlan.beds.length} scene beds; ${scorePlan.cues.length} transition cues`,
      ));
    }
    checks.push(check("Editorial DNA", dna.channels.length === 12, `${dna.channels.length} unique channel profiles`));
  } catch (error) {
    checks.push(check("Editorial planning", false, error instanceof Error ? error.message : String(error)));
  }

  const disk = statfsSync(projectRoot);
  const freeGiB = Number(disk.bavail * disk.bsize) / 1024 ** 3;
  checks.push(check("Free disk", freeGiB >= 5, `${freeGiB.toFixed(1)} GiB available`));
  checks.push(check("Studio admin token", Boolean(process.env.MEDIA_OS_ADMIN_TOKEN?.trim()), "required before network exposure", false));
  checks.push(check("YouTube publisher", false, "intentionally disabled until release approvals", false));

  const failedRequired = checks.filter((item) => item.required && !item.ready);
  for (const item of checks) {
    process.stdout.write(`${item.ready ? "PASS" : item.required ? "FAIL" : "WAIT"}  ${item.name} - ${item.detail}\n`);
  }
  process.stdout.write(`\n${checks.length - failedRequired.length}/${checks.length} checks non-blocking; ${failedRequired.length} required failure(s).\n`);
  if (failedRequired.length > 0) process.exitCode = 1;
}

main();
