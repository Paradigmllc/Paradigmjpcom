import { getServiceSalesSupabase } from "@/lib/supabase"

const DEMO_BATCH_PATH = "/api/sales/demo-site/batch"
const DEFAULT_BATCH_SIZE = 3
const LEASE_SECONDS = 600

type RpcBooleanResult = {
  data: boolean | null
  error: { message: string } | null
}

function publicSiteUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (!configured) {
    console.error("[demo-batch-drain] NEXT_PUBLIC_SITE_URL is not configured")
    return null
  }
  try {
    const url = new URL(configured)
    if (url.protocol !== "https:" && url.hostname !== "localhost") {
      console.error("[demo-batch-drain] NEXT_PUBLIC_SITE_URL must use HTTPS")
      return null
    }
    return url.origin
  } catch (error) {
    console.error("[demo-batch-drain] NEXT_PUBLIC_SITE_URL is invalid:", error)
    return null
  }
}

export async function claimDemoBatchDrain(
  drainId: string,
): Promise<{ ok: boolean; claimed: boolean; error?: string }> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, claimed: false, error: "Supabase service_role not configured" }
  const result = (await sb.rpc("claim_demo_generation_drain", {
    p_owner: drainId,
    p_lease_seconds: LEASE_SECONDS,
  })) as RpcBooleanResult
  if (result.error) {
    console.error("[demo-batch-drain] lease claim failed:", result.error.message)
    return { ok: false, claimed: false, error: result.error.message }
  }
  return { ok: true, claimed: result.data === true }
}

export async function releaseDemoBatchDrain(drainId: string): Promise<void> {
  const sb = getServiceSalesSupabase()
  if (!sb) {
    console.error("[demo-batch-drain] cannot release lease without Supabase service_role")
    return
  }
  const result = (await sb.rpc("release_demo_generation_drain", {
    p_owner: drainId,
  })) as RpcBooleanResult
  if (result.error) console.error("[demo-batch-drain] lease release failed:", result.error.message)
}

export async function dispatchDemoBatchDrain(input: {
  drainId: string
  limit?: number
}): Promise<{ ok: boolean; status?: number; error?: string }> {
  const secret = process.env.TRIGGER_WEBHOOK_SECRET?.trim()
  if (!secret) {
    const error = "TRIGGER_WEBHOOK_SECRET is not configured"
    console.error(`[demo-batch-drain] ${error}`)
    return { ok: false, error }
  }
  const origin = publicSiteUrl()
  if (!origin) return { ok: false, error: "public site URL is unavailable" }

  try {
    const response = await fetch(`${origin}${DEMO_BATCH_PATH}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-webhook-secret": secret,
      },
      body: JSON.stringify({
        limit: input.limit ?? DEFAULT_BATCH_SIZE,
        drainId: input.drainId,
        automated: true,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(295_000),
    })
    if (!response.ok) {
      const body = await response.text()
      const error = `dispatch failed (${response.status}): ${body.slice(0, 500)}`
      console.error(`[demo-batch-drain] ${error}`)
      return { ok: false, status: response.status, error }
    }
    return { ok: true, status: response.status }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[demo-batch-drain] dispatch request failed:", error)
    return { ok: false, error: message }
  }
}
