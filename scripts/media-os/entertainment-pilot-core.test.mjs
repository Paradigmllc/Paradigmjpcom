import { describe, expect, it } from "vitest";
import { buildEntertainmentPilot, resolveFormatProfile } from "./entertainment-pilot-core.mjs";

const blueprint = {
  episodeId: "episode-test-ja",
  channelId: "channel-ledger-ja",
  language: "ja",
  title: "Test",
  fingerprint: "abc123",
  scenes: [
    { id: "scene-1", claimStatus: null, sourceLocator: null },
    { id: "scene-2", claimStatus: "confirmed", sourceLocator: "FBI record" },
  ],
};

const narration = {
  episodeId: "episode-test-ja",
  segments: [
    { id: "n1", sceneId: "scene-1", text: "A surprising opening that creates tension.", visualSync: "Macro paper fibers split around a hidden ledger.", targetDurationSeconds: 22, pauseAfterSeconds: 1, claimIds: [] },
    { id: "n2", sceneId: "scene-2", text: "The first verified fact changes the direction of the story.", visualSync: "A dated record interrupts the reconstruction.", targetDurationSeconds: 26, pauseAfterSeconds: 1, claimIds: ["claim-1"], sourceLocator: "FBI record" },
    { id: "n3", sceneId: "scene-2", text: "A second layer complicates the initial answer.", visualSync: "The evidence path folds into a new question.", targetDurationSeconds: 45, pauseAfterSeconds: 1, claimIds: ["claim-1"], sourceLocator: "FBI record" },
  ],
};

describe("entertainment pilot direction", () => {
  it("creates a paced 90-second shot plan instead of long presentation scenes", () => {
    const { plan, report } = buildEntertainmentPilot({ blueprint, narration, channelFormat: "investigative_docudrama" });
    expect(plan.durationSeconds).toBe(90);
    expect(plan.shots.length).toBeGreaterThanOrEqual(14);
    expect(Math.max(...plan.shots.map((shot) => shot.durationSeconds))).toBeLessThanOrEqual(9);
    expect(report.status).toBe("pass");
    expect(report.score).toBe(100);
  });

  it("limits avatar presence and presentation graphics", () => {
    const { report } = buildEntertainmentPilot({ blueprint, narration, channelFormat: "investigative_docudrama" });
    expect(report.metrics.avatarShare).toBeGreaterThanOrEqual(0.12);
    expect(report.metrics.avatarShare).toBeLessThanOrEqual(0.3);
    expect(report.metrics.presentationShare).toBeLessThanOrEqual(0.15);
    expect(report.metrics.dynamicMotionShare).toBeGreaterThanOrEqual(0.25);
    expect(report.metrics.dynamicMotionShare).toBeLessThanOrEqual(0.45);
  });

  it("retains source locators and disclosure contracts", () => {
    const { plan } = buildEntertainmentPilot({ blueprint, narration, channelFormat: "investigative_docudrama" });
    expect(plan.shots.filter((shot) => shot.claimIds.length > 0).every((shot) => shot.sourceLocator)).toBe(true);
    expect(plan.visualAssetManifest.assets.every((asset) => asset.realPersonLikeness === false)).toBe(true);
    expect(plan.visualAssetManifest.assets.filter((asset) => asset.photorealistic).every((asset) => asset.disclosureRequired)).toBe(true);
    expect(plan.visualAssetManifest.version).toBe(2);
    expect(plan.visualAssetManifest.assets.every((asset) => asset.productionProfileId && asset.expectedOutputKind)).toBe(true);
    expect(plan.visualAssetManifest.assets.find((asset) => asset.generationRole === "avatar_fullscreen")).toMatchObject({
      productionProfileId: "realistic_host",
      expectedOutputKind: "video",
    });
  });

  it("routes channel formats to distinct entertainment families", () => {
    expect(resolveFormatProfile("courtroom_manga").family).toBe("motion_comic_casefile");
    expect(resolveFormatProfile("screenlife_investigation").family).toBe("screenlife_thriller");
    expect(resolveFormatProfile("unknown_format").family).toBe("cinematic_evidence_story");
  });
});
