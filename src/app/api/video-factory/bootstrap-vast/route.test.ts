import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/video-factory-vast-bootstrap", () => ({
  bootstrapIsComplete: vi.fn(() => false),
  decryptVastKey: vi.fn(),
  fingerprintSecret: vi.fn(),
  publicKeyPem: vi.fn(),
  readBootstrapState: vi.fn(() => ({})),
  tokenIsValid: vi.fn(() => false),
  writeBootstrapState: vi.fn((state) => state),
}))

vi.mock("@/lib/video-factory-vast-bootstrap-runtime", () => ({
  advanceBootstrap: vi.fn(),
  cleanupInstance: vi.fn(),
  factory: vi.fn(),
  safeState: vi.fn(() => ({})),
}))

vi.mock("@/lib/video-factory-vast-marketplace", () => ({
  createScopedVastKey: vi.fn(),
  discoverVastCandidates: vi.fn(),
  verifyVastKey: vi.fn(),
  VIDEO_FACTORY_PROVISIONING_SCRIPT: "https://example.invalid/provision.sh",
}))

import { tokenIsValid } from "@/lib/video-factory-vast-bootstrap"
import { GET } from "./route"

const mockedTokenIsValid = vi.mocked(tokenIsValid)

describe("Video Factory Vast bootstrap route", () => {
  beforeEach(() => {
    mockedTokenIsValid.mockReset()
    mockedTokenIsValid.mockReturnValue(false)
  })

  it("rejects an invalid bootstrap token before any action runs", async () => {
    const response = await GET(new NextRequest(
      "https://www.paradigmjp.com/api/video-factory/bootstrap-vast?action=status&token=invalid",
    ))

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      ok: false,
      error: "Invalid bootstrap token",
    })
    expect(response.headers.get("cache-control")).toContain("no-store")
    expect(response.headers.get("x-robots-tag")).toContain("noindex")
  })
})
