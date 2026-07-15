import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  list: vi.fn(),
  from: vi.fn(),
  selectExisting: vi.fn(),
  eqPack: vi.fn(),
  eqVersion: vi.fn(),
  maybeSingle: vi.fn(),
  insert: vi.fn(),
  selectInserted: vi.fn(),
  single: vi.fn(),
  audit: vi.fn(),
  notify: vi.fn(),
}))

vi.mock("@/lib/sales/api-auth", () => ({ isSalesApiAuthorized: mocks.authorize }))
vi.mock("@/lib/sales/lead-source-records", () => ({ listLeadSourceConfigs: mocks.list }))
vi.mock("@/lib/sales/lead-operator-audit", () => ({ recordLeadOperatorEvent: mocks.audit }))
vi.mock("@/lib/notify", () => ({ notifyBothChannels: mocks.notify }))
vi.mock("@/lib/supabase", () => ({ getServiceSalesSupabase: () => ({ from: mocks.from }) }))

import { GET, POST } from "./route"

function request(body?: Record<string, unknown>): NextRequest {
  return new NextRequest("https://paradigmjp.com/api/sales/lead-source-packs", body ? {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  } : undefined)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.authorize.mockResolvedValue(true)
  mocks.list.mockResolvedValue([])
  mocks.audit.mockResolvedValue(undefined)
  mocks.notify.mockResolvedValue({ ok: true })
  mocks.selectExisting.mockReturnValue({ eq: mocks.eqPack })
  mocks.eqPack.mockReturnValue({ eq: mocks.eqVersion })
  mocks.eqVersion.mockReturnValue({ maybeSingle: mocks.maybeSingle })
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null })
  mocks.insert.mockReturnValue({ select: mocks.selectInserted })
  mocks.selectInserted.mockReturnValue({ single: mocks.single })
  mocks.single.mockResolvedValue({ data: { id: "11111111-1111-4111-8111-111111111111", approval_status: "draft" }, error: null })
  mocks.from.mockReturnValue({ select: mocks.selectExisting, insert: mocks.insert })
})

describe("lead source pack routes", () => {
  it("lists priority country packs without starting collection", async () => {
    const response = await GET(request())
    const payload = await response.json() as { ok?: boolean; packs?: Array<{ countryCode: string; registeredSource: unknown }> }

    expect(response.status).toBe(200)
    expect(payload.packs?.map((pack) => pack.countryCode)).toEqual(expect.arrayContaining(["US", "GB", "AU", "SG", "AE"]))
    expect(payload.packs?.every((pack) => pack.registeredSource === null)).toBe(true)
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it("registers a known pack as an inactive draft with version and license evidence", async () => {
    const response = await POST(request({ packId: "wikidata-cc0-commerce-software-us", operatorName: "Sato" }))

    expect(response.status).toBe(201)
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      country_code: "US",
      source_pack_id: "wikidata-cc0-commerce-software-us",
      source_pack_version: 1,
      source_license_name: "Creative Commons CC0",
      terms_checked: false,
      active: false,
      approval_status: "draft",
    }))
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({
      action: "source_pack_registered",
      detail: expect.objectContaining({ collectionStarted: false }),
    }))
    expect(mocks.notify).toHaveBeenCalledWith("sales", expect.objectContaining({ type: "lead_source_pack_registered" }))
  })

  it("is idempotent and rejects unknown or unauthorized packs", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: { id: "existing" }, error: null })
    const existing = await POST(request({ packId: "wikidata-cc0-commerce-software-gb", operatorName: "Sato" }))
    const unknown = await POST(request({ packId: "unknown-pack", operatorName: "Sato" }))
    mocks.authorize.mockResolvedValue(false)
    const unauthorized = await POST(request({ packId: "wikidata-cc0-commerce-software-us", operatorName: "Sato" }))

    expect(existing.status).toBe(200)
    expect(unknown.status).toBe(404)
    expect(unauthorized.status).toBe(401)
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it("bulk-registers unregistered packs with one notification and no collection", async () => {
    const response = await POST(request({
      packIds: ["cordis-horizon-2020-official-sme-de", "wikidata-cc0-commerce-software-au"],
      operatorName: "Sato",
    }))
    const payload = await response.json() as { createdCount?: number }

    expect(response.status).toBe(201)
    expect(payload.createdCount).toBe(2)
    expect(mocks.insert).toHaveBeenCalledTimes(2)
    expect(mocks.audit).toHaveBeenCalledTimes(2)
    expect(mocks.notify).toHaveBeenCalledTimes(1)
    expect(mocks.insert).toHaveBeenNthCalledWith(1, expect.objectContaining({
      source_format: "zip_csv",
      terms_checked: false,
      active: false,
      approval_status: "draft",
    }))
  })
})
