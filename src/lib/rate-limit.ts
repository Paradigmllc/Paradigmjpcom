/**
 * lib/rate-limit.ts — In-memory IP-based rate limiter for API endpoints
 *
 * 役割: 単一インスタンスの Coolify 環境で /api/contact など public endpoint を
 *       スパム / brute force から守る lightweight token bucket。
 *       Upstash Redis 等を導入したら差し替える前提のシンプル実装。
 * 入力: { ip, key, max, windowMs }
 * 出力: { ok, remaining, resetAt }
 *
 * 注意:
 *   - in-memory なので horizontal scaling 時は Redis ベースに移行必須
 *   - Coolify 1 instance + Cloudflare 前段なら現実的には十分
 *   - 環境変数 RATE_LIMIT_DISABLED=1 でテスト時に無効化
 */

import { isIP } from "node:net"

type Bucket = { count: number; resetAt: number }
const store = new Map<string, Bucket>()
let nextSweepAt = 0

function sweepExpiredBuckets(now: number) {
  if (now < nextSweepAt) return
  nextSweepAt = now + 60_000
  for (const [bucketKey, bucket] of store) {
    if (bucket.resetAt < now) store.delete(bucketKey)
  }
}

export interface RateLimitOptions {
  ip: string
  key?: string // logical bucket name (e.g. "contact-post")
  max?: number // requests
  windowMs?: number // window in ms
}

export interface RateLimitResult {
  ok: boolean
  remaining: number
  resetAt: number
}

export function checkRateLimit({
  ip,
  key = "default",
  max = 5,
  windowMs = 60_000,
}: RateLimitOptions): RateLimitResult {
  if (process.env.RATE_LIMIT_DISABLED === "1") {
    return { ok: true, remaining: max, resetAt: Date.now() + windowMs }
  }
  const now = Date.now()
  sweepExpiredBuckets(now)
  const bucketKey = `${key}:${ip}`
  const bucket = store.get(bucketKey)

  if (!bucket || bucket.resetAt < now) {
    store.set(bucketKey, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: max - 1, resetAt: now + windowMs }
  }

  bucket.count += 1
  const remaining = Math.max(0, max - bucket.count)
  return { ok: bucket.count <= max, remaining, resetAt: bucket.resetAt }
}

function validHeaderIp(value: string | null): string | null {
  const candidate = value?.trim() ?? ""
  return isIP(candidate) > 0 ? candidate : null
}

function firstForwardedIp(value: string | null): string | null {
  if (!value) return null
  return validHeaderIp(value.split(",", 1)[0] ?? null)
}

const CLOUDFLARE_PROTECTED_HOSTS = new Set([
  "paradigmjp.com",
  "www.paradigmjp.com",
])

function requestHostname(req: Request): string {
  const hostHeader = req.headers.get("host")?.trim()
  try {
    const hostname = hostHeader
      ? new URL(`http://${hostHeader}`).hostname
      : new URL(req.url).hostname
    return hostname.toLowerCase().replace(/\.$/, "")
  } catch (error) {
    console.warn("[rate-limit] Invalid request host while resolving IP:", error)
    return ""
  }
}

function trustsCloudflareHeader(req: Request): boolean {
  const hostname = requestHostname(req)
  if (CLOUDFLARE_PROTECTED_HOSTS.has(hostname)) return true
  return (
    process.env.NODE_ENV !== "production" &&
    (hostname === "localhost" || hostname === "127.0.0.1")
  )
}

/**
 * Resolve client IP only from the proxy explicitly trusted by deployment.
 * In production, missing configuration fails closed to one shared bucket
 * instead of trusting attacker-controlled forwarding headers.
 */
export function getClientIp(req: Request): string {
  const proxyMode = process.env.TRUSTED_PROXY_MODE?.trim().toLowerCase()
  if (proxyMode === "cloudflare") {
    if (!trustsCloudflareHeader(req)) return "0.0.0.0"
    return validHeaderIp(req.headers.get("cf-connecting-ip")) ?? "0.0.0.0"
  }
  if (proxyMode === "reverse-proxy") {
    return (
      firstForwardedIp(req.headers.get("x-forwarded-for")) ??
      validHeaderIp(req.headers.get("x-real-ip")) ??
      "0.0.0.0"
    )
  }
  if (process.env.NODE_ENV !== "production") {
    return (
      validHeaderIp(req.headers.get("cf-connecting-ip")) ??
      firstForwardedIp(req.headers.get("x-forwarded-for")) ??
      validHeaderIp(req.headers.get("x-real-ip")) ??
      "0.0.0.0"
    )
  }
  return "0.0.0.0"
}

/**
 * Cloudflare Turnstile CAPTCHA verification.
 * Returns true without a configured secret only outside production. Production
 * fails closed so a missing deployment secret cannot silently disable CAPTCHA.
 *
 * Setup:
 *   1. Cloudflare Turnstile dashboard → create site key + secret
 *   2. Set TURNSTILE_SECRET_KEY in Coolify env
 *   3. Front-end widget → POST { turnstileToken } with form
 */
export async function verifyTurnstile(
  token: string | null | undefined,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[turnstile] TURNSTILE_SECRET_KEY is required in production",
      )
      return false
    }
    return true
  }
  if (!token) return false
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: token }).toString(),
      },
    )
    const data = (await res.json()) as { success?: boolean }
    return Boolean(data.success)
  } catch (e) {
    console.error("[turnstile] verify failed:", e)
    return false
  }
}
