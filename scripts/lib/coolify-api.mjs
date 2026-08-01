/**
 * Resilient Coolify API client — hardened against gateway timeouts.
 *
 * WHY: Coolify deploys run on an origin that gets saturated during Docker
 * builds, and the proxy (Cloudflare / nginx) returns transient 5xx
 * (502/503/504/520-524) or drops connections while a deployment is *already
 * queued and progressing*. The previous tooling threw on the first such error,
 * so healthy deploys looked "failed" and in-flight builds were even auto-cancelled.
 *
 * This client:
 *   - applies a per-request timeout (AbortSignal.timeout)
 *   - retries transient gateway errors with exponential backoff
 *   - exposes a non-throwing `tryRequest` for resilient polling
 *   - polls a deployment to completion while tolerating transient origin overload
 *   - never cancels an in-flight deployment on a mere polling hiccup
 */

const TRANSIENT_STATUS = new Set([0, 408, 425, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524])
const DEFAULT_TIMEOUT_MS = Number(process.env.COOLIFY_HTTP_TIMEOUT_MS) || 25_000
const MAX_BACKOFF_MS = 20_000

export function isTransientStatus(status) {
  return TRANSIENT_STATUS.has(status)
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function createCoolifyClient({ token, baseUrl }) {
  if (!token) throw new Error("createCoolifyClient: token is required")
  if (!baseUrl) throw new Error("createCoolifyClient: baseUrl is required")

  async function rawRequest(path, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
    let signal
    try {
      signal = AbortSignal.timeout(timeoutMs)
    } catch {
      signal = undefined
    }
    let res
    try {
      res = await fetch(`${baseUrl}${path}`, {
        ...options,
        signal,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      })
    } catch (err) {
      const isTimeout = err && (err.name === "TimeoutError" || err.name === "AbortError")
      return {
        ok: false,
        status: 0,
        transient: true,
        error: isTimeout ? `request timeout after ${timeoutMs}ms` : err?.message || String(err),
        data: null,
      }
    }
    const text = await res.text().catch(() => "")
    let data = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = null
      }
    }
    return {
      ok: res.ok,
      status: res.status,
      transient: isTransientStatus(res.status),
      data,
      raw: text,
    }
  }

  /** Retrying request — throws only on a persistent / non-transient failure. */
  async function request(path, options = {}, { attempts = 5, baseDelayMs = 2_000, timeoutMs } = {}) {
    let last
    for (let attempt = 1; attempt <= attempts; attempt++) {
      last = await rawRequest(path, options, timeoutMs)
      if (last.ok) return last.data
      if (!last.transient) {
        throw new Error(`Coolify API ${last.status}: ${(last.raw || last.error || "").slice(0, 200)}`)
      }
      if (attempt < attempts) {
        const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), MAX_BACKOFF_MS)
        console.warn(
          `[coolify] transient ${last.status || last.error} on ${path} — retry ${attempt}/${attempts - 1} in ${Math.round(delay / 1000)}s`,
        )
        await sleep(delay)
      }
    }
    throw new Error(`Coolify API persistent transient failure on ${path}: ${last.status || last.error}`)
  }

  /** Non-throwing single request — for resilient polling loops. */
  async function tryRequest(path, options = {}, { timeoutMs } = {}) {
    const r = await rawRequest(path, options, timeoutMs)
    if (r.ok) return { ok: true, data: r.data }
    return { ok: false, status: r.status, transient: r.transient, error: r.error || r.raw }
  }

  /** Best-effort lookup of the most recent deployment uuid for an app. */
  async function getLatestDeploymentUuid(appUuid) {
    const r = await tryRequest(`/api/v1/deployments`)
    if (!r.ok) return null
    const list = Array.isArray(r.data) ? r.data : r.data?.data || r.data?.deployments || []
    const matches = list.filter(
      (d) =>
        d &&
        (d.application_uuid === appUuid ||
          d.application_id === appUuid ||
          d.app_uuid === appUuid ||
          !appUuid),
    )
    const pool = matches.length > 0 ? matches : list
    if (pool.length === 0) return null
    // Prefer in-progress/queued; otherwise newest.
    const inflight = pool.find((d) => ["in_progress", "queued", "running"].includes(d.status))
    const chosen = inflight || pool[0]
    return chosen?.deployment_uuid || chosen?.uuid || null
  }

  /**
   * Poll a deployment to completion. Tolerates transient origin overload:
   * a failed status fetch is treated as "still building" (the build itself is
   * what's saturating the host), NOT as a deployment failure.
   */
  async function pollDeployment(
    uuid,
    { maxMinutes = 30, intervalMs = 15_000, onUpdate = () => {} } = {},
  ) {
    const deadline = Date.now() + maxMinutes * 60_000
    let lastKnown = "unknown"
    let consecutiveErrors = 0
    let tick = 0
    while (Date.now() < deadline) {
      const r = await tryRequest(`/api/v1/deployments/${uuid}`)
      tick += 1
      if (r.ok) {
        consecutiveErrors = 0
        const state = r.data?.status || r.data?.data?.status || "unknown"
        lastKnown = state
        onUpdate({ tick, state, transient: false })
        if (state === "finished" || state === "running:healthy" || state === "success") {
          return { ok: true, status: state }
        }
        if (state === "failed" || state === "error" || state === "cancelled") {
          return { ok: false, status: state }
        }
      } else {
        consecutiveErrors += 1
        onUpdate({
          tick,
          state: lastKnown,
          transient: true,
          note: `gateway ${r.status || r.error} (origin likely busy building) — consecutive ${consecutiveErrors}`,
        })
      }
      await sleep(intervalMs)
    }
    return { ok: false, status: lastKnown, timedOut: true }
  }

  return { rawRequest, request, tryRequest, getLatestDeploymentUuid, pollDeployment }
}
