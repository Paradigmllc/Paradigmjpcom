import { createHash } from "node:crypto";

const TENSION_BEATS = new Set(["evidence", "mechanism", "warning", "gap", "counterclaim", "reversal", "failure"]);
const RESOLUTION_BEATS = new Set(["response", "outcome", "implications", "method", "outro", "lessons"]);

function hashNumber(value, minimum, maximum) {
  const digest = createHash("sha256").update(value).digest();
  return minimum + (digest.readUInt32BE(0) % (maximum - minimum + 1));
}

function frequencyFor(scene, episodeId) {
  const roots = TENSION_BEATS.has(scene.beat) ? [46, 49, 52, 55] : RESOLUTION_BEATS.has(scene.beat) ? [55, 58, 62, 65] : [49, 52, 55, 58];
  return roots[hashNumber(`${episodeId}:${scene.id}:root`, 0, roots.length - 1)];
}

export function buildOriginalScorePlan(blueprint) {
  const beds = blueprint.scenes.map((scene, index) => {
    const rootHz = frequencyFor(scene, blueprint.episodeId);
    const tension = TENSION_BEATS.has(scene.beat) ? 0.78 : RESOLUTION_BEATS.has(scene.beat) ? 0.34 : 0.52;
    return {
      id: `snd-bed-${String(index + 1).padStart(2, "0")}`,
      kind: "music",
      sceneId: scene.id,
      startSeconds: scene.startSeconds,
      durationSeconds: scene.durationSeconds,
      rootHz,
      fifthHz: Number((rootHz * 1.4983).toFixed(3)),
      octaveHz: rootHz * 2,
      tension,
      // Generated beds average roughly -25 dBFS before mix gain. Keep the
      // unducked bed near -31 dBFS so documentary breathing room remains
      // audible, then let the dialogue sidechain create the final separation.
      gainDb: Number((-8 + tension * 3).toFixed(1)),
      motif: `${scene.beat}:${scene.rhythm}`,
    };
  });
  const cues = blueprint.scenes.slice(1).map((scene, index) => {
    const previous = blueprint.scenes[index];
    const emphasis = TENSION_BEATS.has(scene.beat) || scene.beat === "hook" ? "impact"
      : RESOLUTION_BEATS.has(scene.beat) ? "resolve" : index % 2 === 0 ? "paper" : "pulse";
    return {
      id: `snd-cue-${String(index + 1).padStart(2, "0")}`,
      kind: "sfx",
      sceneId: scene.id,
      startSeconds: Math.max(0, scene.startSeconds - Math.min(0.18, previous.durationSeconds * 0.01)),
      durationSeconds: emphasis === "paper" ? 0.72 : emphasis === "impact" ? 1.1 : 0.9,
      gainDb: emphasis === "impact" ? -15 : -18,
      emphasis,
      rootHz: frequencyFor(scene, blueprint.episodeId),
    };
  });
  return { version: "2026-08-03.2", episodeId: blueprint.episodeId, durationSeconds: blueprint.targetDurationSeconds, beds, cues };
}

export function bedFfmpegArgs(item, output) {
  const duration = item.durationSeconds.toFixed(3);
  const pulseHz = (0.11 + item.tension * 0.045).toFixed(4);
  const graph = [
    `[0:a]volume=0.20,tremolo=f=${pulseHz}:d=0.18,lowpass=f=520[a0]`,
    `[1:a]volume=0.105,tremolo=f=${(Number(pulseHz) * 1.31).toFixed(4)}:d=0.12,lowpass=f=780[a1]`,
    `[2:a]volume=0.05,lowpass=f=1700,highpass=f=90[a2]`,
    `[3:a]highpass=f=120,lowpass=f=2200,volume=${(0.012 + item.tension * 0.01).toFixed(4)}[noise]`,
    `[a0][a1][a2][noise]amix=inputs=4:normalize=0,highpass=f=28,aecho=0.72:0.35:90|180:0.16|0.08,` +
      `afade=t=in:st=0:d=1.8,afade=t=out:st=${Math.max(0, item.durationSeconds - 2).toFixed(3)}:d=2,` +
      "volume=24dB,alimiter=limit=0.72,pan=stereo|c0=0.92*c0+0.08*c1|c1=0.08*c0+0.92*c1[out]",
  ].join(";");
  return [
    "-hide_banner", "-loglevel", "error", "-y",
    "-f", "lavfi", "-i", `sine=frequency=${item.rootHz}:sample_rate=48000:duration=${duration}`,
    "-f", "lavfi", "-i", `sine=frequency=${item.fifthHz}:sample_rate=48000:duration=${duration}`,
    "-f", "lavfi", "-i", `sine=frequency=${item.octaveHz}:sample_rate=48000:duration=${duration}`,
    "-f", "lavfi", "-i", `anoisesrc=color=pink:sample_rate=48000:duration=${duration}:seed=${Math.round(item.rootHz * 100)}`,
    "-filter_complex", graph, "-map", "[out]", "-c:a", "pcm_s24le", "-ar", "48000", output,
  ];
}

export function cueFfmpegArgs(item, output) {
  const duration = item.durationSeconds.toFixed(3);
  const isImpact = item.emphasis === "impact";
  const isPaper = item.emphasis === "paper";
  const toneVolume = isImpact ? 0.34 : item.emphasis === "resolve" ? 0.22 : 0.18;
  const noiseVolume = isPaper ? 0.2 : isImpact ? 0.09 : 0.045;
  const highpass = isPaper ? 900 : 120;
  const lowpass = isPaper ? 6500 : isImpact ? 1800 : 3200;
  const graph = [
    `[0:a]volume=${toneVolume},afade=t=out:st=${Math.max(0.08, item.durationSeconds * 0.22).toFixed(3)}:d=${Math.max(0.1, item.durationSeconds * 0.78).toFixed(3)}[tone]`,
    `[1:a]highpass=f=${highpass},lowpass=f=${lowpass},volume=${noiseVolume},afade=t=out:st=0:d=${duration}[noise]`,
    `[tone][noise]amix=inputs=2:normalize=0,aecho=0.65:0.25:45|105:0.12|0.06,alimiter=limit=0.86,pan=stereo|c0=c0|c1=c0[out]`,
  ].join(";");
  return [
    "-hide_banner", "-loglevel", "error", "-y",
    "-f", "lavfi", "-i", `sine=frequency=${isImpact ? item.rootHz : item.rootHz * 2}:sample_rate=48000:duration=${duration}`,
    "-f", "lavfi", "-i", `anoisesrc=color=${isPaper ? "white" : "pink"}:sample_rate=48000:duration=${duration}:seed=${Math.round(item.rootHz * 10)}`,
    "-filter_complex", graph, "-map", "[out]", "-c:a", "pcm_s24le", "-ar", "48000", output,
  ];
}
