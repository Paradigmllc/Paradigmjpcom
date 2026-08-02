import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/admin-auth", () => ({ authorizeWebhookRequest: vi.fn() }))
vi.mock("@/lib/notify", () => ({ notifyBothChannels: vi.fn() }))
vi.mock("@/lib/pet-life-movie/marketing/pipeline", () => ({
  globalRunDate: vi.fn(() => "2026-08-03"),
  runGlobalPetMarketingPipeline: vi.fn(),
}))

import { authorizeWebhookRequest } from "@/lib/admin-auth"
import { notifyBothChannels } from "@/lib/notify"
import { runGlobalPetMarketingPipeline } from "@/lib/pet-life-movie/marketing/pipeline"
import { POST } from "./route"

describe("Pet marketing daily API", () => {
  beforeEach(() => vi.clearAllMocks())

  it("rejects requests before running the pipeline", async () => {
    vi.mocked(authorizeWebhookRequest).mockReturnValue({ ok: false, source: "none", userEmail: null })
    const response = await POST(new NextRequest("https://paradigmjp.com/api/pet-life-movie/marketing/daily?slot=apac", { method: "POST" }))
    expect(response.status).toBe(401)
    expect(runGlobalPetMarketingPipeline).not.toHaveBeenCalled()
  })

  it("runs an authorized regional window and reports the outcome", async () => {
    vi.mocked(authorizeWebhookRequest).mockReturnValue({ ok: true, source: "webhook", userEmail: null })
    vi.mocked(runGlobalPetMarketingPipeline).mockResolvedValue({
      id: "run-id", campaignId: "campaign-id", runKey: "key", runDate: "2026-08-03", slot: "europe",
      status: "succeeded", generatedPostCount: 3, publishedPostCount: 2, failedPostCount: 0,
      blockedPostCount: 0, blockedReason: null, startedAt: "2026-08-03T09:15:00.000Z", completedAt: "2026-08-03T09:15:02.000Z",
    })
    vi.mocked(notifyBothChannels).mockResolvedValue({ ok: true, db: { ok: true }, slack: { ok: true } })
    const response = await POST(new NextRequest("https://paradigmjp.com/api/pet-life-movie/marketing/daily?slot=europe&date=2026-08-03", { method: "POST" }))
    expect(response.status).toBe(200)
    expect(runGlobalPetMarketingPipeline).toHaveBeenCalledWith("europe", "2026-08-03")
  })
})
