import { describe, expect, it } from "vitest";
import { buildSoundMixGraph, buildStemInputArgs } from "./sound-mix-filter-core.mjs";

const manifest = {
  mix: { narrationGainDb: 0, ducking: { threshold: 0.03, ratio: 8, attackMs: 20, releaseMs: 350 } },
  tracks: [
    { kind: "ambience", sourcePath: "room.wav", startSeconds: 0, durationSeconds: 30, gainDb: -28, loop: true },
    { kind: "sfx", sourcePath: "hit.wav", startSeconds: 4.25, durationSeconds: 1, gainDb: -12, loop: false },
  ],
};

describe("sound mix filter graph", () => {
  it("builds deterministic sidechain ducking and timed cues", () => {
    const graph = buildSoundMixGraph(manifest, 30);
    expect(graph).toContain("asplit=2[voice][sidechain0]");
    expect(graph).toContain("sidechaincompress=threshold=0.03:ratio=8:attack=20:release=350");
    expect(graph).toContain("adelay=4250|4250");
    expect(graph).toContain("amix=inputs=3");
  });

  it("loops only tracks marked as loopable", () => {
    expect(buildStemInputArgs(manifest)).toEqual(["-stream_loop", "-1", "-i", "room.wav", "-i", "hit.wav"]);
  });
});
