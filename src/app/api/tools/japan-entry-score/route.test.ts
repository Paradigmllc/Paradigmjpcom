import { describe, expect, it, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(() => ({ ok: true, remaining: 2, resetAt: Date.now() + 60_000 })),
  getClientIp: vi.fn(() => "203.0.113.10"),
  verifyTurnstile: vi.fn(async () => true),
  runJapanEntryScore: vi.fn(),
}))

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  getClientIp: mocks.getClientIp,
  verifyTurnstile: mocks.verifyTurnstile,
}))

vi.mock("@/lib/sales/japan-entry-score-service", () => ({
  runJapanEntryScore: mocks.runJapanEntryScore,
}))

import { POST } from "./route"

const result = {
  version: "japan-entry-score-v1",
  domain: "example.com",
  targetCountry: "US",
  score: 64,
  coverage: 85,
  band: "foundation",
  factors: [],
  unknowns: ["Actual revenue is not publicly observable"],
  recommendedActions: ["Validate the remaining unknowns."],
  countrySignals: [],
  marketVisibility: { actualMonthlyVisits: null, actualRevenue: null, evidence: [] },
  actualMonthlyVisits: null,
  actualRevenue: null,
  observedAt: "2026-07-12T00:00:00.000Z",
} as never

beforeEach(() => {
  vi.clearAllMocks()
  mocks.checkRateLimit.mockReturnValue({ ok: true, remaining: 2, resetAt: Date.now() + 60_000 })
  mocks.verifyTurnstile.mockResolvedValue(true)
})

describe("POST /api/tools/japan-entry-score", () => {
  it("validates the request and returns the score result", async () => {
    mocks.runJapanEntryScore.mockResolvedValue({ ok: true, result, persisted: true })
    const request = new NextRequest("http://localhost/api/tools/japan-entry-score", {
      method: "POST",
      body: JSON.stringify({ domain: "https://example.com", targetCountry: "GB", selfReported: { decisionReady: "yes" } }),
      headers: { "content-type": "application/json" },
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ ok: true, persisted: true })
    expect(mocks.runJapanEntryScore).toHaveBeenCalledWith(expect.objectContaining({ domain: "https://example.com", targetCountry: "GB" }))
  })

  it("rejects a honeypot submission before scoring", async () => {
    const request = new NextRequest("http://localhost/api/tools/japan-entry-score", {
      method: "POST",
      body: JSON.stringify({ domain: "https://example.com", honeypot: "filled" }),
      headers: { "content-type": "application/json" },
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    expect(mocks.runJapanEntryScore).not.toHaveBeenCalled()
  })

  it("returns rate-limit responses without running expensive sources", async () => {
    mocks.checkRateLimit.mockReturnValue({ ok: false, remaining: 0, resetAt: Date.now() + 60_000 })
    const request = new NextRequest("http://localhost/api/tools/japan-entry-score", {
      method: "POST",
      body: JSON.stringify({ domain: "https://example.com" }),
      headers: { "content-type": "application/json" },
    })

    const response = await POST(request)
    expect(response.status).toBe(429)
    expect(mocks.runJapanEntryScore).not.toHaveBeenCalled()
  })
})
