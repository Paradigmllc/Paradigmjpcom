import { describe, expect, it } from "vitest";
import { bedFfmpegArgs, buildOriginalScorePlan, cueFfmpegArgs } from "./original-score-core.mjs";

const blueprint = {
  episodeId: "episode-score-test",
  targetDurationSeconds: 120,
  scenes: [
    { id: "scene-1", beat: "hook", startSeconds: 0, durationSeconds: 30, rhythm: "fast" },
    { id: "scene-2", beat: "evidence", startSeconds: 30, durationSeconds: 50, rhythm: "hold" },
    { id: "scene-3", beat: "outro", startSeconds: 80, durationSeconds: 40, rhythm: "resolve" },
  ],
};

describe("original procedural score", () => {
  it("covers every scene and creates a cue at every boundary", () => {
    const plan = buildOriginalScorePlan(blueprint);
    expect(plan.beds).toHaveLength(3);
    expect(plan.cues).toHaveLength(2);
    expect(plan.beds.reduce((sum, bed) => sum + bed.durationSeconds, 0)).toBe(120);
    expect(new Set(plan.beds.map((bed) => bed.rootHz)).size).toBeGreaterThan(1);
    expect(plan.beds.every((bed) => bed.gainDb >= -7 && bed.gainDb <= -5)).toBe(true);
  });

  it("builds deterministic 24-bit FFmpeg commands", () => {
    const plan = buildOriginalScorePlan(blueprint);
    const bed = bedFfmpegArgs(plan.beds[0], "bed.wav").join(" ");
    const cue = cueFfmpegArgs(plan.cues[0], "cue.wav").join(" ");
    expect(bed).toContain("pcm_s24le");
    expect(bed).toContain("seed=");
    expect(bed).toContain("volume=24dB,alimiter=limit=0.72");
    expect(cue).toContain("alimiter");
  });
});
