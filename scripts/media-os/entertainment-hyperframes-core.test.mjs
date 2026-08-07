import { describe, expect, it } from "vitest";
import { compileEntertainmentHyperframesProject } from "./entertainment-hyperframes-core.mjs";

const design = {
  channelId: "channel-test", name: "Test", mood: "cinematic", background: "#0B0B0B", foreground: "#F5F0E6",
  surface: "#171717", surfaceRaised: "#2D2D2D", accent: "#E1B84B", alleged: "#EE7D79", muted: "#B8B0A2",
  displayFont: "Newsreader", bodyFont: "IBM Plex Sans", monoFont: "IBM Plex Mono", layoutSignature: "test", texture: "grain",
};
const shots = Array.from({ length: 14 }, (_, index) => ({
  id: `shot-${String(index + 1).padStart(3, "0")}`, ordinal: index + 1, startSeconds: index * 4.5,
  durationSeconds: index === 13 ? 4.5 : 4.5, storyFunction: index === 0 ? "cold_open" : "evidence",
  energy: "medium", visualMode: index % 2 ? "cinematic_reconstruction" : "source_document",
  hostMode: index === 0 ? "fictional_host_fullscreen" : "offscreen_narration", narrationExcerpt: "A concise narrative line that advances the investigation.",
  claimIds: index > 4 ? ["claim-1"] : [], claimStatus: index > 4 ? "confirmed" : null,
  sourceLocator: index > 4 ? "authoritative record" : null, transitionOut: "focus_pull", assetRequired: index % 2 === 1,
}));
const requested = shots.filter((shot) => shot.assetRequired).map((shot) => ({ id: `test-${shot.id}` }));
const plan = {
  episodeId: "episode-test", channelId: "channel-test", durationSeconds: 63, formatFamily: "cinematic_investigator",
  fingerprint: "plan-fingerprint", shots, visualAssetManifest: { assets: requested },
};
const blueprint = { episodeId: "episode-test", channelId: "channel-test", language: "en", title: "Test", scenes: [] };
const media = {
  narrationRelativePath: "assets/narration.wav", narrationDurationSeconds: 63, captions: [],
  visualAssets: requested.map((asset, index) => ({ ...asset, sceneOrdinal: shots.filter((shot) => shot.assetRequired)[index].ordinal, relativePath: `assets/generated/${asset.id}.png` })),
};

describe("entertainment HyperFrames compiler", () => {
  it("turns shot direction into image-dominant compositions", () => {
    const compiled = compileEntertainmentHyperframesProject({ plan, blueprint, design, media });
    expect(compiled.scenes).toHaveLength(14);
    expect(compiled.files["compositions/scene-02.html"]).toContain("primary-cinematic-plate");
    expect(compiled.files["compositions/scene-02.html"]).toContain("SYNTHETIC · ORIGINAL CHARACTER / RECONSTRUCTION");
    expect(compiled.files["index.html"]).toContain('data-duration="63"');
  });

  it("fails closed when a requested GPU asset is absent", () => {
    expect(() => compileEntertainmentHyperframesProject({ plan, blueprint, design, media: { ...media, visualAssets: [] } }))
      .toThrow("missing 7 generated assets");
  });

  it("uses timed muted video clips for generated motion assets", () => {
    const motionMedia = {
      ...media,
      visualAssets: media.visualAssets.map((asset, index) => index === 0
        ? { ...asset, outputKind: "video", relativePath: `assets/generated/${asset.id}.mp4` }
        : asset),
    };
    const compiled = compileEntertainmentHyperframesProject({ plan, blueprint, design, media: motionMedia });
    expect(compiled.files["compositions/scene-02.html"]).toContain("<video");
    expect(compiled.files["compositions/scene-02.html"]).toContain("muted playsinline");
    expect(compiled.files["compositions/scene-02.html"]).toContain('data-track-index="0"');
  });
});
