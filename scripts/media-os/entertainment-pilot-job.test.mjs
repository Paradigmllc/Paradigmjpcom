import { describe, expect, it } from "vitest";
import { assertEntertainmentPilotRenderReady } from "./entertainment-pilot-job.mjs";

function databaseReturning(value) {
  return { prepare: () => ({ get: () => value }) };
}

describe("entertainment pilot master gate", () => {
  it("blocks presentation-style master production before the audience-facing pilot is ready", () => {
    expect(() => assertEntertainmentPilotRenderReady(databaseReturning(null), "episode-test"))
      .toThrow("Professional master is blocked");
    expect(() => assertEntertainmentPilotRenderReady(databaseReturning({ status: "pass", score: 100, render_ready: 0 }), "episode-test"))
      .toThrow("Professional master is blocked");
  });

  it("allows the master only after creative direction and render readiness pass", () => {
    expect(() => assertEntertainmentPilotRenderReady(databaseReturning({ status: "pass", score: 100, render_ready: 1 }), "episode-test"))
      .not.toThrow();
  });
});
