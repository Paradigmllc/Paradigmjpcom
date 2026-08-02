import { describe, expect, it } from "vitest"
import { POST } from "@/app/api/pet-life-movie/render/callback/route"

describe("legacy Pet Life Movie renderer callback", () => {
  it("cannot bypass human approval and private checksum delivery", async () => {
    const response = await POST()
    expect(response.status).toBe(410)
    await expect(response.json()).resolves.toMatchObject({ ok: false })
  })
})
