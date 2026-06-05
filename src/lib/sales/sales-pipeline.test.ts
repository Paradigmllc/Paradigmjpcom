import { describe, expect, it } from "vitest"
import { buildSalesPipelinePlan, summarizeSalesPipelineStatus } from "./sales-pipeline"

describe("Sales OS unified pipeline", () => {
  it("keeps every tool in one ordered Sales OS plan", () => {
    const plan = buildSalesPipelinePlan({ requireVideo: true, autoSyncExternalStudios: true })
    expect(plan.map((step) => step.key)).toEqual([
      "twenty_csv_intake",
      "supabase_normalize",
      "karte_generate",
      "report_generate",
      "video_generate",
      "r2_manifest",
      "external_studio_sync",
      "twenty_writeback",
      "outreach_preflight",
      "outreach_send",
      "reply_capture",
      "follow_up_queue",
    ])
    expect(plan.find((step) => step.key === "video_generate")?.required).toBe(true)
    expect(plan.find((step) => step.key === "external_studio_sync")?.required).toBe(true)
  })

  it("skips optional video and external studio steps by policy, not by removing them", () => {
    const plan = buildSalesPipelinePlan({ requireVideo: false, autoSyncExternalStudios: false })
    expect(plan.find((step) => step.key === "video_generate")?.required).toBe(false)
    expect(plan.find((step) => step.key === "external_studio_sync")?.required).toBe(false)
    expect(plan.find((step) => step.key === "twenty_writeback")?.required).toBe(true)
    expect(plan.find((step) => step.key === "outreach_send")?.required).toBe(true)
    expect(plan.find((step) => step.key === "reply_capture")?.required).toBe(false)
  })

  it("summarizes run status with blocking failures before external waits", () => {
    expect(summarizeSalesPipelineStatus([
      { status: "completed", required: true },
      { status: "waiting_external", required: true },
    ])).toBe("waiting_external")
    expect(summarizeSalesPipelineStatus([
      { status: "completed", required: true },
      { status: "failed", required: true },
      { status: "waiting_external", required: true },
    ])).toBe("failed")
    expect(summarizeSalesPipelineStatus([
      { status: "completed", required: true },
      { status: "skipped", required: false },
    ])).toBe("completed")
  })
})
