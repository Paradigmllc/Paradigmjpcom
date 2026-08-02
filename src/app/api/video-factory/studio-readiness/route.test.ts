import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  notifyBothChannels: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
}))

vi.mock("@/lib/notify", () => ({
  notifyBothChannels: mocks.notifyBothChannels,
}))

vi.mock("@/lib/supabase", () => ({
  getServiceSalesSupabase: () => ({ from: mocks.from }),
}))

import { POST } from "./route"

const kinds = [
  "text_motion", "ui_capture", "chart", "generative", "supplied_edit",
  "three_d", "technical_diagram", "portrait_animation", "lip_sync", "transition",
] as const

const capabilities = kinds.map((shotKind, index) => {
  const state = index < 5 ? "ready" : index < 8 ? "conditional" : "blocked"
  return {
    shot_kind: shotKind,
    state,
    production_allowed: state !== "blocked",
    primary_engine: "hyperframes",
    selected_engine: state === "blocked" ? null : "hyperframes",
    fallback_used: state === "conditional",
    dedicated_template: index < 7,
    template_ids: index < 7 ? ["product-spotlight"] : [],
    ready_profile_ids: index < 5 ? ["hyperframes"] : [],
    summary: "Audited runtime evidence for this capability.",
  }
})

const payload = {
  event_id: "b4f369fd-dfb4-48ca-9816-6f763912b2d1",
  schema_version: 1,
  generated_at: "2026-08-02T12:30:00+00:00",
  environment: "production",
  status: "conditional",
  score: 73,
  template_count: 5,
  ready_capabilities: 5,
  conditional_capabilities: 3,
  blocked_capabilities: 2,
  capabilities,
  checks: [{
    id: "technical-qa",
    label: "Automated technical QA",
    passed: true,
    evidence: "Resolution, duration and audio checks are enforced.",
  }],
  capacity: {
    queue_backend: "local",
    local_workers: 1,
    safe_parallel_jobs: 1,
    gpu_jobs_serialized: true,
    max_deliverables_per_brief: 20,
    max_languages_per_brief: 12,
  },
  output_matrix: {
    aspect_ratios: ["16:9", "9:16", "1:1", "4:5"],
    formats: ["mp4", "mov", "webm"],
  },
  automated_stages: ["brief_validation", "technical_qa"],
  human_gates: ["draft_creative_review", "final_delivery_approval"],
  gaps: ["Safe processing capacity is one job at a time."],
}

describe("Video Factory Studio readiness sync", () => {
  beforeEach(() => {
    vi.stubEnv("VIDEO_FACTORY_INTERNAL_API_KEY", "factory-secret")
    mocks.notifyBothChannels.mockReset()
    mocks.from.mockReset()
    mocks.insert.mockReset()
    mocks.from.mockReturnValue({ insert: mocks.insert })
    mocks.insert.mockResolvedValue({ error: null })
    mocks.notifyBothChannels.mockResolvedValue({
      ok: true,
      slack: { ok: true },
      database: { ok: true },
    })
  })

  it("rejects unauthenticated readiness writes", async () => {
    const response = await POST(new NextRequest(
      "https://www.paradigmjp.com/api/video-factory/studio-readiness",
      { method: "POST", body: JSON.stringify(payload) },
    ))

    expect(response.status).toBe(401)
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it("persists append-only evidence before notifying DB bell and Slack", async () => {
    const response = await POST(new NextRequest(
      "https://www.paradigmjp.com/api/video-factory/studio-readiness",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": "factory-secret" },
        body: JSON.stringify(payload),
      },
    ))

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      ok: true,
      snapshot_id: payload.event_id,
    })
    expect(mocks.from).toHaveBeenCalledWith("video_factory_studio_readiness_snapshots")
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      id: payload.event_id,
      status: "conditional",
      score: 73,
      safe_parallel_jobs: 1,
    }))
    expect(mocks.notifyBothChannels).toHaveBeenCalledWith(
      expect.stringContaining("73/100"),
      expect.objectContaining({
        type: "video_factory_studio_readiness_synced",
        idempotencyKey: payload.event_id,
      }),
    )
  })

  it("rejects inconsistent capability counts", async () => {
    const response = await POST(new NextRequest(
      "https://www.paradigmjp.com/api/video-factory/studio-readiness",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": "factory-secret" },
        body: JSON.stringify({ ...payload, blocked_capabilities: 1 }),
      },
    ))

    expect(response.status).toBe(422)
    expect(mocks.insert).not.toHaveBeenCalled()
  })
})
