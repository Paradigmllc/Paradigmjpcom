import { describe, expect, it } from "vitest";
import { evaluateGeneratedAsset, evaluateGeneratedAssetSet } from "./visual-asset-quality-core.mjs";

const hostProfile = {
  id: "realistic_host",
  outputKind: "video",
  quality: {
    minimumWidth: 768, minimumHeight: 768, minimumBytes: 250000,
    minimumDurationSeconds: 3, maximumDurationSeconds: 12,
    requireAlpha: false, requireLipSyncScore: true, minimumLipSyncScore: 0.72,
    requireIdentityScore: true, minimumIdentityScore: 0.82,
  },
};

describe("generated visual quality gate", () => {
  it("requires objective identity and lip-sync evidence for a realistic host", () => {
    const report = evaluateGeneratedAsset({
      profile: hostProfile,
      asset: { id: "host-1" },
      generated: { outputKind: "video", actualWidth: 1024, actualHeight: 1024, bytes: 900000, durationSeconds: 5, pixelFormat: "yuv420p" },
      verification: { identityScore: 0.9, lipSyncScore: 0.8 },
    });
    expect(report.status).toBe("pass");
    expect(report.score).toBe(100);
  });

  it("blocks a visually plausible host when sync evidence is absent", () => {
    const report = evaluateGeneratedAsset({
      profile: hostProfile,
      asset: { id: "host-1" },
      generated: { outputKind: "video", actualWidth: 1024, actualHeight: 1024, bytes: 900000, durationSeconds: 5, pixelFormat: "yuv420p" },
    });
    expect(report.status).toBe("blocked");
    expect(report.blockerIds).toEqual(expect.arrayContaining(["lip_sync_score", "identity_score"]));
  });

  it("blocks exact duplicate outputs across different shots", () => {
    const report = evaluateGeneratedAssetSet([
      { id: "shot-1", outputSha256: "same" },
      { id: "shot-2", outputSha256: "same" },
      { id: "shot-3", outputSha256: "different" },
    ]);
    expect(report.status).toBe("blocked");
    expect(report.duplicateAssetIds).toEqual(["shot-1", "shot-2"]);
  });
});
