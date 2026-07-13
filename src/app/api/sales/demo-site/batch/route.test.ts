import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  activate: vi.fn(),
  authorize: vi.fn(),
  getSupabase: vi.fn(),
}))

vi.mock("@/lib/sales/api-auth", () => ({ isSalesApiAuthorized: mocks.authorize }))
vi.mock("@/lib/supabase", () => ({ getServiceSalesSupabase: mocks.getSupabase }))
vi.mock("@/lib/sales/demo-private-access", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/sales/demo-private-access")>(),
  activatePublicUnlistedDemo: mocks.activate,
}))
vi.mock("@/lib/sales/routing", () => ({ buildDemoUrl: (_locale: string, slug: string) => `https://demo.paradigmjp.com/${slug}` }))

import { GET, PUT } from "./route"

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
  mocks.activate.mockResolvedValue({ urlSlug: "example", review: { status: "consented", assets: [] } })
  vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("demo batch route without PostgREST relationship metadata", () => {
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

  it("issues a clean noindex URL after loading company metadata separately", async () => {
    const jobs = fluentQuery({
      data: [{ id: jobId, company_id: companyId, status: "completed", input_payload: { locale: "ja" }, result_payload: { slug: "example-demo" } }],
      error: null,
    })
    const companies = fluentQuery({ data: [{ id: companyId, meta: { demo_source_manifest: validManifest() } }], error: null })
    const update = fluentQuery({ data: null, error: null })
    const sb = { from: vi.fn().mockReturnValueOnce(jobs).mockReturnValueOnce(companies).mockReturnValueOnce(update) }
    mocks.getSupabase.mockReturnValue(sb)

    const response = await PUT(new NextRequest("https://paradigmjp.com/api/sales/demo-site/batch", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobIds: [jobId], ttlDays: 14 }),
    }))
    const body = await response.json()

    expect(response.status, JSON.stringify(body)).toBe(200)
    expect(jobs.select).toHaveBeenCalledWith(expect.not.stringContaining("sales_companies"))
    expect(companies.in).toHaveBeenCalledWith("id", [companyId])
    expect(mocks.activate).toHaveBeenCalledWith(expect.objectContaining({ slug: "example-demo" }))
    expect(body).toMatchObject({ ok: true, issued: [{ ok: true, slug: "example-demo", cleanUrl: "https://demo.paradigmjp.com/example-demo" }] })
  })
})
