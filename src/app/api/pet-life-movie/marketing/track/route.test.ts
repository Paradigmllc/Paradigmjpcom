import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn(), getClientIp: vi.fn(() => "203.0.113.1") }))
vi.mock("@/lib/pet-life-movie/marketing/attribution", () => ({ recordPetMarketingAttribution: vi.fn() }))

import { checkRateLimit } from "@/lib/rate-limit"
import { recordPetMarketingAttribution } from "@/lib/pet-life-movie/marketing/attribution"
import { POST } from "./route"

const event = {
  eventName: "page_view",
  anonymousId: "d05014b7-b44a-44dd-bf85-b7cabb2533fe",
  locale: "en",
  path: "/en/pet-life-movie",
  utmSource: "instagram",
}

describe("Pet marketing attribution API", () => {
  beforeEach(() => vi.clearAllMocks())

  it("rate limits before storing an event", async () => {
    vi.mocked(checkRateLimit).mockReturnValue({ ok: false, remaining: 0, resetAt: Date.now() + 10_000 })
    const response = await POST(new NextRequest("https://paradigmjp.com/api/pet-life-movie/marketing/track", { method: "POST", body: JSON.stringify(event) }))
    expect(response.status).toBe(429)
    expect(recordPetMarketingAttribution).not.toHaveBeenCalled()
  })

  it("stores a validated event and returns no content", async () => {
    vi.mocked(checkRateLimit).mockReturnValue({ ok: true, remaining: 89, resetAt: Date.now() + 60_000 })
    const response = await POST(new NextRequest("https://paradigmjp.com/api/pet-life-movie/marketing/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(event) }))
    expect(response.status).toBe(204)
    expect(recordPetMarketingAttribution).toHaveBeenCalledWith(event)
  })
})
