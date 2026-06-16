import config from "@payload-config"
import { getPayload } from "payload"
import { isPayloadInitCoolingDown, markPayloadInitFailure } from "./payload-availability"

export type AdminAuthSource = "payload" | "legacy" | "webhook" | "none"

export type AdminAuthResult = {
  ok: boolean
  source: AdminAuthSource
  userEmail: string | null
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
}): Promise<AdminAuthResult> {
  const expectedLegacyToken = process.env.ADMIN_PASSWORD
  if (
    expectedLegacyToken &&
    input.legacyToken &&
    safeCompare(input.legacyToken, expectedLegacyToken)
  ) {
    return { ok: true, source: "legacy", userEmail: null }
  }

  if (isPayloadInitCoolingDown()) {
    return { ok: false, source: "none", userEmail: null }
  }

  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: input.headers })

    if (user) {
      return {
        ok: true,
        source: "payload",
        userEmail: userEmailFromUnknown(user),
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
