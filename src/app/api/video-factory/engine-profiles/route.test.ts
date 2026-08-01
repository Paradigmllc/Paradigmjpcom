import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  notifyBothChannels: vi.fn(),
  from: vi.fn(),
  upsert: vi.fn(),
  insert: vi.fn(),
}))

vi.mock("@/lib/notify", () => ({
  notifyBothChannels: mocks.notifyBothChannels,
}))

vi.mock("@/lib/supabase", () => ({
  getServiceSalesSupabase: () => ({ from: mocks.from }),
}))

import { POST } from "./route"

const profile = {
  id: "hyperframes",
  display_name: "HyperFrames",
  category: "composition",
  summary: "Deterministic motion graphics and master composition runtime.",
  capabilities: ["motion_graphics"],
  shot_kinds: ["text_motion"],
  runtime: "builtin",
  adapter: "hyperframes",
  source_url: "https://github.com/heygen-com/hyperframes",
  revision: "343c02518889f46ee3962256b19ac4189264907d",
  code_license: "Apache-2.0",
  model_license: "NOT_APPLICABLE",
  commercial_policy: "allowed",
  approval: "approved",
  install_mode: "bundled",
  gpu_required: false,
  min_vram_gb: 0,
  recommended_vram_gb: 0,
  workflow_ids: [],
  model_ids: [],
  command_env: null,
  reviewed_by: "Paradigm Engineering",
  reviewed_at: "2026-08-01T08:00:00+09:00",
  block_reason: null,
  notes: null,
  ready: true,
  state: "ready",
  reasons: [],
}

const payload = {
  event_id: "b4f369fd-dfb4-48ca-9816-6f763912b2d1",
  version: 1,
  updated_at: "2026-08-01T08:00:00+09:00",
  total: 1,
  ready: 1,
  blocked: 0,
  profiles: [profile],
}

describe("Video Factory engine catalog sync", () => {
  beforeEach(() => {
    vi.stubEnv("VIDEO_FACTORY_INTERNAL_API_KEY", "factory-secret")
    mocks.notifyBothChannels.mockReset()
    mocks.from.mockReset()
    mocks.upsert.mockReset()
    mocks.insert.mockReset()
    mocks.upsert.mockResolvedValue({ error: null })
    mocks.insert.mockResolvedValue({ error: null })
    mocks.from.mockImplementation((table: string) => (
      table === "video_factory_engine_profiles"
        ? { upsert: mocks.upsert }
        : { insert: mocks.insert }
    ))
    mocks.notifyBothChannels.mockResolvedValue({
      ok: true,
      slack: { ok: true },
      database: { ok: true },
    })
  })

  it("rejects unauthenticated catalog writes", async () => {
    const response = await POST(new NextRequest(
      "https://www.paradigmjp.com/api/video-factory/engine-profiles",
      { method: "POST", body: JSON.stringify(payload) },
    ))

    expect(response.status).toBe(401)
    expect(mocks.upsert).not.toHaveBeenCalled()
  })

  it("persists the catalog and event before notifying DB bell and Slack", async () => {
    const response = await POST(new NextRequest(
      "https://www.paradigmjp.com/api/video-factory/engine-profiles",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": "factory-secret" },
        body: JSON.stringify(payload),
      },
    ))

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ ok: true, synced: 1 })
    expect(mocks.upsert).toHaveBeenCalledWith(
      [expect.objectContaining({ id: "hyperframes", catalog_version: 1 })],
      { onConflict: "id" },
    )
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      id: payload.event_id,
      event_type: "catalog_synced",
      progress: 100,
    }))
    expect(mocks.notifyBothChannels).toHaveBeenCalledWith(
      expect.stringContaining("1件を同期"),
      expect.objectContaining({
        type: "video_factory_catalog_synced",
        idempotencyKey: payload.event_id,
      }),
    )
  })

  it("rejects inconsistent readiness counts", async () => {
    const response = await POST(new NextRequest(
      "https://www.paradigmjp.com/api/video-factory/engine-profiles",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": "factory-secret" },
        body: JSON.stringify({ ...payload, ready: 0, blocked: 0 }),
      },
    ))

    expect(response.status).toBe(422)
    expect(mocks.upsert).not.toHaveBeenCalled()
  })
})
