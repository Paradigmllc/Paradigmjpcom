import { afterEach, describe, expect, it, vi } from "vitest"
import {
  DIFY_CLOUD_BASE_URL,
  getDifyCloudRuntimeConfig,
  normalizeDifyCloudApiUrl,
  normalizeDifyCloudBaseUrl,
} from "./dify-cloud"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("Dify Cloud runtime", () => {
  it("keeps the official cloud endpoint even if an old self-host URL remains in env", () => {
    expect(normalizeDifyCloudBaseUrl("https://dify.appexx.me")).toBe(DIFY_CLOUD_BASE_URL)
    expect(normalizeDifyCloudApiUrl("https://dify.appexx.me/v1/workflows/run")).toBe(`${DIFY_CLOUD_BASE_URL}/v1/workflows/run`)
  })

  it("marks video workflows ready when a workflow-specific cloud key exists", () => {
    vi.stubEnv("DIFY_VIDEO_WORKFLOW_API_KEY", "secret-value")
    vi.stubEnv("DIFY_BASE_URL", "https://api.dify.ai")

    const config = getDifyCloudRuntimeConfig(["video", "templatePicker"])

    expect(config.ready).toBe(true)
    expect(config.configuredGroups).toEqual(["video"])
    expect(config.missingGroups).toEqual(["templatePicker"])
    expect(config.baseUrl).toBe(DIFY_CLOUD_BASE_URL)
    expect(JSON.stringify(config)).not.toContain("secret-value")
  })
})
