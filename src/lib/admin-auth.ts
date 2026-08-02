import { isPayloadInitCoolingDown, markPayloadInitFailure } from "./payload-availability"
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"

export type AdminAuthSource = "payload" | "legacy" | "webhook" | "none"

export type AdminAuthResult = {
  ok: boolean
  source: AdminAuthSource
  userEmail: string | null
  userId?: string | null
  userRole?: string | null
}

const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7
const ADMIN_API_SESSION_TTL_SECONDS = 60 * 60

function adminSessionSecret(): string | null {
  return [
    process.env.ADMIN_SESSION_SECRET,
    process.env.ADMIN_PASSWORD,
    process.env.PAYLOAD_SECRET,
  ]
    .map((value) => value?.trim() ?? "")
    .find((value) => value.length >= 16) ?? null
}

function signature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url")
}

function createSignedAdminSessionToken(ttlSeconds: number, now = Date.now()): string | null {
  const secret = adminSessionSecret()
  if (!secret) return null
  const expiresAt = Math.floor(now / 1000) + ttlSeconds
  const payload = `${expiresAt}.${randomBytes(18).toString("base64url")}`
  return `${payload}.${signature(payload, secret)}`
}

export function createAdminSessionToken(now = Date.now()): string | null {
  return createSignedAdminSessionToken(ADMIN_SESSION_TTL_SECONDS, now)
}

export function createAdminApiSessionToken(now = Date.now()): string | null {
  return createSignedAdminSessionToken(ADMIN_API_SESSION_TTL_SECONDS, now)
}

export function verifyAdminSessionToken(token: string | null | undefined, now = Date.now()): boolean {
  const secret = adminSessionSecret()
  if (!secret || !token) return false
  const parts = token.split(".")
  if (parts.length !== 3) return false
  const [expiresAtRaw, nonce, receivedSignature] = parts
  if (!/^\d+$/.test(expiresAtRaw) || !/^[A-Za-z0-9_-]{16,64}$/.test(nonce)) return false
  if (Number(expiresAtRaw) < Math.floor(now / 1000)) return false
  const expected = signature(`${expiresAtRaw}.${nonce}`, secret)
  const received = Buffer.from(receivedSignature)
  const expectedBuffer = Buffer.from(expected)
  return received.length === expectedBuffer.length && timingSafeEqual(received, expectedBuffer)
}

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

function userEmailFromUnknown(user: unknown): string | null {
  if (!user || typeof user !== "object" || !("email" in user)) return null
  const email = (user as { email?: unknown }).email
  return typeof email === "string" && email.length > 0 ? email : null
}

function userFieldFromUnknown(user: unknown, field: "id" | "role"): string | null {
  if (!user || typeof user !== "object" || !(field in user)) return null
  const value = (user as Record<string, unknown>)[field]
  return typeof value === "string" && value.length > 0 ? value : null
}

export function authorizeWebhookRequest(headers: Headers): AdminAuthResult {
  const expected = process.env.TRIGGER_WEBHOOK_SECRET
  const received = headers.get("x-webhook-secret")

  if (!received) {
    return { ok: false, source: "none", userEmail: null }
  }

  if (!expected) {
    console.error("[admin-auth] TRIGGER_WEBHOOK_SECRET is not configured")
    return { ok: false, source: "none", userEmail: null }
  }

  if (!safeCompare(received, expected)) {
    return { ok: false, source: "none", userEmail: null }
  }

  return { ok: true, source: "webhook", userEmail: null }
}

export async function authorizePayloadAdminRequest(input: {
  headers: Headers
  legacyToken?: string | null
  allowLegacyPassword?: boolean
}): Promise<AdminAuthResult> {
  const expectedLegacyToken = process.env.ADMIN_PASSWORD
  if (verifyAdminSessionToken(input.legacyToken)) {
    return { ok: true, source: "legacy", userEmail: null }
  }
  if (input.allowLegacyPassword && expectedLegacyToken && input.legacyToken && safeCompare(input.legacyToken, expectedLegacyToken)) {
    return { ok: true, source: "legacy", userEmail: null }
  }

  if (isPayloadInitCoolingDown()) {
    return { ok: false, source: "none", userEmail: null }
  }

  try {
    const [{ getPayload }, { default: config }] = await Promise.all([
      import("payload"),
      import("@payload-config"),
    ])
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: input.headers })

    if (user) {
      return {
        ok: true,
        source: "payload",
        userEmail: userEmailFromUnknown(user),
        userId: userFieldFromUnknown(user, "id"),
        userRole: userFieldFromUnknown(user, "role"),
      }
    }
  } catch (e) {
    markPayloadInitFailure(e)
    console.error("[admin-auth] Payload admin auth failed:", e)
  }

  if (!expectedLegacyToken) {
    console.warn("[admin-auth] ADMIN_PASSWORD is not configured for legacy admin fallback")
  }

  return { ok: false, source: "none", userEmail: null }
}
