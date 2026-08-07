import { describe, expect, it } from "vitest";
import { evaluateProfessionalRender } from "./professional-render-quality-core.mjs";

function scene(archetype, motion, status = "confirmed") {
  return `<template><div data-scene-archetype="${archetype}" data-visualization-mode="source-document" data-motion-signature="${motion}" data-claim-status="${status}"><svg data-visual-element="source-document"></svg>${Array.from({ length: 7 }, () => '<i data-visual-element="detail"></i>').join("")}<p data-source-locator>source</p></div></template>`;
}

function fixture({ withMedia = true } = {}) {
  const archetypes = ["hook", "document", "timeline", "network", "ladder", "split", "radar", "matrix"];
  const files = Object.fromEntries(archetypes.map((archetype, index) => [`compositions/scene-${String(index + 1).padStart(2, "0")}.html`, scene(archetype, `${archetype}-${index}`)]));
  files["index.html"] = `${archetypes.slice(1).map((_, index) => `<i data-transition-family="${index % 4 === 0 ? "shutter" : "editorial-cover"}"></i>`).join("")}${withMedia ? '<audio data-role="narration"></audio><div data-caption-group="c1"></div>' : ""}`;
  return {
    files,
    manifest: { episodeId: "episode-test", mode: "review_preview", durationSeconds: 60, sceneCount: 8 },
    media: withMedia ? { narrationDurationSeconds: 59 } : null,
  };
}

describe("professional render quality gate", () => {
  it("passes varied, sourced, captioned audiovisual output", () => {
    const report = evaluateProfessionalRender(fixture());
    expect(report.status).toBe("pass");
    expect(report.score).toBe(100);
    expect(report.metrics.archetypeCount).toBe(8);
  });

  it("blocks silent output even when visual structure is valid", () => {
    const report = evaluateProfessionalRender(fixture({ withMedia: false }));
    expect(report.status).toBe("blocked");
    expect(report.blockers.map((blocker) => blocker.id)).toEqual(expect.arrayContaining([
      "narration_track_embedded",
      "narration_duration_coverage",
      "caption_groups_embedded",
    ]));
  });

  it("blocks repeated templates measured from emitted HTML", () => {
    const input = fixture();
    for (const path of Object.keys(input.files).filter((path) => path.startsWith("compositions/"))) {
      input.files[path] = scene("same-template", "same-motion");
    }
    const report = evaluateProfessionalRender(input);
    expect(report.status).toBe("blocked");
    expect(report.blockers.map((blocker) => blocker.id)).toEqual(expect.arrayContaining([
      "actual_archetype_diversity",
      "template_repetition_cap",
      "motion_signature_diversity",
    ]));
  });

  it("requires scene-complete narration and rights-tracked sound for a full master", () => {
    const input = fixture();
    input.manifest.mode = "full_master";
    input.media.narrationQuality = {
      status: "blocked",
      metrics: { sceneCoverage: 0.25 },
      checks: [{ id: "narration_scene_mapping", pass: false, detail: "2/8 scenes", blocking: true }],
    };
    input.media.soundQuality = {
      status: "blocked",
      metrics: { trackCount: 0 },
      checks: [{ id: "sound_bed_coverage", pass: false, detail: "0%", blocking: true }],
    };
    const report = evaluateProfessionalRender(input);
    expect(report.status).toBe("blocked");
    expect(report.blockers.map((blocker) => blocker.id)).toEqual(expect.arrayContaining([
      "narration_scene_mapping",
      "sound_bed_coverage",
    ]));
  });

  it("accepts editorial breathing room in a long-form master", () => {
    const input = fixture();
    input.manifest.mode = "full_master";
    input.manifest.durationSeconds = 75;
    input.media.narrationDurationSeconds = 59;
    input.media.narrationQuality = { status: "pass", metrics: { sceneCoverage: 1 }, checks: [] };
    input.media.soundQuality = { status: "pass", metrics: { trackCount: 8 }, checks: [] };
    expect(evaluateProfessionalRender(input).blockers.map((blocker) => blocker.id))
      .not.toContain("narration_duration_coverage");
  });
});
