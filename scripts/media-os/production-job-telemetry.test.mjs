import { describe, expect, it } from "vitest";
import { estimateRenderScratchGiB, parseHyperframesProgressLine, renderOverallProgress } from "./production-job-telemetry.mjs";

describe("production job telemetry", () => {
  it("parses deterministic HyperFrames capture progress and ETA", () => {
    const result = parseHyperframesProgressLine("Capturing frame 12600/25200 (2 workers)", 1_000, 101_000);
    expect(result).toMatchObject({
      phase: "picture_render",
      completedUnits: 12600,
      totalUnits: 25200,
      elapsedSeconds: 100,
      estimatedRemainingSeconds: 100,
    });
  });

  it("recognizes encoding phases", () => {
    expect(parseHyperframesProgressLine("Encoding video", 0, 1)?.phase).toBe("video_encoding");
    expect(parseHyperframesProgressLine("Assembling final video", 0, 1)?.phase).toBe("video_assembly");
  });

  it("keeps encoding after completed frame capture in the final picture range", () => {
    expect(renderOverallProgress({ phase: "picture_render", completedUnits: 27_000, totalUnits: 27_000 })).toBe(64);
    expect(renderOverallProgress({ phase: "video_encoding" })).toBe(64);
    expect(renderOverallProgress({ phase: "picture_complete" })).toBe(65);
  });

  it("uses a conservative scratch estimate", () => {
    expect(estimateRenderScratchGiB(25_200)).toBeGreaterThan(5);
    expect(estimateRenderScratchGiB(0)).toBeNull();
  });
});
