import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({ authorize: vi.fn() }))

vi.mock("@/lib/sales/api-auth", () => ({ isSalesApiAuthorized: mocks.authorize }))

import { GET } from "./route"

beforeEach(() => {
  vi.clearAllMocks()
  mocks.authorize.mockResolvedValue(true)
})

describe("manual work batch realtime events", () => {
  it("requires admin authorization", async () => {
    mocks.authorize.mockResolvedValue(false)
    const response = await GET(
      new NextRequest("https://paradigmjp.com/api/work/batches/11111111-1111-4111-8111-111111111111/events"),
      { params: Promise.resolve({ batchId: "11111111-1111-4111-8111-111111111111" }) },
    )
    expect(response.status).toBe(401)
  })

  it("rejects an invalid batch identity before opening a realtime channel", async () => {
    const response = await GET(
      new NextRequest("https://paradigmjp.com/api/work/batches/not-a-uuid/events"),
      { params: Promise.resolve({ batchId: "not-a-uuid" }) },
    )
    expect(response.status).toBe(400)
  })
})
