import { describe, expect, it } from "vitest";
import { adaptOpenCutProject, OPENCUT_TICKS_PER_SECOND } from "./adapt-opencut-edl.mjs";

function currentProject(overrides = {}) {
  return {
    version: 31,
    currentSceneId: "scene-main",
    metadata: { id: "project-1" },
    scenes: [{
      id: "scene-main",
      isMain: true,
      tracks: {
        main: {
          type: "video",
          elements: [{
            id: "clip-1",
            type: "video",
            mediaId: "master-1",
            startTime: 0,
            duration: 4 * OPENCUT_TICKS_PER_SECOND,
            trimStart: 1 * OPENCUT_TICKS_PER_SECOND,
            trimEnd: 0,
            params: { mediaOs: { role: "hook", claimIds: ["claim-1"], wordIds: ["w-0001"] } },
            ...overrides,
          }],
        },
      },
    }],
  };
}

describe("adaptOpenCutProject", () => {
  it("converts current OpenCut integer ticks to the Media OS EDL", () => {
    const result = adaptOpenCutProject(currentProject(), {
      source: "master.mp4",
      output: "short.mp4",
      profile: "vertical-fit",
    });

    expect(result.sourceAdapter).toMatchObject({ projectVersion: 31, ticksPerSecond: 120_000 });
    expect(result.segments[0]).toMatchObject({ start: 1, duration: 4, timelineStart: 0, role: "hook", claimIds: ["claim-1"] });
  });

  it("supports pre-v23 projects whose time values are seconds", () => {
    const project = currentProject({ duration: 4, trimStart: 1 });
    project.version = 22;
    const result = adaptOpenCutProject(project, { source: "master.mp4", output: "short.mp4" });

    expect(result.sourceAdapter.ticksPerSecond).toBe(1);
    expect(result.segments[0]).toMatchObject({ start: 1, duration: 4 });
  });

  it("fails closed for retimed clips", () => {
    expect(() => adaptOpenCutProject(currentProject({ retime: { rate: 1.25 } }), {
      source: "master.mp4",
      output: "short.mp4",
    })).toThrow(/retimed clips are not supported/);
  });
});
