import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  create: vi.fn(),
  createRetry: vi.fn(),
  active: vi.fn(),
  position: vi.fn(),
  queueSummary: vi.fn(),
  promote: vi.fn(),
  findWork: vi.fn(),
  normalize: vi.fn(),
  notify: vi.fn(),
  schedule: vi.fn(),
}))

vi.mock("@/lib/sales/api-auth", () => ({ isSalesApiAuthorized: mocks.authorize }))
vi.mock("@/lib/sales/manual-japan-entry-batch-store", () => ({
  createManualWorkBatch: mocks.create,
  createManualWorkRetryBatch: mocks.createRetry,
  getLatestActiveManualWorkBatch: mocks.active,
  getManualWorkBatchQueuePosition: mocks.position,
  getManualWorkBatchQueueSummary: mocks.queueSummary,
  promoteNextManualWorkBatch: mocks.promote,
}))
vi.mock("@/lib/sales/manual-japan-entry-store", () => ({ findManualWorkById: mocks.findWork }))
vi.mock("@/lib/sales/manual-japan-entry-service", () => ({ normalizeManualWorkUrl: mocks.normalize }))
vi.mock("@/lib/notify", () => ({ notifyBothChannels: mocks.notify }))
vi.mock("@/lib/sales/manual-japan-entry-batch-schedule", () => ({ scheduleManualWorkBatchDrain: mocks.schedule }))

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

function unsentWork(overrides: Record<string, unknown> = {}) {
  return {
    id: "106db008-80af-4c56-93ee-916643d84c1b",
    is_japanese_company: false,
    country_code: "US",
    manually_sent_at: null,
    reply_received_at: null,
    founder_forwarded_at: null,
    meeting_converted_at: null,
    evidence: { analysis_mode: "legacy_full" },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.OPENROUTER_API_KEY
  delete process.env.OPENAI_API_KEY
  mocks.authorize.mockResolvedValue(true)
  mocks.active.mockResolvedValue(null)
  mocks.findWork.mockResolvedValue(unsentWork())
  mocks.normalize.mockImplementation((value: string) => {
    const domain = value.replace(/^https?:\/\//, "").replace(/\/$/, "")
    return { inputUrl: value, canonicalUrl: `https://${domain}/`, domain }
  })
  mocks.create.mockImplementation(async (input: { urls: unknown[] }) => snapshot(input.urls.length))
  mocks.createRetry.mockResolvedValue(snapshot(1))
  mocks.position.mockResolvedValue(0)
  mocks.queueSummary.mockResolvedValue({ batchCount: 1, companyCount: 1, runningBatchId: "11111111-1111-4111-8111-111111111111", queuedBatchCount: 0, queuedCompanyCount: 0 })
  mocks.promote.mockImplementation(async () => ({ snapshot: snapshot(1), promoted: true }))
  mocks.notify.mockResolvedValue({ ok: true })
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
    mocks.promote.mockResolvedValue({ snapshot: snapshot(499), promoted: true })
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

  it("queues a second batch behind the active runner", async () => {
    mocks.active.mockResolvedValue(snapshot(12))
    mocks.position.mockResolvedValue(1)
    mocks.promote.mockResolvedValue({ snapshot: snapshot(12), promoted: false })
    mocks.queueSummary.mockResolvedValue({ batchCount: 2, companyCount: 13, runningBatchId: "11111111-1111-4111-8111-111111111111", queuedBatchCount: 1, queuedCompanyCount: 1 })
    const response = await POST(new NextRequest("https://paradigmjp.com/api/work/batches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ urls: ["example.com"] }),
    }))
    const body = await response.json()
    expect(response.status).toBe(201)
    expect(body.queuePosition).toBe(1)
    expect(body.automaticDrainStarted).toBe(false)
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.schedule).not.toHaveBeenCalled()
  })

  it.each([
    "fast_qualification",
    "chatgpt_brief_failed",
    "gpt56_editorial_failed",
    "legacy_full",
    undefined,
  ])("queues an unsent %s row for API-free ChatGPT brief preparation", async (analysisMode) => {
    const workId = "106db008-80af-4c56-93ee-916643d84c1b"
    mocks.findWork.mockResolvedValue(unsentWork({ evidence: analysisMode ? { analysis_mode: analysisMode } : {} }))
    const response = await POST(new NextRequest("https://paradigmjp.com/api/work/batches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ urls: ["example.com"], retryWorkId: workId }),
    }))

    expect(response.status).toBe(201)
    expect(mocks.createRetry).toHaveBeenCalledWith(expect.objectContaining({ workId }))
    expect(mocks.notify).toHaveBeenCalledWith("sales", expect.objectContaining({
      message: expect.stringContaining("外部AI API"),
    }))
  })

  it("does not require an OpenAI, OpenRouter, or DeepSeek key for brief preparation", async () => {
    const workId = "106db008-80af-4c56-93ee-916643d84c1b"
    const response = await POST(new NextRequest("https://paradigmjp.com/api/work/batches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ urls: ["example.com"], retryWorkId: workId }),
    }))

    expect(response.status).toBe(201)
    expect(mocks.createRetry).toHaveBeenCalledWith(expect.objectContaining({ workId }))
  })

  it("does not overwrite a company after an outreach outcome is recorded", async () => {
    const workId = "106db008-80af-4c56-93ee-916643d84c1b"
    mocks.findWork.mockResolvedValue(unsentWork({ manually_sent_at: "2026-07-29T00:00:00.000Z" }))
    const response = await POST(new NextRequest("https://paradigmjp.com/api/work/batches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ urls: ["example.com"], retryWorkId: workId }),
    }))

    expect(response.status).toBe(409)
    expect(mocks.createRetry).not.toHaveBeenCalled()
  })

  it("rejects Japanese rows before brief preparation", async () => {
    const workId = "106db008-80af-4c56-93ee-916643d84c1b"
    mocks.findWork.mockResolvedValue(unsentWork({ country_code: "JP", is_japanese_company: true }))
    const response = await POST(new NextRequest("https://paradigmjp.com/api/work/batches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ urls: ["example.com"], retryWorkId: workId }),
    }))

    expect(response.status).toBe(400)
    expect(mocks.createRetry).not.toHaveBeenCalled()
  })

  it("rejects a retry request that contains more than one URL", async () => {
    const response = await POST(new NextRequest("https://paradigmjp.com/api/work/batches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        urls: ["example.com", "other.example"],
        retryWorkId: "106db008-80af-4c56-93ee-916643d84c1b",
      }),
    }))
    expect(response.status).toBe(400)
    expect(mocks.createRetry).not.toHaveBeenCalled()
  })

  it("continues fast qualification without any writing-model key", async () => {
    const response = await POST(new NextRequest("https://paradigmjp.com/api/work/batches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ urls: ["example.com"] }),
    }))

    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.schedule).toHaveBeenCalled()
  })

  it("returns an operator-safe conflict when the 20-batch queue is full", async () => {
    mocks.create.mockRejectedValue(new Error("manual work queue is full (20 batches / 10000 companies maximum)"))
    const response = await POST(new NextRequest("https://paradigmjp.com/api/work/batches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ urls: ["example.com"] }),
    }))
    const body = await response.json()
    expect(response.status).toBe(409)
    expect(body.error).toBe("永続キューは最大20バッチです。処理完了後に追加してください。")
    expect(mocks.promote).not.toHaveBeenCalled()
  })
})
