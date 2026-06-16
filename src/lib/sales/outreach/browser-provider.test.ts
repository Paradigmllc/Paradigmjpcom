import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getBrowserProvider } from "./browser-provider"

beforeEach(() => {
  vi.stubEnv("OUTREACH_BROWSER_PROVIDER", "auto")
  vi.stubEnv("OUTREACH_WORKER_URL", "")
  vi.stubEnv("OUTREACH_WORKER_SECRET", "")
  vi.stubEnv("CRAWLEE_WORKER_URL", "")
  vi.stubEnv("CRAWLEE_WORKER_SECRET", "")
  vi.stubEnv("STAGEHAND_URL", "")
  vi.stubEnv("STAGEHAND_API_KEY", "")
  vi.stubEnv("STEEL_BASE_URL", "")
  vi.stubEnv("STEEL_API_KEY", "")
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe("AutoBrowserProvider", () => {
  it("uses HTTP provider for server-rendered forms and does not escalate dry-run", async () => {
    const fetchMock = vi.fn(async () => new Response(`
      <form action="/submit" method="post">
        <input name="email">
        <textarea name="message"></textarea>
      </form>
    `, { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    const result = await getBrowserProvider().submitForm({
      formUrl: "https://example.com/contact",
      fields: { email: "contact@paradigmjp.com" },
      message: "hello",
      dryRun: true,
    })

    expect(result.outcome).toBe("uncertain")
    expect(result.detail).toContain("prepared")
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("escalates SPA forms to the remote worker when configured", async () => {
    vi.stubEnv("OUTREACH_WORKER_URL", "https://worker.example/")
    vi.stubEnv("OUTREACH_WORKER_SECRET", "secret")
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === "https://example.com/contact") {
        return new Response("<div id='root'></div>", { status: 200 })
      }
      if (url === "https://worker.example/submit") {
        return new Response(JSON.stringify({ ok: true, outcome: "submitted", detail: "worker submitted" }), {
          status: 200,
        })
      }
      return new Response("", { status: 404 })
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await getBrowserProvider().submitForm({
      formUrl: "https://example.com/contact",
      fields: { email: "contact@paradigmjp.com" },
      message: "hello",
      dryRun: false,
    })

    expect(result.outcome).toBe("submitted")
    expect(result.detail).toContain("providers: http:uncertain -> remote:submitted")
  })
})
