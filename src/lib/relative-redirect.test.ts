import { describe, expect, it } from "vitest"
import {
  normalizeSameOriginLocation,
  relativeRedirect,
} from "./relative-redirect"

describe("relative redirect utilities", () => {
  it("emits an unmodified same-origin Location header", () => {
    const response = relativeRedirect("/console/", 307)

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe("/console/")
  })

  it("rejects protocol-relative and absolute destinations", () => {
    expect(() => relativeRedirect("//evil.example/path")).toThrow(
      /same-origin path/,
    )
    expect(() => relativeRedirect("https://evil.example/path")).toThrow(
      /same-origin path/,
    )
  })

  it("converts internal absolute redirects to public-origin-relative paths", () => {
    expect(
      normalizeSameOriginLocation(
        "https://0.0.0.0:3000/console/?tab=gpu#runtime",
      ),
    ).toBe("/console/?tab=gpu#runtime")
    expect(
      normalizeSameOriginLocation("http://127.0.0.1:8080/console/"),
    ).toBe("/console/")
    expect(
      normalizeSameOriginLocation("http://localhost:3000/admin/login"),
    ).toBe("/admin/login")
  })

  it("does not rewrite a legitimate external destination", () => {
    expect(
      normalizeSameOriginLocation("https://accounts.example.com/login"),
    ).toBeNull()
  })
})
