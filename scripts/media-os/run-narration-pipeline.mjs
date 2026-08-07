import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  mergeSegmentTranscripts,
  scoreBackTranscript,
  stableHash,
  validateNarrationManifest,
} from "./narration-core.mjs";
import { validateAndCleanTranscript } from "./validate-transcript.mjs";
import { ensureKokoroAssets } from "./fetch-kokoro-assets.mjs";
import { assembleNarrationAudio } from "./narration-audio-assembly.mjs";
import { buildSceneAlignedNarrationTimeline } from "./narration-timeline-core.mjs";
import { voiceEnvironment } from "./voice-runtime.mjs";
function parseArgs(argv) {
  const values = { manifest: argv[0] };
  for (let index = 1; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--force") {
      values.force = true;
      continue;
    }
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || value === undefined) {
      throw new Error(`Invalid argument near ${flag ?? "end of command"}.`);
    }
    values[flag.slice(2)] = value;
    index += 1;
  }
  return values;
}
async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}
function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    stdio: options.inherit ? "inherit" : ["ignore", "pipe", "pipe"],
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`${basename(command)} failed${detail ? `: ${detail.slice(-2000)}` : ""}`);
  }
  return String(result.stdout ?? "").trim();
}
function hashFile(path) {
  const result = spawnSync(process.execPath, [
    "-e",
    "const fs=require('fs'),c=require('crypto');const h=c.createHash('sha256');fs.createReadStream(process.argv[1]).on('data',d=>h.update(d)).on('end',()=>process.stdout.write(h.digest('hex')))",
    path,
  ], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`Could not hash ${path}.`);
  return String(result.stdout).trim();
}
function ffprobeDuration(ffprobe, path, cwd) {
  const output = run(ffprobe, [
    "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path,
  ], { cwd });
  const duration = Number(output);
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`Invalid audio duration for ${path}.`);
  }
  return duration;
}
function reusableSegment(prior, sourceHash) {
  return prior?.sourceHash === sourceHash
    && prior.status === "passed"
    && existsSync(prior.audioPath)
    && existsSync(prior.transcriptPath);
}
async function createSegment({ segment, manifest, model, outputDirectory, projectRoot, runtime, ffprobe, kokoroAssets, speedOverride }) {
  const segmentDirectory = resolve(outputDirectory, "segments", segment.id);
  await mkdir(segmentDirectory, { recursive: true });
  const scriptPath = resolve(segmentDirectory, "script.txt");
  const audioPath = resolve(segmentDirectory, "narration.wav");
  const rawTranscriptPath = resolve(segmentDirectory, "transcript.raw.json");
  const transcriptPath = resolve(segmentDirectory, "transcript.validated.json");
  await writeFile(scriptPath, `${segment.text}\n`, "utf8");
  run(runtime.python, [
    resolve(projectRoot, "scripts/synthesize-kokoro.py"),
    scriptPath,
    "--output", audioPath,
    "--model", kokoroAssets["kokoro-v1.0.onnx"],
    "--voices", kokoroAssets["voices-v1.0.bin"],
    "--voice", manifest.voice.id,
    "--language", manifest.language,
    "--speed", String(speedOverride ?? manifest.voice.speed),
  ], { cwd: projectRoot, env: runtime.env });
  const transcriber = resolve(projectRoot, "scripts/transcribe-faster-whisper.py");
  const transcriptionArgs = [
    transcriber,
    audioPath,
    "--output", rawTranscriptPath,
    "--model", model,
    "--language", manifest.language,
    "--device", manifest.transcription.device ?? "cpu",
    "--compute-type", manifest.transcription.computeType ?? "int8",
  ];
  const whisperCache = process.env.MEDIA_OS_WHISPER_CACHE?.trim();
  if (whisperCache) transcriptionArgs.push("--download-root", whisperCache);
  run(runtime.python, transcriptionArgs, { cwd: projectRoot, env: runtime.env });
  const rawTranscript = JSON.parse(await readFile(rawTranscriptPath, "utf8"));
  const validated = validateAndCleanTranscript(rawTranscript);
  const qa = manifest.language === "ja"
    ? JSON.parse(run(runtime.python, [
      resolve(projectRoot, "scripts/score-japanese-transcript.py"),
      scriptPath,
      rawTranscriptPath,
      "--minimum-accuracy", String(manifest.quality.minimumAccuracy),
    ], { cwd: projectRoot, env: runtime.env }))
    : scoreBackTranscript(
      segment.text,
      validated.words,
      manifest.language,
      manifest.quality.minimumAccuracy,
    );
  await writeJsonAtomic(transcriptPath, { ...validated, backTranscriptionQa: qa });
  if (!qa.passed) {
    throw new Error(
      `${segment.id} back-transcription accuracy ${(qa.accuracy * 100).toFixed(1)}% is below ${(qa.minimumAccuracy * 100).toFixed(1)}%.`,
    );
  }
  return {
    id: segment.id,
    role: segment.role,
    sceneId: segment.sceneId ?? null,
    claimIds: segment.claimIds,
    sourceLocator: segment.sourceLocator ?? null,
    pauseAfterSeconds: segment.pauseAfterSeconds,
    sourceHash: stableHash({
      segment,
      voice: manifest.voice,
      model,
      minimumAccuracy: manifest.quality.minimumAccuracy,
      qaVersion: manifest.language === "ja" ? "phoneme-v1" : "word-v1",
    }),
    status: "passed",
    attempts: 1,
    effectiveVoiceSpeed: speedOverride ?? manifest.voice.speed,
    audioPath,
    audioSha256: hashFile(audioPath),
    audioDuration: Number(ffprobeDuration(ffprobe, audioPath, projectRoot).toFixed(3)),
    transcriptPath,
    transcriptSha256: hashFile(transcriptPath),
    words: validated.words,
    qa,
  };
}

