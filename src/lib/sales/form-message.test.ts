/**
 * form-message.test.ts — generateFormMessage / fillReportUrl の単体テスト
 */

import { describe, it, expect, vi, afterEach } from "vitest"

const mocks = vi.hoisted(() => ({
  findCompanyById: vi.fn(),
  matchTemplate: vi.fn(),
  getAiPrompt: vi.fn(),
  callDeepSeek: vi.fn(),
  getServiceSalesSupabase: vi.fn(),
}))

vi.mock("./companies", () => ({
  findCompanyById: mocks.findCompanyById,
}))

vi.mock("./templates", () => ({
  matchTemplate: mocks.matchTemplate,
}))

vi.mock("./ai-prompts", () => ({
  getAiPrompt: mocks.getAiPrompt,
}))

vi.mock("@/lib/deepseek", () => ({
  callDeepSeek: mocks.callDeepSeek,
}))

vi.mock("@/lib/supabase", () => ({
  getServiceSalesSupabase: mocks.getServiceSalesSupabase,
}))

vi.mock("./dify-cloud", () => ({
  normalizeDifyCloudApiUrl: (u: string) => u,
  normalizeDifyCloudBaseUrl: (u: string) => u,
}))

import { generateFormMessage, fillReportUrl } from "./form-message"

afterEach(() => {
  vi.clearAllMocks()
})

describe("fillReportUrl", () => {
  it("replaces {{report_url}} placeholder with actual URL", () => {
    const message = "レポートはこちら: {{report_url}} にアクセスしてください"
    const result = fillReportUrl(message, "https://paradigmjp.com/ja/report/example")
    expect(result).toBe("レポートはこちら: https://paradigmjp.com/ja/report/example にアクセスしてください")
    expect(result).not.toContain("{{report_url}}")
  })

  it("replaces all occurrences of {{report_url}}", () => {
    const message = "URL: {{report_url}} 予備: {{report_url}}"
    const result = fillReportUrl(message, "https://example.com/report")
    expect(result).toBe("URL: https://example.com/report 予備: https://example.com/report")
  })
})

describe("generateFormMessage", () => {
  it("returns error for invalid companyId (company not found)", async () => {
    mocks.findCompanyById.mockResolvedValue(null)

    const result = await generateFormMessage("nonexistent-id")

    expect(result.ok).toBe(false)
    expect(result.error).toBe("company not found")
    expect(mocks.findCompanyById).toHaveBeenCalledWith("nonexistent-id")
  })
})
