import { describe, expect, it } from "vitest"
import { z } from "zod"
import { petMovieErrorResponse } from "./http"

describe("Pet Life Movie error responses", () => {
  it("does not expose internal errors to clients", async () => {
    const response = petMovieErrorResponse(new Error("database password leaked"), "test")
    const body = await response.json() as { error: string; errorId: string }
    expect(response.status).toBe(500)
    expect(body.error).not.toContain("database password")
    expect(body.errorId).toMatch(/^[0-9a-f-]{36}$/)
  })

  it("returns validation errors without schema internals", async () => {
    const validation = z.object({ secretField: z.string() }).safeParse({})
    if (validation.success) throw new Error("Expected validation failure")
    const response = petMovieErrorResponse(validation.error, "test")
    const body = await response.json() as Record<string, unknown>
    expect(response.status).toBe(400)
    expect(body).not.toHaveProperty("issues")
  })
})
