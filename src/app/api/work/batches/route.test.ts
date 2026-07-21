import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  create: vi.fn(),
  active: vi.fn(),
  normalize: vi.fn(),
  notify: vi.fn(),
  schedule: vi.fn(),
  preflight: vi.fn(),
}))

vi.mock("@/lib/sales/api-auth", () => ({ isSalesApiAuthorized: mocks.authorize }))
vi.mock("@/lib/sales/manual-japan-entry-batch-store", () => ({
  createManualWorkBatch: mocks.create,
  getLatestActiveManualWorkBatch: mocks.active,
}))
vi.mock("@/lib/sales/manual-japan-entry-service", () => ({ normalizeManualWorkUrl: mocks.normalize }))
vi.mock("@/lib/notify", () => ({ notifyBothChannels: mocks.notify }))
vi.mock("@/lib/sales/manual-japan-entry-batch-schedule", () => ({ scheduleManualWorkBatchDrain: mocks.schedule }))
vi.mock("@/lib/sales/manual-japan-entry-batch-preflight", () => ({ preflightManualWorkBatch: mocks.preflight }))

import { GET, POST } from "./route"

function snapshot(totalCount: number) {
  return {
    batch: { id: "11111111-1111-4111-8111-111111111111", status: "queued", total_count: totalCount },
    items: [],
    counts: { queued: totalCount, processing: 0, completed: 0, needs_review: 0, rejected: 0, failed: 0, duplicate: 0 },
    finished: 0,
    remaining: totalCount,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.authorize.mockResolvedValue(true)
  mocks.active.mockResolvedValue(null)
  mocks.normalize.mockImplementation((value: string) => {
    const domain = value.replace(/^https?:\/\//, "").replace(/\/$/, "")
    return { inputUrl: value, canonicalUrl: `https://${domain}/`, domain }
  })
  mocks.create.mockImplementation(async (input: { urls: unknown[] }) => snapshot(input.urls.length))
  mocks.notify.mockResolvedValue({ ok: true })
  mocks.preflight.mockResolvedValue({ ok: true, usedModel: "deepseek-chat" })
})

describe("manual work durable batch API", () => {
  it("requires admin authorization", async () => {
    mocks.authorize.mockResolvedValue(false)
    const response = await GET(new NextRequest("https://paradigmjp.com/api/work/batches"))
    expect(response.status).toBe(401)
    expect(mocks.active).not.toHaveBeenCalled()
  })

  it("accepts up to 500 URLs and deduplicates by normalized domain", async () => {
    const urls = Array.from({ length: 500 }, (_, index) => `company-${index}.example`)
    urls[499] = "company-0.example"
    const response = await POST(new NextRequest("https://paradigmjp.com/api/work/batches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ urls }),
    }))
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.snapshot.batch.total_count).toBe(499)
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      urls: expect.arrayContaining([expect.objectContaining({ domain: "company-0.example" })]),
      sourceSlug: "manual_input",
    }))
    expect(body.automaticDrainStarted).toBe(true)
    expect(mocks.schedule).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111")
  })

  it("rejects a 501-item submission before any DB write", async () => {
    const urls = Array.from({ length: 501 }, (_, index) => `company-${index}.example`)
    const response = await POST(new NextRequest("https://paradigmjp.com/api/work/batches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ urls }),
    }))
    expect(response.status).toBe(400)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it("does not create a second active batch", async () => {
    mocks.active.mockResolvedValue(snapshot(12))
    const response = await POST(new NextRequest("https://paradigmjp.com/api/work/batches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ urls: ["example.com"] }),
    }))
    expect(response.status).toBe(409)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it("does not enqueue hundreds of doomed jobs when DeepSeek is unavailable", async () => {
    mocks.preflight.mockResolvedValue({ ok: false, error: "DeepSeek APIの残高不足です" })
    const response = await POST(new NextRequest("https://paradigmjp.com/api/work/batches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ urls: ["example.com"] }),
    }))
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.error).toContain("バッチは開始していません")
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.schedule).not.toHaveBeenCalled()
  })
})
