import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "./route"

const ADMIN_SECRET = "seed-route-test-secret"

function request(body: string) {
  return new Request("http://localhost/api/admin/seed-all-content", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": ADMIN_SECRET,
    },
    body,
  })
}

describe("POST /api/admin/seed-all-content", () => {
  beforeEach(() => {
    process.env.ADMIN_SCRIPT_SECRET = ADMIN_SECRET
  })

  afterEach(() => {
    delete process.env.ADMIN_SCRIPT_SECRET
    vi.restoreAllMocks()
  })

  it("fails closed when the JSON body is malformed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined)
    const response = await POST(request("{"))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: "Request body must be valid JSON",
    })
  })

  it("rejects an unknown seed scope instead of widening it to all", async () => {
    const response = await POST(request(JSON.stringify({
      confirm: true,
      scope: "everything",
    })))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: "Unknown scope",
      allowedScopes: ["all", "homepage", "homepage-en"],
    })
  })

  it("accepts a dry-run for the English homepage only", async () => {
    const response = await POST(request(JSON.stringify({
      dryRun: true,
      scope: "homepage-en",
    })))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      dryRun: true,
      scope: "homepage-en",
      would_seed: { pages: 1 },
    })
  })
})
