/**
 * preflight.test.ts — 分類ゲート + robots.txt パーサの単体テスト
 */

import { describe, it, expect, vi, afterEach } from "vitest"
import { preflight } from "./preflight"
import type { ClassifyFormResult } from "./form-classifier"

const safe: ClassifyFormResult = {
  classification: "safe_cf7",
  confidence: 0.85,
  reason: "",
  detectedFields: [],
  source: "regex",
}
const unsafe: ClassifyFormResult = {
  classification: "risky_captcha",
  confidence: 0.95,
  reason: "",
  detectedFields: [],
  source: "regex",
}

afterEach(() => vi.unstubAllGlobals())

describe("preflight", () => {
  it("unsafe 分類を拒否", async () => {
    const r = await preflight({ formUrl: "https://a.com/contact", classification: unsafe, checkRobots: false })
    expect(r.pass).toBe(false)
  })

  it("低 confidence を拒否", async () => {
    const r = await preflight({
      formUrl: "https://a.com/contact",
      classification: { ...safe, confidence: 0.3 },
      checkRobots: false,
    })
    expect(r.pass).toBe(false)
  })

  it("safe + robots 無効なら通す", async () => {
    const r = await preflight({ formUrl: "https://a.com/contact", classification: safe, checkRobots: false })
    expect(r.pass).toBe(true)
  })

  it("robots が対象パスを Disallow なら拒否", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("User-agent: *\nDisallow: /contact", { status: 200 })),
    )
    const r = await preflight({ formUrl: "https://a.com/contact", classification: safe, checkRobots: true })
    expect(r.pass).toBe(false)
  })

  it("robots が別パスのみ Disallow なら通す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("User-agent: *\nDisallow: /admin", { status: 200 })),
    )
    const r = await preflight({ formUrl: "https://a.com/contact", classification: safe, checkRobots: true })
    expect(r.pass).toBe(true)
  })
})
