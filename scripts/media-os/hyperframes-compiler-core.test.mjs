import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { compileHyperframesProject, loadChannelDesignSystems } from "./hyperframes-compiler-core.mjs";

const designs = loadChannelDesignSystems(resolve("config/channel-design-systems.json"));
const blueprint = JSON.parse(readFileSync(resolve("renders/editorial/episode-enron-en/blueprint.json"), "utf8"));
const qualityReport = JSON.parse(readFileSync(resolve("renders/editorial/episode-enron-en/quality-report.json"), "utf8"));

describe("HyperFrames blueprint compiler", () => {
  it("defines twelve unique and high-contrast channel design systems", () => {
    expect(designs.channels).toHaveLength(12);
    expect(new Set(designs.channels.map((design) => design.layoutSignature)).size).toBe(12);
    expect(new Set(designs.channels.map((design) => `${design.background}:${design.accent}`)).size).toBe(12);
  });

  it("compiles deterministic full-length files from an approved blueprint", () => {
    const first = compileHyperframesProject({ blueprint, qualityReport, designSystems: designs });
    const second = compileHyperframesProject({ blueprint, qualityReport, designSystems: designs });
    expect(first.files).toEqual(second.files);
    expect(first.manifest.durationSeconds).toBe(840);
    expect(first.manifest.sceneCount).toBe(14);
    expect(first.files["index.html"]).toContain(`data-compiler-version="${first.manifest.compilerVersion}"`);
    expect(first.files[".hyperframes/expanded-prompt.md"]).toContain("## Scene 14");
  });

  it("creates a 60-second review composition without changing scene order", () => {
    const compiled = compileHyperframesProject({ blueprint, qualityReport, designSystems: designs, previewSeconds: 60 });
    expect(compiled.manifest.durationSeconds).toBe(60);
    expect(compiled.scenes).toHaveLength(14);
    expect(compiled.scenes.at(-1).startSeconds + compiled.scenes.at(-1).durationSeconds).toBeCloseTo(60, 3);
    expect(compiled.scenes.map((scene) => scene.beat)).toEqual(blueprint.scenes.map((scene) => scene.beat));
  });

  it("keeps every scene positive in the minimum 30-second preview", () => {
    const compiled = compileHyperframesProject({ blueprint, qualityReport, designSystems: designs, previewSeconds: 30 });
    expect(compiled.scenes.every((scene) => scene.durationSeconds > 0)).toBe(true);
    expect(compiled.scenes.at(-1).startSeconds + compiled.scenes.at(-1).durationSeconds).toBeCloseTo(30, 3);
    const clipDurations = [...compiled.files["index.html"].matchAll(/data-duration="([\d.]+)"/g)].slice(1).map((match) => Number(match[1]));
    expect(clipDurations).toHaveLength(14);
    expect(clipDurations.every((duration) => duration > 0)).toBe(true);
  });

  it("emits deterministic GSAP with transitions and no common capture hazards", () => {
    const compiled = compileHyperframesProject({ blueprint, qualityReport, designSystems: designs, previewSeconds: 60 });
    const html = compiled.files["index.html"];
    const compositions = Object.entries(compiled.files).filter(([path]) => path.startsWith("compositions/") && path.endsWith(".html"));
    expect(html).toContain('window.__timelines["main"] = tl');
    expect(html.match(/<div id="scene-/g)).toHaveLength(14);
    expect(html.match(/data-composition-src=/g)).toHaveLength(14);
    expect(compositions).toHaveLength(14);
    expect(compositions.every(([, content]) => content.startsWith("<template"))).toBe(true);
    expect(compositions.every(([path, content]) => content.includes(`window.__timelines["${path.slice(13, -5)}"] = tl`))).toBe(true);
    const archetypes = new Set(compositions.map(([, content]) => content.match(/data-scene-archetype="([^"]+)"/)?.[1]));
    const motionSignatures = new Set(compositions.map(([, content]) => content.match(/data-motion-signature="([^"]+)"/)?.[1]));
    expect(archetypes.size).toBeGreaterThanOrEqual(8);
    expect(motionSignatures.size).toBeGreaterThanOrEqual(10);
    expect(html.match(/data-transition-family=/g)).toHaveLength(13);
    expect(new Set([...html.matchAll(/data-transition-family="([^"]+)"/g)].map((match) => match[1]))).toEqual(new Set(["editorial-cover", "shutter", "blackout"]));
    expect(compiled.renderQuality.status).toBe("blocked");
    expect(compiled.renderQuality.blockers.map((blocker) => blocker.id)).toContain("narration_track_embedded");
    for (const content of [html, ...compositions.map(([, value]) => value)]) {
      expect(content).not.toContain("Math.random");
      expect(content).not.toContain("Date.now");
      expect(content).not.toContain("repeat: -1");
      expect(content).not.toContain("<br>");
    }
  });

  it("labels generated visuals as non-evidentiary abstract reconstructions", () => {
    const compiled = compileHyperframesProject({
      blueprint,
      qualityReport,
      designSystems: designs,
      previewSeconds: 60,
      media: {
        visualAssets: [{ sceneOrdinal: 1, relativePath: "assets/generated/scene-one.png" }],
      },
    });
    const scene = compiled.files["compositions/scene-01.html"];
    expect(scene).toContain("SYNTHETIC ABSTRACT RECONSTRUCTION");
    expect(scene).toContain('alt="Abstract AI-generated reconstruction for scene 01"');
    expect(compiled.manifest.media.generatedVisualCount).toBe(1);
  });

  it("refuses to compile a blocked quality report", () => {
    expect(() => compileHyperframesProject({
      blueprint,
      qualityReport: { ...qualityReport, status: "blocked", blockers: [{ id: "duplicate" }] },
      designSystems: designs,
    })).toThrow("Only a passing editorial quality report");
  });
});
