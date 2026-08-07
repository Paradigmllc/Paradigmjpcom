import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

async function concatenateAudio(options) {
  const concatDirectory = resolve(dirname(options.outputPath), ".concat");
  await rm(concatDirectory, { recursive: true, force: true });
  await mkdir(concatDirectory, { recursive: true });
  const normalizedPaths = [];
  for (const [index, segment] of options.segmentResults.entries()) {
    const normalizedPath = resolve(concatDirectory, `${String(index + 1).padStart(3, "0")}.wav`);
    const configuredGap = Number(segment.pauseAfterSeconds);
    const segmentGap = Number.isFinite(configuredGap) ? configuredGap : options.gapSeconds;
    options.run(options.ffmpeg, [
      "-hide_banner", "-loglevel", "error", "-y", "-i", segment.audioPath,
      "-af", `aresample=48000,apad=pad_dur=${segmentGap}`,
      "-t", (segment.audioDuration + segmentGap).toFixed(3),
      "-ac", "1", "-c:a", "pcm_s16le", normalizedPath,
    ], { cwd: options.projectRoot });
    normalizedPaths.push(normalizedPath);
  }
  const listPath = resolve(concatDirectory, "segments.txt");
  const list = normalizedPaths.map((path) => `file '${path.replaceAll("\\", "/").replaceAll("'", "'\\''")}'`).join("\n");
  await writeFile(listPath, `${list}\n`, "utf8");
  options.run(options.ffmpeg, [
    "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", listPath,
    "-c:a", "pcm_s16le", options.outputPath,
  ], { cwd: options.projectRoot });
}

function renderSceneAlignedAudio(options) {
  const inputs = ["-f", "lavfi", "-t", String(options.timeline.durationSeconds), "-i", "anullsrc=r=48000:cl=mono"];
  const filters = ["[0:a]aresample=48000[base]"];
  for (const [index, segment] of options.segmentResults.entries()) {
    const placement = options.timeline.placements.find((item) => item.id === segment.id);
    if (!placement) throw new Error(`Narration placement is missing for ${segment.id}.`);
    inputs.push("-i", segment.audioPath);
    filters.push(`[${index + 1}:a]aresample=48000,adelay=${Math.round(placement.startSeconds * 1000)}:all=1[n${index + 1}]`);
  }
  const mixInputs = ["[base]", ...options.segmentResults.map((_, index) => `[n${index + 1}]`)].join("");
  filters.push(`${mixInputs}amix=inputs=${options.segmentResults.length + 1}:duration=longest:dropout_transition=0:normalize=0,atrim=duration=${options.timeline.durationSeconds}[out]`);
  options.run(options.ffmpeg, [
    "-hide_banner", "-loglevel", "error", "-y", ...inputs,
    "-filter_complex", filters.join(";"), "-map", "[out]",
    "-ac", "1", "-ar", "48000", "-c:a", "pcm_s16le", options.outputPath,
  ], { cwd: options.projectRoot });
}

export async function assembleNarrationAudio(options) {
  if (options.timeline) renderSceneAlignedAudio(options);
  else await concatenateAudio(options);
  return Number(options.probe(options.ffprobe, options.outputPath, options.projectRoot).toFixed(3));
}
