import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  list: vi.fn(),
  notify: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
  audit: vi.fn(),
}))

vi.mock("@/lib/sales/api-auth", () => ({ isSalesApiAuthorized: mocks.authorize }))
vi.mock("@/lib/sales/lead-source-records", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/sales/lead-source-records")>()
  return { ...actual, listLeadSourceConfigs: mocks.list }
})
vi.mock("@/lib/notify", () => ({ notifyBothChannels: mocks.notify }))
vi.mock("@/lib/supabase", () => ({ getServiceSalesSupabase: () => ({ from: mocks.from }) }))
vi.mock("@/lib/sales/lead-operator-audit", () => ({ recordLeadOperatorEvent: mocks.audit }))

import { GET, POST } from "./route"

beforeEach(() => {
  vi.clearAllMocks()
  mocks.authorize.mockResolvedValue(true)
  mocks.list.mockResolvedValue([])
  mocks.notify.mockResolvedValue({ ok: true })
  mocks.audit.mockResolvedValue(undefined)
  mocks.single.mockResolvedValue({ data: { id: "source-1", name: "Official Exporters" }, error: null })
  mocks.select.mockReturnValue({ single: mocks.single })
  mocks.insert.mockReturnValue({ select: mocks.select })
  mocks.from.mockReturnValue({ insert: mocks.insert })
})

describe("lead source routes", () => {
  it("rejects unauthorized reads", async () => {
    mocks.authorize.mockResolvedValue(false)
    const response = await GET(new NextRequest("https://paradigmjp.com/api/sales/lead-sources"))

    expect(response.status).toBe(401)
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it("rejects non-string or oversized field mappings before a DB write", async () => {
    const response = await POST(new NextRequest("https://paradigmjp.com/api/sales/lead-sources", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Official Exporters",
        countryCode: "US",
        sourceType: "export_directory",
        sourceUrl: "https://directory.example/exporters.json",
        sourceFormat: "json",
        trustTier: 3,
        termsChecked: true,
        fieldMapping: { website_url: { nested: true } },
        operatorName: "Sato",
      }),
    }))

    expect(response.status).toBe(400)
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it("creates an authenticated HTTPS source without triggering ingestion", async () => {
    const response = await POST(new NextRequest("https://paradigmjp.com/api/sales/lead-sources", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Official Exporters",
        countryCode: "us",
        sourceType: "export_directory",
        sourceUrl: "https://directory.example/exporters.csv",
        sourceFormat: "csv",
        trustTier: 3,
        termsChecked: false,
        fieldMapping: { company_name: "name", website_url: "website" },
        operatorName: "Sato",
      }),
    }))

    expect(response.status).toBe(201)
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      country_code: "US",
      source_url: "https://directory.example/exporters.csv",
      terms_checked: false,
      active: false,
      approval_status: "draft",
    }))
    expect(mocks.notify).toHaveBeenCalledWith("sales", expect.objectContaining({ type: "lead_source_created" }))
  })
})
