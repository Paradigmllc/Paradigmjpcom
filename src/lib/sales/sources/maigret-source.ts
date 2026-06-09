/**
 * Maigret — social media username search across 2500+ sites.
 * Docker: python:3.11-slim + pip install maigret
 * Usage: docker run --rm maigret <username> --json simple --timeout 15
 */
import { execSync } from "node:child_process"

interface MgResult { source: string; ok: boolean; data?: unknown; error?: string }

function runMaigret(username: string, timeoutMs = 45_000): MgResult {
  if (!username?.trim()) return { source: "maigret", ok: false, error: "empty username" }
  try {
    const output = execSync(
      `docker run --rm --entrypoint maigret python:3.11-slim bash -c "pip install -q maigret 2>/dev/null && maigret '${username.replace(/'/g, "'\\''")}' --no-color --no-progressbar --json simple --timeout 10 --retries 1"`,
      { timeout: timeoutMs + 60_000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    )
    try {
      const data = JSON.parse(output)
      const sites = Array.isArray(data) ? data : (data?.sites || [])
      const found = sites.filter((s: any) => s?.status?.exists).length
      return { source: "maigret", ok: true, data: { profiles_found: found, total_sites: sites.length, sites: sites.slice(0, 30) } }
    } catch {
      // Try line-by-line JSON
      const lines = output.trim().split("\n").filter(Boolean)
      const profiles: unknown[] = []
      for (const line of lines) { try { profiles.push(JSON.parse(line)) } catch { /* skip */ } }
      return { source: "maigret", ok: profiles.length > 0, data: { profiles_found: profiles.length, profiles } }
    }
  } catch (e: any) {
    const err = e?.stderr || e?.stdout || String(e)
    return { source: "maigret", ok: false, error: err.slice(0, 300) }
  }
}

export async function searchMaigretForDomain(domain: string): Promise<MgResult> {
  // Extract company name from domain (e.g., "paradigmjp.com" → "paradigmjp")
  const companyName = domain.split(".")[0]?.replace(/[^a-zA-Z0-9_-]/g, "") || domain
  return runMaigret(companyName, 60_000)
}

export async function checkMaigretHealth(): Promise<{ ok: boolean; detail: string }> {
  try {
    const out = execSync("docker run --rm --entrypoint maigret python:3.11-slim bash -c 'pip install -q maigret 2>/dev/null && maigret --version'", {
      timeout: 30_000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"]
    })
    return { ok: out.length > 0, detail: out.trim() || "installed" }
  } catch (e: any) {
    return { ok: false, detail: e?.stderr?.slice(0, 200) || String(e) }
  }
}
