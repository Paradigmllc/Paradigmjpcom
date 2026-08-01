import { describe, expect, it } from "vitest"
import { NextRequest } from "next/server"
import { GET } from "./route"

describe("Video Factory console canonicalization", () => {
  it("keeps the slash redirect on the browser's current public origin", async () => {
    const request = new NextRequest("http://0.0.0.0:3000/console", {
      headers: {
        "x-forwarded-host": "www.paradigmjp.com",
        "x-forwarded-proto": "https",
      },
    })

    const response = await GET(request, {
      params: Promise.resolve({ path: undefined }),
    })

    expect(response.status).toBe(308)
    expect(response.headers.get("location")).toBe("/console/")
    expect(response.headers.get("location")).not.toContain("0.0.0.0")
  })
})
