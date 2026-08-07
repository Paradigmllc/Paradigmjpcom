import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const OPENCUT_TICKS_PER_SECOND = 120_000;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireFinite(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`${label} must be a finite number.`);
  }
  return number;
}

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value.trim();
}

function stringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim());
}

function getMainScene(project, sceneSelector) {
  if (!Array.isArray(project.scenes) || project.scenes.length === 0) {
    throw new Error("OpenCut project contains no scenes.");
  }

  const scene = sceneSelector
    ? project.scenes.find((candidate) => candidate?.id === sceneSelector || candidate?.name === sceneSelector)
    : project.scenes.find((candidate) => candidate?.id === project.currentSceneId)
      ?? project.scenes.find((candidate) => candidate?.isMain === true)
      ?? project.scenes[0];

  if (!isRecord(scene)) {
    throw new Error(`OpenCut scene ${sceneSelector ?? "main"} was not found.`);
  }
  return scene;
}

function getMainVideoElements(scene) {
  const tracks = scene.tracks;
  if (isRecord(tracks) && isRecord(tracks.main) && Array.isArray(tracks.main.elements)) {
    return tracks.main.elements;
  }

  if (Array.isArray(tracks)) {
    const mainTrack = tracks.find((track) => track?.type === "video" && (track?.isMain === true || track?.name === "Main"))
      ?? tracks.find((track) => track?.type === "video");
    if (mainTrack && Array.isArray(mainTrack.elements)) return mainTrack.elements;
  }

  throw new Error("OpenCut scene has no main video track.");
}

function getMediaOsMetadata(element) {
  const params = isRecord(element.params) ? element.params : {};
  const metadata = isRecord(params.mediaOs)
    ? params.mediaOs
    : isRecord(element.mediaOs)
      ? element.mediaOs
      : {};
  return metadata;
}

export function adaptOpenCutProject(project, options) {
  if (!isRecord(project)) {
    throw new Error("OpenCut project must be a JSON object.");
  }
  if (!isRecord(options)) {
    throw new Error("Adapter options are required.");
  }

  const source = requireString(options.source, "Source");
  const output = requireString(options.output, "Render output");
  const profile = options.profile ?? "vertical-fit";
  if (!["landscape", "vertical-fit", "vertical-cover"].includes(profile)) {
    throw new Error(`Unsupported EDL profile: ${profile}`);
  }

  const version = requireFinite(project.version, "OpenCut project version");
  const timeScale = version >= 23 ? OPENCUT_TICKS_PER_SECOND : 1;
  const scene = getMainScene(project, options.scene);
  const elements = getMainVideoElements(scene)
    .filter((element) => isRecord(element) && element.type === "video" && element.hidden !== true)
    .sort((left, right) => Number(left.startTime) - Number(right.startTime));

  if (elements.length === 0) {
    throw new Error("OpenCut main video track has no visible video elements.");
  }

  const mediaIds = new Set(elements.map((element, index) => requireString(element.mediaId, `Element ${index} mediaId`)));
  if (mediaIds.size !== 1) {
    throw new Error("The deterministic EDL worker currently requires every OpenCut clip to reference one mediaId.");
  }
  const mediaId = [...mediaIds][0];
  if (options.mediaId && options.mediaId !== mediaId) {
    throw new Error(`Expected OpenCut mediaId ${options.mediaId}, found ${mediaId}.`);
  }

  let priorTimelineEnd = 0;
  const warnings = [];
  const segments = elements.map((element, index) => {
    const timelineStart = requireFinite(element.startTime, `Element ${index} startTime`) / timeScale;
    const duration = requireFinite(element.duration, `Element ${index} duration`) / timeScale;
    const trimStart = requireFinite(element.trimStart ?? 0, `Element ${index} trimStart`) / timeScale;
    const rate = isRecord(element.retime) ? requireFinite(element.retime.rate, `Element ${index} retime rate`) : 1;

    if (duration <= 0 || trimStart < 0 || timelineStart < 0) {
      throw new Error(`Element ${index} has an invalid duration, trimStart, or startTime.`);
    }
    if (Math.abs(rate - 1) > 0.000001) {
      throw new Error(`Element ${index} uses retime rate ${rate}; retimed clips are not supported by the EDL worker.`);
    }
    if (index > 0 && timelineStart < priorTimelineEnd - 0.00001) {
      throw new Error(`Element ${index} overlaps the previous main-track clip.`);
    }
    if (index > 0 && timelineStart > priorTimelineEnd + 0.00001) {
      warnings.push(`Timeline gap of ${(timelineStart - priorTimelineEnd).toFixed(3)} seconds before element ${index}.`);
    }
    priorTimelineEnd = timelineStart + duration;

    const metadata = getMediaOsMetadata(element);
    return {
      start: Number(trimStart.toFixed(6)),
      duration: Number(duration.toFixed(6)),
      timelineStart: Number(timelineStart.toFixed(6)),
      role: typeof metadata.role === "string" && metadata.role.trim() ? metadata.role.trim() : `segment-${index + 1}`,
      claimIds: stringArray(metadata.claimIds),
      wordIds: stringArray(metadata.wordIds),
      requiredAttribution: typeof metadata.requiredAttribution === "string" ? metadata.requiredAttribution.trim() : "",
      openCutElementId: requireString(element.id, `Element ${index} id`),
    };
  });

  return {
    version: 1,
    source,
    output,
    profile,
    sourceAdapter: {
      name: "opencut-classic",
      projectVersion: version,
      projectId: project.metadata?.id ?? null,
      sceneId: scene.id ?? null,
      mediaId,
      ticksPerSecond: timeScale,
      upstreamCommit: "cf5e79e919144200294fb9fed22a222592a0aeea",
      warnings,
    },
    segments,
  };
}

function parseArgs(argv) {
  const [input, ...rest] = argv;
  const values = { input };
  for (let index = 0; index < rest.length; index += 2) {
    const flag = rest[index];
    const value = rest[index + 1];
    if (!flag?.startsWith("--") || value === undefined) {
      throw new Error(`Invalid argument near ${flag ?? "end of command"}.`);
    }
    values[flag.slice(2)] = value;
  }
  return values;
}

async function main(argv) {
  const args = parseArgs(argv);
  if (!args.input || !args.source || !args["render-output"] || !args["manifest-output"]) {
    throw new Error("Usage: node scripts/adapt-opencut-edl.mjs <project.json> --source <master.mp4> --render-output <cut.mp4> --manifest-output <edl.json> [--profile vertical-fit] [--scene id] [--media-id id]");
  }

  const project = JSON.parse(await readFile(resolve(args.input), "utf8"));
  const manifest = adaptOpenCutProject(project, {
    source: args.source,
    output: args["render-output"],
    profile: args.profile,
    scene: args.scene,
    mediaId: args["media-id"],
  });
  const outputPath = resolve(args["manifest-output"]);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ output: outputPath, segments: manifest.segments.length, warnings: manifest.sourceAdapter.warnings }, null, 2)}\n`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
