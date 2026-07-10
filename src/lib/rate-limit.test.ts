/**
 * lib/rate-limit.test.ts — IP-based rate limiter unit tests
 *
 * 役割: checkRateLimit() の token bucket 動作 + getClientIp() のヘッダ解決を検証。
 * 入力: vitest test runner
 * 出力: pass/fail
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { checkRateLimit, getClientIp, verifyTurnstile } from "./rate-limit"

describe("checkRateLimit", () => {
  beforeEach(() => {
    // Each test uses a unique key to keep buckets isolated.
  })

  it("allows up to max requests per window", () => {
    const key = `test-allow-${Math.random()}`
    for (let i = 0; i < 3; i++) {
      const r = checkRateLimit({ ip: "1.2.3.4", key, max: 3, windowMs: 1000 })
      expect(r.ok).toBe(true)
      expect(r.remaining).toBe(3 - i - 1)
    }
  })

  it("rejects after exceeding max", () => {
    const key = `test-reject-${Math.random()}`
    for (let i = 0; i < 3; i++) {
      checkRateLimit({ ip: "1.2.3.4", key, max: 3, windowMs: 1000 })
    }
    const r = checkRateLimit({ ip: "1.2.3.4", key, max: 3, windowMs: 1000 })
    expect(r.ok).toBe(false)
    expect(r.remaining).toBe(0)
  })

  it("isolates buckets per IP", () => {
    const key = `test-iso-${Math.random()}`
    for (let i = 0; i < 3; i++) {
      checkRateLimit({ ip: "1.1.1.1", key, max: 3, windowMs: 1000 })
    }
    // Different IP — should still be allowed
    const r = checkRateLimit({ ip: "2.2.2.2", key, max: 3, windowMs: 1000 })
    expect(r.ok).toBe(true)
  })

  it("respects RATE_LIMIT_DISABLED env", () => {
    process.env.RATE_LIMIT_DISABLED = "1"
    const r = checkRateLimit({
      ip: "1.2.3.4",
      key: `disabled-${Math.random()}`,
      max: 1,
      windowMs: 1000,
    })
    expect(r.ok).toBe(true)
    delete process.env.RATE_LIMIT_DISABLED
  })
})

describe("getClientIp", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  function makeReq(headers: Record<string, string>): Request {
    return new Request("http://localhost/", { headers: new Headers(headers) })
  }

  it("prefers cf-connecting-ip", () => {
    const req = makeReq({
      "cf-connecting-ip": "1.1.1.1",
      "x-forwarded-for": "2.2.2.2, 3.3.3.3",
      "x-real-ip": "4.4.4.4",
    })
    expect(getClientIp(req)).toBe("1.1.1.1")
  })

  it("falls back to first x-forwarded-for", () => {
    const req = makeReq({ "x-forwarded-for": "5.5.5.5, 6.6.6.6" })
    expect(getClientIp(req)).toBe("5.5.5.5")
  })

  it("falls back to x-real-ip", () => {
    const req = makeReq({ "x-real-ip": "7.7.7.7" })
    expect(getClientIp(req)).toBe("7.7.7.7")
  })

  it("returns 0.0.0.0 when nothing set", () => {
    const req = makeReq({})
    expect(getClientIp(req)).toBe("0.0.0.0")
  })

  it("trusts only Cloudflare's validated header in cloudflare mode", () => {
    vi.stubEnv("TRUSTED_PROXY_MODE", "cloudflare")
    const req = makeReq({
      host: "paradigmjp.com",
      "cf-connecting-ip": "203.0.113.20",
      "x-forwarded-for": "198.51.100.10",
    })
    expect(getClientIp(req)).toBe("203.0.113.20")

    const forgedFallback = makeReq({
      host: "www.paradigmjp.com",
      "cf-connecting-ip": "not-an-ip",
      "x-forwarded-for": "198.51.100.10",
    })
    expect(getClientIp(forgedFallback)).toBe("0.0.0.0")
  })

  it("ignores spoofed Cloudflare headers on the DNS-only keystatic host", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("TRUSTED_PROXY_MODE", "cloudflare")
    const req = makeReq({
      host: "keystatic.paradigmjp.com",
      "cf-connecting-ip": "203.0.113.20",
      "x-forwarded-for": "198.51.100.10",
    })

    expect(getClientIp(req)).toBe("0.0.0.0")
  })

  it("does not trust forwarding headers in unconfigured production", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("TRUSTED_PROXY_MODE", "")
    const req = makeReq({
      "cf-connecting-ip": "203.0.113.20",
      "x-forwarded-for": "198.51.100.10",
      "x-real-ip": "192.0.2.10",
    })
    expect(getClientIp(req)).toBe("0.0.0.0")
  })
})

describe("verifyTurnstile", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("allows an omitted secret only outside production", async () => {
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("TURNSTILE_SECRET_KEY", "")
    await expect(verifyTurnstile(null)).resolves.toBe(true)
  })

  it("fails closed when the production secret is missing", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("TURNSTILE_SECRET_KEY", "")
    vi.spyOn(console, "error").mockImplementation(() => undefined)
    await expect(verifyTurnstile("token")).resolves.toBe(false)
  })
})
