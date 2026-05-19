/**
 * lib/sales/sources/dataforseo/dataforseo.test.ts — Sprint 14 移植後の単体テスト
 *
 * 役割: client.ts / lighthouse.ts / index.ts orchestrator の parse + error 経路を検証.
 *       実 API は呼ばない (全 fetch を vi.stubGlobal で mock).
 *
 * カバー範囲:
 *   - dataforseoPost: 認証ヘッダ生成 / 401 / 非 JSON レスポンス / billing 抽出
 *   - runLighthouse: 正常 parse / auth_missing / http_error / no_data
 *   - scanDomainSeo: 並列実行 / 部分的失敗の errors[] 記録 / cost 合算
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { dataforseoPost, DataforseoError } from "./client"
import { runLighthouse } from "./lighthouse"
import { scanDomainSeo } from "./index"

const originalLogin = process.env.DATAFORSEO_LOGIN
const originalPassword = process.env.DATAFORSEO_PASSWORD

function mockFetch(impl: (url: string, init: RequestInit) => Response | Promise<Response>) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init: RequestInit) => Promise.resolve(impl(url, init))),
  )
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

beforeEach(() => {
  process.env.DATAFORSEO_LOGIN = "test@example.com"
  process.env.DATAFORSEO_PASSWORD = "test-password"
  // suppress expected console.warn noise during error-path tests
  vi.spyOn(console, "warn").mockImplementation(() => {})
})

afterEach(() => {
  process.env.DATAFORSEO_LOGIN = originalLogin
  process.env.DATAFORSEO_PASSWORD = originalPassword
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("dataforseoPost", () => {
  it("sends Basic auth header with base64(login:password)", async () => {
    const fetchSpy = vi.fn(
      (_url: string, _init: RequestInit): Promise<Response> =>
        Promise.resolve(jsonResponse({ cost: 0.005, tasks: [{ result_count: 1 }] })),
    )
    vi.stubGlobal("fetch", fetchSpy)

    await dataforseoPost("on_page/lighthouse/live/json", [{ url: "https://x.com" }])

    expect(fetchSpy).toHaveBeenCalledOnce()
    const init = fetchSpy.mock.calls[0]![1]
    const authHeader = (init.headers as Record<string, string>).Authorization
    expect(authHeader).toBe(`Basic ${btoa("test@example.com:test-password")}`)
  })

  it("throws if DATAFORSEO_LOGIN env is missing", async () => {
    delete process.env.DATAFORSEO_LOGIN
    await expect(dataforseoPost("on_page/test", {})).rejects.toThrow(/DATAFORSEO_LOGIN/)
  })

  it("throws DataforseoError on HTTP 401", async () => {
    mockFetch(() => new Response("Unauthorized", { status: 401 }))
    await expect(dataforseoPost("on_page/test", {})).rejects.toBeInstanceOf(DataforseoError)
  })

  it("throws DataforseoError on non-JSON response", async () => {
    mockFetch(() => new Response("<html>oops</html>", { status: 200, headers: { "content-type": "text/html" } }))
    await expect(dataforseoPost("on_page/test", {})).rejects.toThrow(/non-JSON/)
  })

  it("extracts billing.cost + result_count from successful response", async () => {
    mockFetch(() => jsonResponse({ cost: 0.0075, tasks: [{ result_count: 3 }] }))
    const { billing } = await dataforseoPost("on_page/lighthouse/live/json", [])
    expect(billing.costUsd).toBe(0.0075)
    expect(billing.resultCount).toBe(3)
    expect(billing.path).toEqual(["v3", "on_page", "lighthouse", "live", "json"])
  })

  it("returns null resultCount when tasks missing", async () => {
    mockFetch(() => jsonResponse({ cost: 0 }))
    const { billing } = await dataforseoPost("on_page/test", [])
    expect(billing.resultCount).toBe(null)
  })
})

describe("runLighthouse", () => {
  it("parses scores (0-100) + Core Web Vitals from valid response", async () => {
    mockFetch(() =>
      jsonResponse({
        cost: 0.005,
        tasks: [
          {
            result: [
              {
                categories: {
                  performance: { score: 0.92 },
                  accessibility: { score: 0.85 },
                  "best-practices": { score: 0.78 },
                  seo: { score: 1.0 },
                },
                audits: {
                  "largest-contentful-paint": { numericValue: 1234 },
                  "cumulative-layout-shift": { numericValue: 0.05 },
                  "interaction-to-next-paint": { numericValue: 180 },
                },
              },
            ],
          },
        ],
      }),
    )

    const result = await runLighthouse({ url: "https://example.com", strategy: "mobile" })

    expect(result.scores.performance).toBe(92)
    expect(result.scores.accessibility).toBe(85)
    expect(result.scores.bestPractices).toBe(78)
    expect(result.scores.seo).toBe(100)
    expect(result.vitals.lcpMs).toBe(1234)
    expect(result.vitals.cls).toBe(0.05)
    expect(result.vitals.inpMs).toBe(180)
    expect(result.costUsd).toBe(0.005)
    expect(result.error).toBeUndefined()
  })

  it("returns error=auth_missing when env is not set", async () => {
    delete process.env.DATAFORSEO_LOGIN
    const result = await runLighthouse({ url: "https://x.com", strategy: "mobile" })
    expect(result.error).toBe("auth_missing")
    expect(result.scores.performance).toBe(null)
  })

  it("returns error=http_error on HTTP 500", async () => {
    mockFetch(() => new Response("server error", { status: 500 }))
    const result = await runLighthouse({ url: "https://x.com", strategy: "mobile" })
    expect(result.error).toBe("http_error")
  })

  it("returns error=no_data when tasks[0].result is missing", async () => {
    mockFetch(() => jsonResponse({ cost: 0, tasks: [{}] }))
    const result = await runLighthouse({ url: "https://x.com", strategy: "mobile" })
    expect(result.error).toBe("no_data")
  })

  it("falls back to max-potential-fid when interaction-to-next-paint is missing", async () => {
    mockFetch(() =>
      jsonResponse({
        cost: 0.005,
        tasks: [
          {
            result: [
              {
                categories: { performance: { score: 0.5 } },
                audits: { "max-potential-fid": { numericValue: 250 } },
              },
            ],
          },
        ],
      }),
    )
    const result = await runLighthouse({ url: "https://x.com", strategy: "mobile" })
    expect(result.vitals.inpMs).toBe(250)
  })
})

describe("scanDomainSeo", () => {
  it("runs mobile + desktop in parallel by default and totals cost", async () => {
    let callCount = 0
    mockFetch((_url, init) => {
      callCount++
      const body = JSON.parse(init.body as string) as Array<{ for_mobile: boolean }>
      const score = body[0].for_mobile ? 0.6 : 0.85
      return jsonResponse({
        cost: 0.005,
        tasks: [
          {
            result: [
              {
                categories: { performance: { score } },
                audits: {},
              },
            ],
          },
        ],
      })
    })

    const result = await scanDomainSeo("example.com")

    expect(callCount).toBe(2)
    expect(result.lighthouse.mobile?.scores.performance).toBe(60)
    expect(result.lighthouse.desktop?.scores.performance).toBe(85)
    expect(result.totalCostUsd).toBeCloseTo(0.01, 5)
    expect(result.errors).toEqual([])
  })

  it("records partial failures in errors[] without throwing", async () => {
    let callCount = 0
    mockFetch((_url, init) => {
      callCount++
      const body = JSON.parse(init.body as string) as Array<{ for_mobile: boolean }>
      if (body[0].for_mobile) {
        return new Response("boom", { status: 500 })
      }
      return jsonResponse({
        cost: 0.005,
        tasks: [{ result: [{ categories: { performance: { score: 0.9 } }, audits: {} }] }],
      })
    })

    const result = await scanDomainSeo("example.com")

    expect(callCount).toBe(2)
    expect(result.errors).toContain("lighthouse.mobile:http_error")
    expect(result.lighthouse.desktop?.scores.performance).toBe(90)
    expect(result.totalCostUsd).toBeCloseTo(0.005, 5)
  })

  it("respects options.strategies to skip desktop", async () => {
    let callCount = 0
    mockFetch(() => {
      callCount++
      return jsonResponse({
        cost: 0.005,
        tasks: [{ result: [{ categories: { performance: { score: 0.7 } }, audits: {} }] }],
      })
    })

    const result = await scanDomainSeo("example.com", { strategies: ["mobile"] })

    expect(callCount).toBe(1)
    expect(result.lighthouse.mobile).toBeDefined()
    expect(result.lighthouse.desktop).toBeUndefined()
  })

  it("normalizes bare domain to https URL", async () => {
    const fetchSpy = vi.fn(
      (_url: string, _init: RequestInit): Promise<Response> =>
        Promise.resolve(
          jsonResponse({
            cost: 0,
            tasks: [{ result: [{ categories: {}, audits: {} }] }],
          }),
        ),
    )
    vi.stubGlobal("fetch", fetchSpy)

    await scanDomainSeo("example.com", { strategies: ["mobile"] })

    const bodyText = fetchSpy.mock.calls[0]![1].body as string
    const body = JSON.parse(bodyText) as Array<{ url: string }>
    expect(body[0]!.url).toBe("https://example.com")
  })
})
