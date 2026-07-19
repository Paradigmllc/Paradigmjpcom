import { describe, expect, it, vi } from "vitest"
import { generateScreenshotToCode, isScreenshotToCodeConfigured } from "./screenshot-to-code-client"

describe("screenshot-to-code client", () => {
  it("requires both gateway settings", () => {
    const originalUrl = process.env.SCREENSHOT_TO_CODE_URL
    const originalSecret = process.env.SCREENSHOT_TO_CODE_SHARED_SECRET
    delete process.env.SCREENSHOT_TO_CODE_URL
    delete process.env.SCREENSHOT_TO_CODE_SHARED_SECRET
    expect(isScreenshotToCodeConfigured()).toBe(false)
    if (originalUrl) process.env.SCREENSHOT_TO_CODE_URL = originalUrl
    if (originalSecret) process.env.SCREENSHOT_TO_CODE_SHARED_SECRET = originalSecret
  })

  it("maps a successful gateway response", async () => {
    const originalUrl = process.env.SCREENSHOT_TO_CODE_URL
    const originalSecret = process.env.SCREENSHOT_TO_CODE_SHARED_SECRET
    process.env.SCREENSHOT_TO_CODE_URL = "http://screenshot-to-code:7002/"
    process.env.SCREENSHOT_TO_CODE_SHARED_SECRET = "test-secret"
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        ok: true,
        code: "<html></html>",
        upstream_commit: "commit",
        provider: "provider",
        model: "model",
      }), { status: 200, headers: { "content-type": "application/json" } }),
    )
    await expect(generateScreenshotToCode({ imageDataUrls: ["data:image/png;base64,AA=="], requireVision: true })).resolves.toMatchObject({
      code: "<html></html>",
      upstreamCommit: "commit",
    })
    expect(fetchMock).toHaveBeenCalledWith(
      "http://screenshot-to-code:7002/generate",
      expect.objectContaining({
        headers: expect.objectContaining({ "x-screenshot-to-code-secret": "test-secret" }),
        body: expect.stringContaining('"require_vision":true'),
      }),
    )
    fetchMock.mockRestore()
    if (originalUrl) process.env.SCREENSHOT_TO_CODE_URL = originalUrl
    else delete process.env.SCREENSHOT_TO_CODE_URL
    if (originalSecret) process.env.SCREENSHOT_TO_CODE_SHARED_SECRET = originalSecret
    else delete process.env.SCREENSHOT_TO_CODE_SHARED_SECRET
  })
})
