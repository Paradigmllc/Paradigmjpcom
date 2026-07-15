import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  after: vi.fn((callback: () => Promise<void>) => { void callback() }),
  activate: vi.fn(),
  authorize: vi.fn(),
  claim: vi.fn(),
  dispatch: vi.fn(),
  getSupabase: vi.fn(),
  queue: vi.fn(),
  release: vi.fn(),
  syncDemo: vi.fn(),
}))

vi.mock("next/server", async (importOriginal) => ({
  ...await importOriginal<typeof import("next/server")>(),
  after: mocks.after,
}))
vi.mock("@/lib/sales/api-auth", () => ({ isSalesApiAuthorized: mocks.authorize }))
vi.mock("@/lib/supabase", () => ({ getServiceSalesSupabase: mocks.getSupabase }))
vi.mock("@/lib/sales/demo-batch-queue", () => ({ queueReviewedDemoItem: mocks.queue }))
vi.mock("@/lib/sales/demo-batch-drain", () => ({
  claimDemoBatchDrain: mocks.claim,
  dispatchDemoBatchDrain: mocks.dispatch,
  releaseDemoBatchDrain: mocks.release,
}))
vi.mock("@/lib/sales/demo-private-access", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/sales/demo-private-access")>(),
  activateTemporaryUnlistedDemo: mocks.activate,
}))
vi.mock("@/lib/sales/routing", () => ({ demoSiteUrl: () => "https://demo.paradigmjp.com" }))
vi.mock("@/lib/sales/demo-twenty-sync", () => ({ syncDemoCandidateToTwenty: mocks.syncDemo }))

import { GET, PATCH, POST, PUT } from "./route"

const companyId = "11111111-1111-4111-8111-111111111111"
const jobId = "22222222-2222-4222-8222-222222222222"

function validManifest() {
  return {
    version: "2026-07-13.1",
    mode: "reviewed_manifest",
    collectionPolicy: "no_automated_fetch",
    assetStrategy: "reviewed_real_assets",
    sources: [{
      id: "official",
      type: "official_profile_link",
      url: "https://www.instagram.com/example/",
      ownerLabel: "Example",
      verifiedAt: "2026-07-13T00:00:00.000Z",
      fetchPolicy: "never",
    }],
    facts: [
      { key: "business_name", value: "Example", sourceId: "official", verified: true },
      { key: "service", value: "Baked goods", sourceId: "official", verified: true },
      { key: "hours", value: "Official account", sourceId: "official", verified: true },
    ],
    assets: [1, 2, 3].map((index) => ({
      id: `asset-${index}`,
      kind: "image",
      sourceUrl: `https://assets.example.com/${index}.webp`,
      ownerLabel: "Example",
      sourceAccount: "https://www.instagram.com/example/",
      useBasis: "generated",
      officialSource: true,
      peopleVisible: false,
      watermarkVisible: false,
      alt: `Product ${index}`,
    })),
  }
}

