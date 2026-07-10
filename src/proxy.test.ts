import { describe, expect, it } from "vitest"
import { NextRequest } from "next/server"

import { proxy } from "./proxy"

describe("public status host", () => {
  it("uses the deployed readiness endpoint instead of an optional internal dashboard", () => {
    const response = proxy(
      new NextRequest("https://status.paradigmjp.com/", {
        headers: { host: "status.paradigmjp.com" },
      }),
    )

    expect(response.status).toBe(308)
    expect(response.headers.get("location")).toBe("https://paradigmjp.com/api/ready")
  })
})
