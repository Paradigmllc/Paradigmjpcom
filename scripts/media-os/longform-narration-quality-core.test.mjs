import { describe, expect, it } from "vitest";
import { evaluateLongformNarrationPlan } from "./longform-narration-quality-core.mjs";

const blueprint = {
  language: "en",
  targetDurationSeconds: 20,
  provenance: { claimIds: ["claim-1"] },
  scenes: [{ id: "scene-1" }, { id: "scene-2" }],
};

describe("longform narration quality", () => {
  it("passes a scene-aligned, sourced plan and rendered narration", () => {
    const report = evaluateLongformNarrationPlan({
      blueprint,
      narrationManifest: {
        segments: [
          { sceneId: "scene-1", role: "evidence", text: "Verified record.", claimIds: ["claim-1"], sourceLocator: "page 4", targetDurationSeconds: 7 },
          { sceneId: "scene-2", role: "transition", text: "Now follow the cash.", claimIds: [], targetDurationSeconds: 7 },
        ],
      },
      narrationState: {
        durationSeconds: 20,
        speechDurationSeconds: 14,
        alignment: {
          mode: "scene_aligned",
          durationSeconds: 20,
          placements: [{ sceneId: "scene-1" }, { sceneId: "scene-2" }],
        },
      },
    });
    expect(report.status).toBe("pass");
    expect(report.metrics.sceneCoverage).toBe(1);
  });

  it("blocks short, unmapped and unsourced placeholder narration", () => {
    const report = evaluateLongformNarrationPlan({
      blueprint,
      narrationManifest: { segments: [{ role: "evidence", text: "Claim.", claimIds: ["unknown"] }] },
      narrationState: { durationSeconds: 2 },
    });
    expect(report.status).toBe("blocked");
    expect(report.blockers.map((item) => item.id)).toEqual(expect.arrayContaining([
      "narration_scene_mapping",
      "narration_known_claim_ids",
      "narration_evidence_locators",
      "narration_rendered_duration",
    ]));
  });
});