function segmentPaths(outputDirectory, segmentId) {
  const directory = resolve(outputDirectory, "segments", segmentId);
  return {
    directory,
    scriptPath: resolve(directory, "script.txt"),
    audioPath: resolve(directory, "narration.wav"),
    rawTranscriptPath: resolve(directory, "transcript.raw.json"),
    transcriptPath: resolve(directory, "transcript.validated.json"),
  };
}
async function finalizeGeneratedSegment({ segment, manifest, model, paths, projectRoot, runtime, ffprobe }) {
  const rawTranscript = JSON.parse(await readFile(paths.rawTranscriptPath, "utf8"));
  const validated = validateAndCleanTranscript(rawTranscript);
  const qa = manifest.language === "ja"
    ? JSON.parse(run(runtime.python, [
      resolve(projectRoot, "scripts/score-japanese-transcript.py"),
      paths.scriptPath,
      paths.rawTranscriptPath,
      "--minimum-accuracy", String(manifest.quality.minimumAccuracy),
    ], { cwd: projectRoot, env: runtime.env }))
    : scoreBackTranscript(segment.text, validated.words, manifest.language, manifest.quality.minimumAccuracy);
  await writeJsonAtomic(paths.transcriptPath, { ...validated, backTranscriptionQa: qa });
  if (!qa.passed) {
    throw new Error(
      `${segment.id} back-transcription accuracy ${(qa.accuracy * 100).toFixed(1)}% is below ${(qa.minimumAccuracy * 100).toFixed(1)}%.`,
    );
  }
  return {
    id: segment.id,
    role: segment.role,
    sceneId: segment.sceneId ?? null,
    claimIds: segment.claimIds,
    sourceLocator: segment.sourceLocator ?? null,
    pauseAfterSeconds: segment.pauseAfterSeconds,
    sourceHash: stableHash({
      segment,
      voice: manifest.voice,
      model,
      minimumAccuracy: manifest.quality.minimumAccuracy,
      qaVersion: manifest.language === "ja" ? "phoneme-v1" : "word-v1",
    }),
    status: "passed",
    attempts: 1,
    effectiveVoiceSpeed: manifest.voice.speed,
    audioPath: paths.audioPath,
    audioSha256: hashFile(paths.audioPath),
    audioDuration: Number(ffprobeDuration(ffprobe, paths.audioPath, projectRoot).toFixed(3)),
    transcriptPath: paths.transcriptPath,
    transcriptSha256: hashFile(paths.transcriptPath),
    words: validated.words,
    qa,
  };
}
async function createSegmentsBatch({
  segments, manifest, model, outputDirectory, projectRoot, runtime, ffprobe, kokoroAssets,
}) {
  const batchDirectory = resolve(outputDirectory, ".batch");
  await mkdir(batchDirectory, { recursive: true });
  const prepared = [];
  for (const segment of segments) {
    const paths = segmentPaths(outputDirectory, segment.id);
    await mkdir(paths.directory, { recursive: true });
    await writeFile(paths.scriptPath, `${segment.text}\n`, "utf8");
    prepared.push({ segment, paths });
  }
  const synthesisJobsPath = resolve(batchDirectory, "synthesis-jobs.json");
  await writeJsonAtomic(synthesisJobsPath, prepared.map(({ segment, paths }) => ({
    id: segment.id,
    input: paths.scriptPath,
    output: paths.audioPath,
    voice: manifest.voice.id,
    language: manifest.language,
    speed: manifest.voice.speed,
  })));
  run(runtime.python, [
    resolve(projectRoot, "scripts/synthesize-kokoro-batch.py"),
    synthesisJobsPath,
    "--model", kokoroAssets["kokoro-v1.0.onnx"],
    "--voices", kokoroAssets["voices-v1.0.bin"],
  ], { cwd: projectRoot, env: runtime.env });
  const transcriptionJobsPath = resolve(batchDirectory, "transcription-jobs.json");
  await writeJsonAtomic(transcriptionJobsPath, prepared.map(({ segment, paths }) => ({
    id: segment.id,
    input: paths.audioPath,
    output: paths.rawTranscriptPath,
  })));
  const transcriptionArgs = [
    resolve(projectRoot, "scripts/transcribe-faster-whisper-batch.py"),
    transcriptionJobsPath,
    "--model", model,
    "--language", manifest.language,
    "--device", manifest.transcription.device ?? "cpu",
    "--compute-type", manifest.transcription.computeType ?? "int8",
  ];
  const whisperCache = process.env.MEDIA_OS_WHISPER_CACHE?.trim();
  if (whisperCache) transcriptionArgs.push("--download-root", whisperCache);
  run(runtime.python, transcriptionArgs, { cwd: projectRoot, env: runtime.env });
  const results = [];
  for (const { segment, paths } of prepared) {
    try {
      results.push(await finalizeGeneratedSegment({
        segment, manifest, model, paths, projectRoot, runtime, ffprobe,
      }));
    } catch (initialError) {
      const retrySpeeds = [
        Math.max(0.7, Number((manifest.voice.speed - 0.06).toFixed(2))),
        Math.min(1.2, Number((manifest.voice.speed + 0.04).toFixed(2))),
      ];
      let recovered = null;
      for (const [retryIndex, speed] of retrySpeeds.entries()) {
        try {
          recovered = await createSegment({
            segment, manifest, model, outputDirectory, projectRoot, runtime, ffprobe, kokoroAssets,
            speedOverride: speed,
          });
          recovered.attempts = retryIndex + 2;
          break;
        } catch (retryError) {
          if (retryIndex === retrySpeeds.length - 1) {
            throw new Error(`${initialError.message} Automatic pronunciation recovery failed: ${retryError.message}`);
          }
        }
      }
      results.push(recovered);
    }
  }
  return results;
}
export async function runNarrationPipeline(options) {
  const projectRoot = resolve(options.projectRoot ?? ".");
  const manifestPath = resolve(projectRoot, options.manifest);
  const manifest = validateNarrationManifest(JSON.parse(await readFile(manifestPath, "utf8")));
  const model = String(options.transcribeModel ?? manifest.transcription.model);
  if (manifest.language !== "en" && model.endsWith(".en")) {
    throw new Error(`English-only model ${model} cannot transcribe ${manifest.language}.`);
  }
  const outputDirectory = resolve(
    projectRoot,
    options.output ?? `renders/narration/${manifest.episodeId}`,
  );
  await mkdir(outputDirectory, { recursive: true });
  const statePath = resolve(outputDirectory, "narration-run.json");
  const lockPath = resolve(outputDirectory, ".pipeline.lock");
  if (existsSync(lockPath)) throw new Error(`Narration pipeline is already locked: ${lockPath}`);
  await writeFile(lockPath, `${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() })}\n`, { flag: "wx" });
  const runtime = voiceEnvironment(projectRoot);
  const cacheRoot = resolve(process.env.XDG_CACHE_HOME?.trim() || resolve(projectRoot, ".cache"));
  const kokoroAssets = await ensureKokoroAssets(resolve(cacheRoot, "voice-models"));
  const ffmpeg = process.env.FFMPEG_PATH?.trim() || "ffmpeg";
  const ffprobe = process.env.FFPROBE_PATH?.trim() || "ffprobe";
  const prior = existsSync(statePath) ? JSON.parse(await readFile(statePath, "utf8")) : null;
  const state = {
    version: 1,
    episodeId: manifest.episodeId,
    language: manifest.language,
    manifestPath,
    manifestSha256: hashFile(manifestPath),
    status: "running",
    startedAt: new Date().toISOString(),
    model,
    segments: [],
  };
  try {
    const missingSegments = [];
    const reusableById = new Map();
    for (const segment of manifest.segments) {
      const sourceHash = stableHash({
        segment,
        voice: manifest.voice,
        model,
        minimumAccuracy: manifest.quality.minimumAccuracy,
        qaVersion: manifest.language === "ja" ? "phoneme-v1" : "word-v1",
      });
      const previousSegment = prior?.segments?.find((item) => item.id === segment.id);
      if (!options.force && reusableSegment(previousSegment, sourceHash)) {
        const transcript = JSON.parse(await readFile(previousSegment.transcriptPath, "utf8"));
        reusableById.set(segment.id, { ...previousSegment, words: transcript.words, resumed: true });
      } else {
        const paths = segmentPaths(outputDirectory, segment.id);
        const exactScript = existsSync(paths.scriptPath) && (await readFile(paths.scriptPath, "utf8")).trim() === segment.text;
        if (!options.force && exactScript && existsSync(paths.audioPath) && existsSync(paths.rawTranscriptPath)) {
          try {
            const recovered = await finalizeGeneratedSegment({ segment, manifest, model, paths, projectRoot, runtime, ffprobe });
            reusableById.set(segment.id, { ...recovered, resumed: true, recoveredFromArtifacts: true });
          } catch (error) {
            console.warn(`[narration] ${segment.id} cached artifacts require regeneration: ${error instanceof Error ? error.message : String(error)}`);
            missingSegments.push(segment);
          }
        } else {
          missingSegments.push(segment);
        }
      }
    }
    const generated = missingSegments.length > 0
      ? await createSegmentsBatch({
        segments: missingSegments,
        manifest,
        model,
        outputDirectory,
        projectRoot,
        runtime,
        ffprobe,
        kokoroAssets,
      })
      : [];
    const generatedById = new Map(generated.map((segment) => [segment.id, segment]));
    state.segments = manifest.segments.map((segment) => reusableById.get(segment.id) ?? generatedById.get(segment.id));
    if (state.segments.some((segment) => !segment)) {
      throw new Error("Narration batch did not return every requested segment.");
    }
    await writeJsonAtomic(statePath, state);
    const timeline = options.timeline
      ? buildSceneAlignedNarrationTimeline(
        state.segments,
        JSON.parse(await readFile(resolve(projectRoot, options.timeline), "utf8")),
        manifest.gapSeconds,
      )
      : null;
    const narrationPath = resolve(outputDirectory, "narration.wav");
    const durationSeconds = await assembleNarrationAudio({
      segmentResults: state.segments, timeline, gapSeconds: manifest.gapSeconds,
      outputPath: narrationPath, projectRoot, ffmpeg, ffprobe, run, probe: ffprobeDuration,
    });
    const merged = mergeSegmentTranscripts(
      state.segments,
      manifest.language,
      `faster-whisper-${model}`,
      manifest.gapSeconds,
      timeline,
    );
    const transcriptPath = resolve(outputDirectory, "transcript.validated.json");
    const transcript = {
      ...merged,
      quality: {
        passed: true,
        segmentCount: state.segments.length,
        minimumAccuracy: manifest.quality.minimumAccuracy,
        lowestAccuracy: Math.min(...state.segments.map((segment) => segment.qa.accuracy)),
        warnings: [],
      },
    };
    await writeJsonAtomic(transcriptPath, transcript);

    const captionPath = resolve(outputDirectory, "captions.ass");
    const captionManifestPath = resolve(outputDirectory, "captions.json");
    run(process.execPath, [
      resolve(projectRoot, "scripts/generate-ass-captions.mjs"),
      transcriptPath,
      "--output", captionPath,
      "--profile", "landscape",
      "--manifest-output", captionManifestPath,
    ], { cwd: projectRoot });

    Object.assign(state, {
      status: "review_required",
      completedAt: new Date().toISOString(),
      reviewGate: "voice_rights_pronunciation_and_caption_sync",
      durationSeconds,
      speechDurationSeconds: merged.speechDurationSeconds,
      alignment: timeline,
      narrationPath,
      narrationSha256: hashFile(narrationPath),
      transcriptPath,
      transcriptSha256: hashFile(transcriptPath),
      captionPath,
      captionSha256: hashFile(captionPath),
      rights: {
        provider: manifest.voice.provider,
        voiceId: manifest.voice.id,
        provenance: manifest.voice.provenance,
        humanImitation: false,
        modelLicense: manifest.voice.modelLicense,
        adapterLicense: manifest.voice.adapterLicense,
      },
    });
    await writeJsonAtomic(statePath, state);
    return state;
  } catch (error) {
    Object.assign(state, {
      status: "failed",
      failedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    });
    await writeJsonAtomic(statePath, state);
    throw error;
  } finally {
    await rm(lockPath, { force: true });
  }
}

async function main(argv) {
  const args = parseArgs(argv);
  if (!args.manifest) {
    throw new Error("Usage: node scripts/run-narration-pipeline.mjs <manifest.json> [--output dir] [--timeline blueprint.json] [--transcribe-model model] [--force]");
  }
  const state = await runNarrationPipeline({
    manifest: args.manifest,
    output: args.output,
    timeline: args.timeline,
    transcribeModel: args["transcribe-model"],
    force: args.force,
  });
  process.stdout.write(`${JSON.stringify({
    ok: true,
    status: state.status,
    episodeId: state.episodeId,
    durationSeconds: state.durationSeconds,
    segments: state.segments.length,
    narrationPath: state.narrationPath,
    transcriptPath: state.transcriptPath,
  })}\n`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
