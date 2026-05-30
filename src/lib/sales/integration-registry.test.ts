import { afterEach, describe, expect, it, vi } from "vitest"
import { getSalesIntegrationStatus } from "./integration-registry"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("getSalesIntegrationStatus", () => {
  it("reports missing required envs without exposing secret values", async () => {
    vi.stubEnv("DIFY_API_KEY", "")
    const rows = await getSalesIntegrationStatus()
    const dify = rows.find((row) => row.slug === "dify_cloud")
    expect(dify?.status).toBe("missing")
    expect(dify?.missingEnv).toContain("DIFY_API_KEY")
    expect(JSON.stringify(dify)).not.toContain("sk-")
  })

  it("marks Dify Cloud ready when the server env is configured", async () => {
    vi.stubEnv("DIFY_API_KEY", "secret-value-that-must-not-render")
    const rows = await getSalesIntegrationStatus()
    const dify = rows.find((row) => row.slug === "dify_cloud")
    expect(dify?.status).toBe("ready")
    expect(dify?.configuredEnv).toEqual(["DIFY_API_KEY"])
    expect(JSON.stringify(dify)).not.toContain("secret-value")
  })
})
