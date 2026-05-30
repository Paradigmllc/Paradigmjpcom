import { describe, expect, it } from "vitest"
import { getVideoPipelineConfig, VIDEO_PIPELINE_STAGES } from "./video-pipeline"

describe("video pipeline config", () => {
  it("keeps n8n as the orchestrator and exposes human gates", () => {
    const config = getVideoPipelineConfig()
    expect(config.stages).toHaveLength(VIDEO_PIPELINE_STAGES.length)
    expect(config.stages.map((stage) => stage.id)).toContain("review")
    expect(config.n8n.note).toContain("n8n")
    expect(config.vast.note).toContain("GPU")
  })

  it("keeps lightweight sales-video renderers separate from subscription GPU work", () => {
    const stageIds = VIDEO_PIPELINE_STAGES.map((stage) => stage.id)
    expect(stageIds).toEqual(["brief", "storyboard", "asset_prompts", "gpu_route", "render", "review", "delivery"])
  })
})
