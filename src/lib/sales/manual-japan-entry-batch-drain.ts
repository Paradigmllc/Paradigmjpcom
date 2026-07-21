const MANUAL_WORK_BATCH_DRAIN_PATH = "/api/work/batches"

function drainOrigin(): string | null {
  const internal = process.env.MANUAL_WORK_INTERNAL_ORIGIN?.trim()
  const configured = internal
    ?? (process.env.NODE_ENV === "production"
      ? `http://127.0.0.1:${process.env.PORT?.trim() || "3000"}`
      : process.env.NEXT_PUBLIC_SITE_URL?.trim())
  if (!configured) {
    console.error("[manual-work-batch-drain] drain origin is not configured")
    return null
  }
  try {
    const url = new URL(configured)
    const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1"
    if (url.protocol !== "https:" && !loopback) {
      console.error("[manual-work-batch-drain] drain origin must use HTTPS or loopback HTTP")
      return null
    }
    return url.origin
  } catch (error) {
    console.error("[manual-work-batch-drain] drain origin is invalid:", error)
    return null
  }
}

export async function dispatchManualWorkBatchDrain(batchId: string): Promise<{
  ok: boolean
  status?: number
  error?: string
}> {
  const secret = process.env.TRIGGER_WEBHOOK_SECRET?.trim()
  if (!secret) {
    const error = "TRIGGER_WEBHOOK_SECRET is not configured"
    console.error(`[manual-work-batch-drain] ${error}`)
    return { ok: false, error }
  }
  const origin = drainOrigin()
  if (!origin) return { ok: false, error: "public site URL is unavailable" }

  try {
    const response = await fetch(`${origin}${MANUAL_WORK_BATCH_DRAIN_PATH}/${batchId}/drain`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-webhook-secret": secret,
      },
      body: JSON.stringify({ automated: true }),
      cache: "no-store",
      // A full company pass includes bounded 120s DeepSeek phases plus public
      // evidence and Twenty read-back. Keep this outside the old five-minute
      // cliff while the DB claim remains the duplicate-execution guard.
      signal: AbortSignal.timeout(890_000),
    })
    if (!response.ok) {
      const body = await response.text()
      const error = `dispatch failed (${response.status}): ${body.slice(0, 500)}`
      console.error(`[manual-work-batch-drain] ${error}`)
      return { ok: false, status: response.status, error }
    }
    return { ok: true, status: response.status }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[manual-work-batch-drain] dispatch request failed:", error)
    return { ok: false, error: message }
  }
}
