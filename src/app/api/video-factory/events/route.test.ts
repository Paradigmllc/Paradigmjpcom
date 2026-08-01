import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  notifyBothChannels: vi.fn(),
  insertEngineEvent: vi.fn(),
}))

vi.mock("@/lib/notify", () => ({
  notifyBothChannels: mocks.notifyBothChannels,
}))

vi.mock("@/lib/supabase", () => ({
  getServiceSalesSupabase: () => ({
    from: () => ({ insert: mocks.insertEngineEvent }),
  }),
}))

import { POST } from "./route"

const event = {
  event_id: "b4f369fd-dfb4-48ca-9816-6f763912b2d1",
  event_type: "gpu_stopped",
  title: "Video Factory GPUを自動停止",
  message: "稼働中の制作がないためGPU 46258780を停止しました。",
  created_at: "2026-08-01T04:00:00+00:00",
  instance_id: 46258780,
  run_id: "2c9248b4-7758-4002-b6e9-fecb5470686a",
  hourly_price: 0.1317222222,
}

describe("Video Factory operator events", () => {
  beforeEach(() => {
    vi.stubEnv("VIDEO_FACTORY_INTERNAL_API_KEY", "factory-secret")
    mocks.notifyBothChannels.mockReset()
    mocks.insertEngineEvent.mockReset()
    mocks.insertEngineEvent.mockResolvedValue({ error: null })
    mocks.notifyBothChannels.mockResolvedValue({
      ok: true,
      slack: { ok: true },
      database: { ok: true },
    })
  })

  it("rejects requests without the internal API key", async () => {
    const response = await POST(new NextRequest(
      "https://www.paradigmjp.com/api/video-factory/events",
      { method: "POST", body: JSON.stringify(event) },
    ))

    expect(response.status).toBe(401)
    expect(mocks.notifyBothChannels).not.toHaveBeenCalled()
  })

  it("writes the DB bell and Slack notification through the shared notifier", async () => {
    const response = await POST(new NextRequest(
      "https://www.paradigmjp.com/api/video-factory/events",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": "factory-secret",
        },
        body: JSON.stringify(event),
      },
    ))

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ ok: true })
    expect(mocks.notifyBothChannels).toHaveBeenCalledWith(
      expect.stringContaining("GPU 46258780"),
      expect.objectContaining({
        type: "video_factory_gpu_stopped",
        idempotencyKey: event.event_id,
      }),
    )
  })

  it("fails visibly when either notification channel is incomplete", async () => {
    mocks.notifyBothChannels.mockResolvedValue({
      ok: false,
      slack: { ok: true },
      database: { ok: false, error: "DB unavailable" },
    })

    const response = await POST(new NextRequest(
      "https://www.paradigmjp.com/api/video-factory/events",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": "factory-secret",
        },
        body: JSON.stringify(event),
      },
    ))

    expect(response.status).toBe(502)
    expect(await response.json()).toMatchObject({ ok: false })
  })

  it("persists profile progress before notifying both channels", async () => {
    const profileEvent = {
      ...event,
      event_type: "profile_progress",
      profile_id: "ltx-video",
      project_id: "launch-video",
      state: "running",
      progress: 60,
      instance_id: null,
      hourly_price: null,
    }
    const response = await POST(new NextRequest(
      "https://www.paradigmjp.com/api/video-factory/events",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": "factory-secret",
        },
        body: JSON.stringify(profileEvent),
      },
    ))

    expect(response.status).toBe(200)
    expect(mocks.insertEngineEvent).toHaveBeenCalledWith(expect.objectContaining({
      event_type: "profile_progress",
      profile_id: "ltx-video",
      progress: 60,
    }))
    expect(mocks.notifyBothChannels).toHaveBeenCalledWith(
      expect.stringContaining("profile ltx-video"),
      expect.objectContaining({ type: "video_factory_profile_progress" }),
    )
  })
})
