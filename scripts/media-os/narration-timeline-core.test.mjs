import { describe, expect, it } from "vitest";
import { buildSceneAlignedNarrationTimeline, placementMap } from "./narration-timeline-core.mjs";

describe("scene-aligned narration timeline", () => {
  const blueprint = {
    targetDurationSeconds: 20,
    scenes: [
      { id: "scene-1", startSeconds: 0, durationSeconds: 10 },
      { id: "scene-2", startSeconds: 10, durationSeconds: 10 },
    ],
  };

  it("keeps narration inside its authored scenes", () => {
    const timeline = buildSceneAlignedNarrationTimeline([
      { id: "a", sceneId: "scene-1", audioDuration: 3, pauseAfterSeconds: 1 },
      { id: "b", sceneId: "scene-1", audioDuration: 2 },
      { id: "c", sceneId: "scene-2", audioDuration: 4 },
    ], blueprint, 0.25);
    const placements = placementMap(timeline);
    expect(timeline.durationSeconds).toBe(20);
    expect(timeline.speechDurationSeconds).toBe(9);
    expect(placements.get("a").startSeconds).toBeGreaterThanOrEqual(0);
    expect(placements.get("b").endSeconds).toBeLessThanOrEqual(10);
    expect(placements.get("c").startSeconds).toBeGreaterThanOrEqual(10);
    expect(placements.get("c").endSeconds).toBeLessThanOrEqual(20);
  });

  it("rejects narration that cannot fit its scene", () => {
    expect(() => buildSceneAlignedNarrationTimeline([
      { id: "a", sceneId: "scene-1", audioDuration: 9.8, pauseAfterSeconds: 1 },
      { id: "b", sceneId: "scene-1", audioDuration: 1 },
      { id: "c", sceneId: "scene-2", audioDuration: 4 },
    ], blueprint)).toThrow(/exceeds its scene/);
  });
});
