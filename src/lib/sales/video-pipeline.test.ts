import { describe, expect, it } from "vitest"
import { getVideoPipelineConfig, VIDEO_PIPELINE_STAGES } from "./video-pipeline"

describe("video pipeline config", () => {
  it("keeps Trigger.dev as the orchestrator and exposes human gates", () => {
    const config = getVideoPipelineConfig()
    expect(config.stages).toHaveLength(VIDEO_PIPELINE_STAGES.length)
    expect(config.stages.map((stage) => stage.id)).toContain("review")
    expect(config.orchestrator.provider).toBe("trigger.dev")
    expect(config.orchestrator.note).toContain("Trigger.dev")
    expect(config.vast.note).toContain("GPU")
    expect(config.dify.provider).toBe("dify_cloud")
    expect(config.dify.baseUrl).toBe("https://api.dify.ai")
    expect(config.dify.note).toContain("未検証")
  })

  it("keeps lightweight sales-video renderers separate from subscription GPU work", () => {
    const stageIds = VIDEO_PIPELINE_STAGES.map((stage) => stage.id)
    expect(stageIds).toEqual(["brief", "storyboard", "asset_prompts", "gpu_route", "render", "review", "delivery"])
  })

  it("keeps the storyboard stage guarded against unverified assertions", () => {
    const storyboard = VIDEO_PIPELINE_STAGES.find((stage) => stage.id === "storyboard")
    expect(storyboard?.gate).toContain("未検証")
  })
})
