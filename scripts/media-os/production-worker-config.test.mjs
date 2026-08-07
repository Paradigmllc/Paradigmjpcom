import { describe, expect, it } from "vitest";
import { configuredWorkerRenderers, rendererSqlList } from "./production-worker-config.mjs";

describe("production worker renderer configuration", () => {
  it("deduplicates a valid allowlist", () => {
    expect(configuredWorkerRenderers("editorial_blueprint,professional_master,professional_master")).toEqual([
      "editorial_blueprint",
      "professional_master",
    ]);
  });

  it("rejects unsupported renderers", () => {
    expect(() => configuredWorkerRenderers("hyperframes,arbitrary_shell"))
      .toThrow("Unsupported MEDIA_OS_WORKER_RENDERERS: arbitrary_shell");
  });

  it("enables entertainment pilots in the default worker set", () => {
    expect(configuredWorkerRenderers()).toContain("entertainment_pilot");
  });

  it("builds parameterized SQL input", () => {
    expect(rendererSqlList(["editorial_blueprint", "professional_master"])).toEqual({
      placeholders: "?,?",
      parameters: ["editorial_blueprint", "professional_master"],
    });
  });
});
