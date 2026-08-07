export const RENDERED_MASTER_GATE_VERSION = "2026-08-02.1";
export const RENDERED_MASTER_THRESHOLD = 92;

function frameRate(value) {
  if (typeof value !== "string") return 0;
  const [numerator, denominator = "1"] = value.split("/").map(Number);
  return denominator > 0 ? numerator / denominator : 0;
}

function check(id, weight, passed, evidence, blocker = true) {
  return { id, weight, passed, points: passed ? weight : 0, evidence, blocker };
}

export function evaluateRenderedMaster({ probe, targetDuration, loudness, blackSegments = [], silenceSegments = [], sampleHashes = [] }) {
  const streams = Array.isArray(probe?.streams) ? probe.streams : [];
  const video = streams.find((stream) => stream.codec_type === "video");
  const audio = streams.find((stream) => stream.codec_type === "audio");
  const duration = Number(probe?.format?.duration ?? video?.duration ?? 0);
  const fps = frameRate(video?.avg_frame_rate ?? video?.r_frame_rate);
  const integrated = Number(loudness?.input_i);
  const truePeak = Number(loudness?.input_tp);
  const maxBlack = Math.max(0, ...blackSegments.map((segment) => Number(segment.duration) || 0));
  const maxSilence = Math.max(0, ...silenceSegments.map((segment) => Number(segment.duration) || 0));
  const uniqueFrameShare = sampleHashes.length > 0 ? new Set(sampleHashes).size / sampleHashes.length : 0;
  const checks = [
    check("duration_contract", 10, Math.abs(duration - targetDuration) <= 0.2, { actual: duration, target: targetDuration }),
    check("delivery_video_stream", 15, Boolean(video && ["h264", "hevc"].includes(video.codec_name)), { codec: video?.codec_name ?? null }),
    check("delivery_geometry", 10, video?.width === 1920 && video?.height === 1080, { width: video?.width ?? null, height: video?.height ?? null }),
    check("delivery_frame_rate", 10, fps >= 29 && fps <= 31, { fps: Number(fps.toFixed(3)) }),
    check("delivery_audio_stream", 15, Boolean(audio), { codec: audio?.codec_name ?? null, channels: audio?.channels ?? null }),
    check("audio_sample_rate", 5, Number(audio?.sample_rate) >= 44100, { sampleRate: Number(audio?.sample_rate ?? 0) }),
    check("integrated_loudness", 15, Number.isFinite(integrated) && integrated >= -18 && integrated <= -11, { integratedLufs: integrated }),
    check("true_peak_ceiling", 10, Number.isFinite(truePeak) && truePeak <= -1 && truePeak >= -12, { truePeakDbtp: truePeak }),
    check("motion_sample_uniqueness", 4, uniqueFrameShare >= 0.7, { samples: sampleHashes.length, uniqueShare: Number(uniqueFrameShare.toFixed(3)) }),
    check("black_frame_budget", 3, maxBlack <= 1.5, { maxBlackSeconds: maxBlack }, false),
    check("silence_budget", 3, maxSilence <= 3, { maxSilenceSeconds: maxSilence }, false),
  ];
  const score = checks.reduce((sum, item) => sum + item.points, 0);
  const blockerIds = checks.filter((item) => item.blocker && !item.passed).map((item) => item.id);
  return {
    kind: "rendered_master",
    version: RENDERED_MASTER_GATE_VERSION,
    threshold: RENDERED_MASTER_THRESHOLD,
    status: score >= RENDERED_MASTER_THRESHOLD && blockerIds.length === 0 ? "pass" : "blocked",
    score,
    blockerIds,
    checks,
  };
}
