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

type Bucket = { count: number; resetAt: number }
const store = new Map<string, Bucket>()

// Sweep expired buckets every 60s to prevent memory growth on long-running process.
let sweepTimer: ReturnType<typeof setInterval> | null = null
function ensureSweeper() {
  if (sweepTimer) return
  sweepTimer = setInterval(() => {
    const now = Date.now()
    for (const [k, v] of store) {
      if (v.resetAt < now) store.delete(k)
    }
  }, 60_000)
  // unref so it doesn't keep Node alive in tests
  if (typeof (sweepTimer as { unref?: () => void }).unref === "function") {
    ;(sweepTimer as { unref: () => void }).unref()
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
  ensureSweeper()
  const now = Date.now()
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

/** Pull client IP from request headers (Cloudflare → x-forwarded-for fallback). */
export function getClientIp(req: Request): string {
  const cfConnectingIp = req.headers.get("cf-connecting-ip")
  if (cfConnectingIp) return cfConnectingIp.trim()
  const xff = req.headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0].trim()
  const real = req.headers.get("x-real-ip")
  if (real) return real.trim()
  return "0.0.0.0"
}

/**
 * Cloudflare Turnstile CAPTCHA verification.
 * Returns true if disabled (no env) or if token is valid; false if invalid.
 *
 * Setup:
 *   1. Cloudflare Turnstile dashboard → create site key + secret
 *   2. Set TURNSTILE_SECRET_KEY in Coolify env
 *   3. Front-end widget → POST { turnstileToken } with form
 */
export async function verifyTurnstile(token: string | null | undefined): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true // disabled when secret unset
  if (!token) return false
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }).toString(),
    })
    const data = (await res.json()) as { success?: boolean }
    return Boolean(data.success)
  } catch (e) {
    console.error("[turnstile] verify failed:", e)
    return false
  }
}
