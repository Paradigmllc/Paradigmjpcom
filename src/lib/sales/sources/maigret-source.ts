/**
 * Maigret social search — via HTTP API gateway.
 * Requires osint-gateway Docker service running on MAIGRET_API_URL (default: http://localhost:5003).
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
  } catch (error) {
    return { ok: false, detail: String(error) }
  }
}

export async function searchMaigretForDomain(domain: string): Promise<MaigretResult> {
  const username = domain?.split(".")[0] ?? ""
  if (!username) return { source: "maigret", ok: false, error: "could not extract username from domain" }
  try {
    const res = await fetch(`${maigretUrl()}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
      signal: AbortSignal.timeout(100_000),
    })
    if (!res.ok) {
      return { source: "maigret", ok: false, error: `HTTP ${res.status}` }
    }
    const data = await res.json() as { ok: boolean; data?: Record<string, unknown>; error?: string }
    return {
      source: "maigret",
      ok: data.ok,
      data: data.data,
      error: data.error,
    }
  } catch (error) {
    console.error("[maigret] search failed:", error)
    return { source: "maigret", ok: false, error: String(error) }
  }
}
