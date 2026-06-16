/**
 * diagnostic.test.ts — fetchDiagnosticReport の単体テスト
 */

import { describe, it, expect, vi, afterEach } from "vitest"

const mocks = vi.hoisted(() => ({
  findCompanyById: vi.fn(),
  findCompanyByDomain: vi.fn(),
  findCompanyBySlug: vi.fn(),
}))

vi.mock("./companies", () => ({
  findCompanyById: mocks.findCompanyById,
  findCompanyByDomain: mocks.findCompanyByDomain,
  findCompanyBySlug: mocks.findCompanyBySlug,
}))

import { fetchDiagnosticReport } from "./diagnostic"

afterEach(() => {
  vi.clearAllMocks()
})

describe("fetchDiagnosticReport", () => {
  it("returns null when company is not found by id", async () => {
    mocks.findCompanyById.mockResolvedValue(null)

    const result = await fetchDiagnosticReport({ companyId: "nonexistent-id" })

    expect(result).toBeNull()
  })

  it("returns null when company is not found by domain", async () => {
    mocks.findCompanyByDomain.mockResolvedValue(null)

    const result = await fetchDiagnosticReport({ domain: "unknown.example.com" })

    expect(result).toBeNull()
  })

  it("returns null when company is not found by slug", async () => {
    mocks.findCompanyBySlug.mockResolvedValue(null)

    const result = await fetchDiagnosticReport({ slug: "unknown-slug" })

    expect(result).toBeNull()
  })

  it("returns null when no lookup parameters are provided", async () => {
    const result = await fetchDiagnosticReport({})

    expect(result).toBeNull()
  })
})
