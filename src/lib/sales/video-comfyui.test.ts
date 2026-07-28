import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("./companies", () => ({
  findCompanyByDomain: vi.fn(),
  findCompanyById: vi.fn(),
  findCompanyBySlug: vi.fn(),
}))

vi.mock("./diagnostic", () => ({
  fetchDiagnosticReport: vi.fn(),
}))

vi.mock("./comfyui-client", () => ({
  generateComfyuiPrompt: vi.fn(),
  getComfyuiClientConfig: vi.fn(),
  runComfyuiGeneration: vi.fn(),
}))

vi.mock("./comfyui-workflows", () => ({
  estimateWorkflowDuration: vi.fn(() => 30),
  getComfyuiWorkflowTemplate: vi.fn(() => ({ workflowJson: "{}" })),
  injectComfyuiWorkflowPrompt: vi.fn(() => ({})),
}))

vi.mock("./video-generator", () => ({
  generateDiagnosticVideo: vi.fn(),
}))

import { findCompanyBySlug } from "./companies"
import { fetchDiagnosticReport } from "./diagnostic"
import { generateComfyuiPrompt, getComfyuiClientConfig, runComfyuiGeneration } from "./comfyui-client"
import { generateDiagnosticVideo } from "./video-generator"
import { generateProfessionalVideo } from "./video-comfyui"

const company = {
  id: "00000000-0000-4000-8000-000000000001",
  company_name: "Example Studio",
  slug: "example-studio",
  domain: "example.jp",
  region: "jp",
  report_locale: "ja",
  meta: { description: "地域に根ざしたサービス" },
}

const report = {
  company_name: "Example Studio",
  report_locale: "ja",
  industry: "restaurant",
  hook: "地域の顧客に選ばれる体験",
  acts: [{ body: "サービスの魅力を伝えます" }],
}

describe("generateProfessionalVideo", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(findCompanyBySlug).mockResolvedValue(company as never)
    vi.mocked(fetchDiagnosticReport).mockResolvedValue(report as never)
    vi.mocked(getComfyuiClientConfig).mockReturnValue({
      ready: true,
      baseUrl: "http://comfyui.local",
      apiKey: "test-key",
      missing: [],
      note: "ready",
    })
    vi.mocked(generateComfyuiPrompt).mockResolvedValue({
      ok: true,
      prompt: "cinematic local studio",
      negativePrompt: "text artifacts",
    })
    vi.mocked(runComfyuiGeneration).mockResolvedValue({
      ok: true,
      outputs: [{ filename: "asset.png", url: "https://cdn.example/asset.png", type: "image" }],
      promptId: "prompt-1",
      durationMs: 100,
    })
    vi.mocked(generateDiagnosticVideo).mockResolvedValue({ ok: true, video_url: "https://cdn.example/video.mp4" })
  })

  it("fans out visual lanes and keeps HyperFrames as the deterministic final lane", async () => {
    const result = await generateProfessionalVideo({ companyIdOrSlugOrDomain: "example-studio" })

    expect(result.ok).toBe(true)
    expect(result.comfyui.background?.ok).toBe(true)
    expect(result.comfyui.broll?.ok).toBe(true)
    expect(result.comfyui.thumbnail?.ok).toBe(true)
    expect(result.comfyui.avatar).toBeUndefined()
    expect(result.diagnostic?.video_url).toBe("https://cdn.example/video.mp4")
    expect(generateComfyuiPrompt).toHaveBeenCalledTimes(3)
    expect(generateDiagnosticVideo).toHaveBeenCalledWith(company.id, "ja")
  })

  it("preserves the HyperFrames result when every ComfyUI lane fails", async () => {
    vi.mocked(runComfyuiGeneration).mockRejectedValue(new Error("GPU queue unavailable"))

    const result = await generateProfessionalVideo({ companyIdOrSlugOrDomain: "example-studio" })

    expect(result.ok).toBe(true)
    expect(result.diagnostic?.ok).toBe(true)
    expect(result.comfyui.background?.error).toBe("GPU queue unavailable")
    expect(result.comfyui.broll?.error).toBe("GPU queue unavailable")
    expect(result.error).toContain("GPU queue unavailable")
  })
})
