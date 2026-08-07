import { describe, expect, it } from "vitest";
import {
  evaluateProductionScript,
  estimateSpeechSeconds,
  toNarrationManifest,
  validateEvidencePack,
} from "./production-script-core.mjs";

const blueprint = {
  episodeId: "episode-test-en",
  language: "en",
  targetDurationSeconds: 40,
  provenance: { claimIds: ["claim-1", "claim-2", "claim-3", "claim-4", "claim-5", "claim-6"] },
  scenes: [
    { id: "scene-1", beat: "evidence", durationSeconds: 20 },
    { id: "scene-2", beat: "outro", durationSeconds: 20 },
  ],
};

const evidencePack = {
  version: 1,
  episodeId: "episode-test-en",
  claims: Array.from({ length: 6 }, (_, index) => ({
    id: `claim-${index + 1}`,
    status: "confirmed",
    sourceTitle: `Primary record ${index + 1}`,
    sourceUrl: `https://example.gov/record-${index + 1}`,
    locator: `section ${index + 1}`,
    statement: `The primary record confirms a specific documented event number ${index + 1} in the official chronology.`,
  })),
};

const script = {
  version: 1,
  scenes: [
    {
      sceneId: "scene-1",
      editorialIntent: "Establish the documented mechanism before interpreting its consequences.",
      visualSync: "Reveal the source record, then connect its two verified details.",
      pauseAfterSeconds: 0.5,
      segments: [
        { role: "evidence", text: "The official record fixes the first event in a chronology that can be checked line by line today.", claimIds: ["claim-1"], sourceLocator: "section 1" },
        { role: "evidence", text: "A second filing confirms the consequence, narrowing what remains uncertain without pretending the record explains motive.", claimIds: ["claim-2"], sourceLocator: "section 2" },
      ],
    },
    {
      sceneId: "scene-2",
      editorialIntent: "Resolve the investigation by returning to the opening contradiction.",
      visualSync: "Pull back from the ledger into a restrained final evidence matrix.",
      pauseAfterSeconds: 0.8,
      segments: [
        { role: "transition", text: "The record does not need a dramatic invention; its unanswered space is already the final source of tension.", claimIds: [], sourceLocator: "" },
        { role: "cta", text: "Follow the documents before the legend, and the next corporate promise becomes easier to test under pressure.", claimIds: [], sourceLocator: "" },
      ],
    },
  ],
};

describe("professional production script", () => {
  it("validates a primary-source evidence pack", () => {
    expect(validateEvidencePack(evidencePack, blueprint).claims).toHaveLength(6);
  });

  it("passes a paced, sourced and directed script", () => {
    const report = evaluateProductionScript({ script, blueprint, evidencePack });
    expect(report.status).toBe("pass");
    expect(report.score).toBe(100);
    expect(report.metrics.durationCoverage).toBeGreaterThanOrEqual(0.68);
  });

  it("emits a narration manifest with scene and provenance metadata", () => {
    const manifest = toNarrationManifest(script, blueprint, evidencePack, {
      voice: { provider: "kokoro-onnx" }, transcription: {}, quality: {}, gapSeconds: 0.3,
    });
    expect(manifest.segments).toHaveLength(4);
    expect(manifest.segments[0]).toMatchObject({ sceneId: "scene-1", sourceLocator: "section 1" });
    expect(manifest.segments[0].targetDurationSeconds).toBeCloseTo(estimateSpeechSeconds(script.scenes[0].segments[0].text, "en"), 3);
  });

  it("blocks unknown evidence and underwritten scenes", () => {
    const broken = structuredClone(script);
    broken.scenes[0].segments = [{ role: "evidence", text: "A claim with no adequate source support.", claimIds: ["unknown"], sourceLocator: "nowhere" }];
    const report = evaluateProductionScript({ script: broken, blueprint, evidencePack });
    expect(report.status).toBe("blocked");
    expect(report.blockers.map((item) => item.id)).toEqual(expect.arrayContaining([
      "script_scene_pacing", "script_known_claims", "script_evidence_locators",
    ]));
  });
});
