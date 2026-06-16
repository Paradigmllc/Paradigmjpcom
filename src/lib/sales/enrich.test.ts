/**
 * enrich.test.ts — enrichFromContact の smoke test
 */

import { describe, it, expect } from "vitest"
import { enrichFromContact } from "./enrich"

describe("enrichFromContact", () => {
  it("returns skipped: no_email when email is empty", async () => {
    const result = await enrichFromContact({ email: "" })

    expect(result.ok).toBe(false)
    expect(result.skipped).toBe("no_email")
  })

  it("returns skipped: invalid_email when email has no @", async () => {
    const result = await enrichFromContact({ email: "invalid-email" })

    expect(result.ok).toBe(false)
    expect(result.skipped).toBe("invalid_email")
  })

  it("returns skipped: invalid_email when domain has no dot", async () => {
    const result = await enrichFromContact({ email: "user@localhost" })

    expect(result.ok).toBe(false)
    expect(result.skipped).toBe("invalid_email")
  })

  it("returns skipped: personal_domain for gmail addresses", async () => {
    const result = await enrichFromContact({ email: "test@gmail.com" })

    expect(result.ok).toBe(false)
    expect(result.skipped).toBe("personal_domain")
  })
})
