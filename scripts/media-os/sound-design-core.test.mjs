import { describe, expect, it } from "vitest";
import { evaluateSoundDesignPlan, validateSoundDesignManifest } from "./sound-design-core.mjs";

const base = {
  version: 1,
  episodeId: "episode-test",
  mix: {
    targetIntegratedLufs: -14,
    targetTruePeakDbtp: -1.5,
    narrationGainDb: 0,
    ducking: { threshold: 0.03, ratio: 8, attackMs: 20, releaseMs: 350 },
  },
  tracks: [
    { id: "snd-room", kind: "ambience", source: "room.wav", startSeconds: 0, durationSeconds: 20, gainDb: -30, loop: true, sha256: "a".repeat(64), rights: { license: "project-original", commercialUse: true, provenance: "in-house recording", aiGenerated: false } },
    ...[2, 8, 14].map((start, index) => ({ id: `snd-hit-${index}`, kind: "sfx", source: `hit-${index}.wav`, startSeconds: start, durationSeconds: 1, gainDb: -14, loop: false, sha256: "b".repeat(64), rights: { license: "CC0-1.0", commercialUse: true, provenance: "verified library", aiGenerated: false } })),
  ],
};

describe("sound design contract", () => {
  it("passes a rights-tracked, ducked plan", () => {
    const manifest = validateSoundDesignManifest(base, "C:/project/operations/sound-design.json", { episodeId: "episode-test", durationSeconds: 20, generatedMusicAllowed: false });
    expect(evaluateSoundDesignPlan(manifest, 20).status).toBe("pass");
  });

  it("rejects generated music when the editorial policy forbids it", () => {
    const input = structuredClone(base);
    input.tracks[0].kind = "music";
    input.tracks[0].rights.aiGenerated = true;
    expect(() => validateSoundDesignManifest(input, "C:/project/operations/sound-design.json", { episodeId: "episode-test", durationSeconds: 20, generatedMusicAllowed: false })).toThrow(/generatedMusicAllowed/);
  });

  it("blocks sparse sound design", () => {
    const manifest = validateSoundDesignManifest({ ...base, tracks: [] }, "C:/project/operations/sound-design.json", { episodeId: "episode-test", durationSeconds: 20, generatedMusicAllowed: false });
    expect(evaluateSoundDesignPlan(manifest, 20).blockers.map((item) => item.id)).toEqual(expect.arrayContaining(["sound_bed_coverage", "sound_effect_cue_density"]));
  });
});