function fluentQuery(result: Record<string, unknown>) {
  const query = {
    eq: vi.fn(),
    in: vi.fn(),
    limit: vi.fn(),
    order: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  }
  query.eq.mockReturnValue(query)
  query.order.mockReturnValue(query)
  query.select.mockReturnValue(query)
  query.update.mockReturnValue(query)
  query.in.mockResolvedValue(result)
  query.limit.mockResolvedValue(result)
  return query
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.authorize.mockResolvedValue(true)
  mocks.claim.mockResolvedValue({ ok: true, claimed: true })
  mocks.dispatch.mockResolvedValue({ ok: true, status: 200 })
  mocks.queue.mockImplementation(async (item: { companyName?: string }) => ({
    ok: true,
    companyId,
    companyName: item.companyName,
    jobId,
    status: "queued",
  }))
  mocks.activate.mockResolvedValue({ urlSlug: "example-demo", expiresAt: "2026-07-21T00:00:00.000Z", review: { status: "private_proposal", assets: [] } })
  mocks.syncDemo.mockResolvedValue({ ok: true, configured: true, companyId: "twenty-company-1", homeSynced: true })
  vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("demo batch route without PostgREST relationship metadata", () => {
  it("accepts a 300-company wave and assigns one durable wave id to every queued job", async () => {
    const items = Array.from({ length: 300 }, (_, index) => ({
      companyName: `Example ${index + 1}`,
      industry: "construction",
      locale: "ja",
      manifest: validManifest(),
    }))
    const response = await POST(new NextRequest("https://paradigmjp.com/api/sales/demo-site/batch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items }),
    }))
    const body = await response.json()

    expect(response.status).toBe(202)
    expect(body).toMatchObject({ ok: true, requested: 300, queued: 300, sendingEnabled: false })
    expect(body.waveId).toMatch(/^[0-9a-f-]{36}$/u)
    expect(mocks.queue).toHaveBeenCalledTimes(300)
    expect(mocks.queue).toHaveBeenNthCalledWith(1, expect.objectContaining({ waveId: body.waveId }), "demo_batch_console")
    await vi.waitFor(() => expect(mocks.dispatch).toHaveBeenCalledTimes(1))
  })

  it("rejects a wave above 300 companies before writing jobs", async () => {
    const items = Array.from({ length: 301 }, (_, index) => ({
      companyName: `Example ${index + 1}`,
      industry: "construction",
      locale: "ja",
      manifest: validManifest(),
    }))
    const response = await POST(new NextRequest("https://paradigmjp.com/api/sales/demo-site/batch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items }),
    }))

    expect(response.status).toBe(400)
    expect(mocks.queue).not.toHaveBeenCalled()
  })

  it("requeues only failed demo jobs from the selected wave", async () => {
    const retryQuery = {
      update: vi.fn(),
      eq: vi.fn(),
      select: vi.fn(),
    }
    retryQuery.update.mockReturnValue(retryQuery)
    retryQuery.eq.mockReturnValue(retryQuery)
    retryQuery.select.mockResolvedValue({ data: [{ id: jobId }], error: null })
    mocks.getSupabase.mockReturnValue({ from: vi.fn().mockReturnValue(retryQuery) })
    const waveId = "33333333-3333-4333-8333-333333333333"

    const response = await PATCH(new NextRequest("https://paradigmjp.com/api/sales/demo-site/batch", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "retry_failed", waveId, limit: 3 }),
    }))
    const body = await response.json()

    expect(response.status).toBe(202)
    expect(retryQuery.eq).toHaveBeenCalledWith("input_payload->>wave_id", waveId)
    expect(retryQuery.eq).toHaveBeenCalledWith("status", "failed")
    expect(body).toMatchObject({ ok: true, recovered: 1, waveId, sendingEnabled: false })
    await vi.waitFor(() => expect(mocks.dispatch).toHaveBeenCalledTimes(1))
  })

  it("loads jobs and companies in two batched queries", async () => {
    const jobs = fluentQuery({
      data: [{ id: jobId, company_id: companyId, status: "completed", attempts: 1, max_attempts: 3 }],
      error: null,
    })
    const companies = fluentQuery({ data: [{ id: companyId, company_name: "Example" }], error: null })
    const sb = { from: vi.fn().mockReturnValueOnce(jobs).mockReturnValueOnce(companies) }
    mocks.getSupabase.mockReturnValue(sb)

    const response = await GET(new NextRequest("https://paradigmjp.com/api/sales/demo-site/batch"))
    expect(response.status).toBe(200)
    expect(jobs.select).toHaveBeenCalledWith(expect.not.stringContaining("sales_companies"))
    expect(companies.in).toHaveBeenCalledWith("id", [companyId])
    expect(await response.json()).toMatchObject({
      ok: true,
      jobs: [{ id: jobId, sales_companies: { company_name: "Example" } }],
    })
  })

  it("issues a seven-day clean unlisted URL after loading company metadata separately", async () => {
    const jobs = fluentQuery({
      data: [{ id: jobId, company_id: companyId, status: "completed", input_payload: { locale: "ja" }, result_payload: { slug: "example-demo", quality_report: { passed: true, score: 96 } } }],
      error: null,
    })
    const companies = fluentQuery({ data: [{ id: companyId, meta: { demo_source_manifest: validManifest() } }], error: null })
    const update = fluentQuery({ data: null, error: null })
    const sb = { from: vi.fn().mockReturnValueOnce(jobs).mockReturnValueOnce(companies).mockReturnValueOnce(update) }
    mocks.getSupabase.mockReturnValue(sb)

    const response = await PUT(new NextRequest("https://paradigmjp.com/api/sales/demo-site/batch", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobIds: [jobId], ttlDays: 7 }),
    }))
    const body = await response.json()

    expect(response.status, JSON.stringify(body)).toBe(200)
    expect(jobs.select).toHaveBeenCalledWith(expect.not.stringContaining("sales_companies"))
    expect(companies.in).toHaveBeenCalledWith("id", [companyId])
    expect(mocks.activate).toHaveBeenCalledWith(expect.objectContaining({ slug: "example-demo", ttlDays: 7 }))
    expect(body).toMatchObject({
      ok: true,
      issued: [{
        ok: true,
        slug: "example-demo",
        previewUrl: "https://demo.paradigmjp.com/example-demo",
        expiresAt: "2026-07-21T00:00:00.000Z",
      }],
    })
    expect(mocks.syncDemo).not.toHaveBeenCalled()
  })

  it("syncs issued high-quality demo candidates to Twenty when requested", async () => {
    const jobs = fluentQuery({
      data: [{
        id: jobId,
        company_id: companyId,
        status: "completed",
        input_payload: { locale: "ja" },
        result_payload: { slug: "example-demo", source_policy: "reviewed_manifest", quality_report: { passed: true, score: 96 } },
      }],
      error: null,
    })
    const companies = fluentQuery({ data: [{ id: companyId, meta: { demo_source_manifest: validManifest() } }], error: null })
    const update = fluentQuery({ data: null, error: null })
    const sb = { from: vi.fn().mockReturnValueOnce(jobs).mockReturnValueOnce(companies).mockReturnValueOnce(update) }
    mocks.getSupabase.mockReturnValue(sb)

    const response = await PUT(new NextRequest("https://paradigmjp.com/api/sales/demo-site/batch", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobIds: [jobId], ttlDays: 7, syncTwenty: true }),
    }))
    const body = await response.json()

    expect(response.status, JSON.stringify(body)).toBe(200)
    expect(mocks.syncDemo).toHaveBeenCalledWith({
      companyId,
      jobId,
      previewUrl: "https://demo.paradigmjp.com/example-demo",
      expiresAt: "2026-07-21T00:00:00.000Z",
      slug: "example-demo",
      qualityScore: 96,
      sourcePolicy: "reviewed_manifest",
    })
    expect(body).toMatchObject({
      ok: true,
      twentySync: {
        requested: 1,
        synced: 1,
        failed: 0,
        results: [{ ok: true, twentyCompanyId: "twenty-company-1" }],
      },
      issued: [{ twenty: { ok: true, twentyCompanyId: "twenty-company-1" } }],
    })
  })
})
