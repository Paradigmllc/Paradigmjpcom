/**
 * Maigret social search — via self-hosted HTTP API or public APIs as fallback.
 *
 * Primary: self-hosted Maigret at MAIGRET_API_URL
 * Fallback: WhatsMyName public API + GitHub user search
 */
import { envValue } from "../oss-service-health"

interface MaigretResult { source: string; ok: boolean; data?: Record<string, unknown>; error?: string }

function maigretUrl(): string {
  return envValue("MAIGRET_API_URL") ?? "http://localhost:5003"
}

export async function checkMaigretHealth(): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(`${maigretUrl()}/health`, { signal: AbortSignal.timeout(10_000) })
    return { ok: res.ok, detail: `HTTP ${res.status}` }
  } catch (e) {
    console.warn("[maigret] health check failed:", e instanceof Error ? e.message : String(e))
    return { ok: false, detail: "unreachable (will use public API fallbacks)" }
  }
}

export async function searchMaigretForDomain(domain: string): Promise<MaigretResult> {
  const username = domain?.split(".")[0] ?? ""
  if (!username) return { source: "maigret", ok: false, error: "could not extract username from domain" }

  const mUrl = envValue("MAIGRET_API_URL")
  if (mUrl) {
    try {
      const res = await fetch(`${mUrl}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
        signal: AbortSignal.timeout(8_000),
      })
      if (res.ok) {
        const data = await res.json() as { ok: boolean; data?: Record<string, unknown>; error?: string }
        if (data.ok) return { source: "maigret", ok: true, data: data.data }
      }
    } catch (e) {
      console.warn("[maigret] self-hosted API unreachable, using public fallbacks:", e instanceof Error ? e.message : String(e))
    }
  }

  const sites: Array<Record<string, unknown>> = []
  const tasks: Promise<void>[] = []

  tasks.push((async () => {
    try {
      const ghRes = await fetch(
        `https://api.github.com/users/${encodeURIComponent(username)}`,
        { headers: { "User-Agent": "paradigm-sales-os", Accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(8_000) },
      )
      if (ghRes.ok) {
        const ghData = await ghRes.json() as { login?: string; name?: string; blog?: string }
        sites.push({ name: "GitHub", url_user: `https://github.com/${ghData.login}`, status: { exists: true }, username: ghData.login })
      }
    } catch (e) {
      console.warn("[maigret] GitHub check failed:", e instanceof Error ? e.message : String(e))
    }
  })())

  tasks.push((async () => {
    try {
      const twRes = await fetch(`https://twitter.com/${encodeURIComponent(username)}`, { signal: AbortSignal.timeout(8_000), redirect: "manual" })
      if (twRes.status === 200) sites.push({ name: "Twitter/X", url_user: `https://twitter.com/${username}`, status: { exists: true } })
    } catch (e) {
      console.warn("[maigret] Twitter/X check failed:", e instanceof Error ? e.message : String(e))
    }
  })())

  tasks.push((async () => {
    try {
      const rdRes = await fetch(`https://www.reddit.com/user/${encodeURIComponent(username)}/about.json`, { headers: { "User-Agent": "paradigm-sales-os/1.0" }, signal: AbortSignal.timeout(8_000) })
      if (rdRes.ok) {
        const rdData = await rdRes.json() as { data?: { subreddit?: { title?: string } } }
        if (rdData.data) sites.push({ name: "Reddit", url_user: `https://reddit.com/user/${username}`, status: { exists: true } })
      }
    } catch (e) {
      console.warn("[maigret] Reddit check failed:", e instanceof Error ? e.message : String(e))
    }
  })())

  await Promise.allSettled(tasks)

  return {
    source: "maigret",
    ok: sites.length > 0,
    data: { profiles_found: sites.length, sites, fallback: true },
  }
}
