/**
 * stagehand-enrich-source.ts — Stagehand AI browser enrichment source
 *
 * Uses Stagehand OSS for AI-powered site data extraction and form discovery.
 * Self-hosted at STAGEHAND_URL (default: https://stagehand.paradigmjp.com)
 *
 * Replaces Skyvern as the primary AI browser automation source for enrichment.
 */
import { envValue } from "../oss-service-health"

function stagehandUrl(): string {
  return (envValue("STAGEHAND_URL") ?? "http://localhost:3000").replace(/\/+$/, "")
}

function stagehandKey(): string | null {
  return envValue("STAGEHAND_API_KEY") ?? null
}

export async function checkStagehandEnrichHealth(): Promise<{ ok: boolean; detail: string }> {
  try {
    const url = stagehandUrl()
    const headers: Record<string, string> = {}
    const key = stagehandKey()
    if (key) headers["Authorization"] = `Bearer ${key}`
    const res = await fetch(`${url}/`, { headers, signal: AbortSignal.timeout(10_000) })
    return { ok: res.ok, detail: `HTTP ${res.status}` }
  } catch (e) {
    return { ok: false, detail: `unreachable: ${e instanceof Error ? e.message : String(e)}` }
  }
}

interface StagehandExtractResult {
  ok: boolean
  data?: {
    title?: string
    description?: string
    bodyText?: string
    links?: string[]
    images?: string[]
    forms?: Array<{ action?: string; method?: string; fields?: Array<{ name: string; type: string }> }>
    techHints?: string[]
  }
  error?: string
}

export async function extractSiteData(url: string): Promise<StagehandExtractResult> {
  if (!url?.startsWith("http")) return { ok: false, error: "invalid url" }
  const apiUrl = stagehandUrl()
  const key = stagehandKey()
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (key) headers["Authorization"] = `Bearer ${key}`

  try {
    const res = await fetch(`${apiUrl}/extract`, {
      method: "POST",
      headers,
      body: JSON.stringify({ url, mode: "full_extraction" }),
      signal: AbortSignal.timeout(120_000),
    })
    if (!res.ok) {
      return { ok: false, error: `Stagehand HTTP ${res.status}` }
    }
    const data = await res.json() as {
      title?: string; description?: string; bodyText?: string;
      links?: string[]; images?: string[];
      forms?: Array<{ action?: string; method?: string; fields?: Array<{ name: string; type: string }> }>;
      techHints?: string[];
    }
    return {
      ok: true,
      data: {
        title: data.title,
        description: data.description,
        bodyText: data.bodyText?.slice(0, 10000),
        links: data.links?.slice(0, 200),
        images: data.images?.slice(0, 50),
        forms: data.forms?.slice(0, 10),
        techHints: data.techHints,
      },
    }
  } catch (e) {
    console.error("[stagehand-enrich] extract failed:", e)
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

interface StagehandFormResult {
  ok: boolean
  data?: {
    forms: Array<{ url: string; method: string; fields: Array<{ name: string; type: string; required: boolean }> }>
    totalForms: number
  }
  error?: string
}

export async function discoverForms(url: string): Promise<StagehandFormResult> {
  if (!url?.startsWith("http")) return { ok: false, error: "invalid url" }
  const apiUrl = stagehandUrl()
  const key = stagehandKey()
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (key) headers["Authorization"] = `Bearer ${key}`

  try {
    const res = await fetch(`${apiUrl}/discover-form`, {
      method: "POST",
      headers,
      body: JSON.stringify({ url, mode: "contact_form_discovery" }),
      signal: AbortSignal.timeout(90_000),
    })
    if (!res.ok) {
      return { ok: false, error: `Stagehand HTTP ${res.status}` }
    }
    const data = await res.json() as {
      formUrl?: string; forms?: Array<{ url: string; method: string; fields: Array<{ name: string; type: string; required: boolean }> }>;
    }
    const forms = data.forms ?? (data.formUrl ? [{ url: data.formUrl, method: "POST", fields: [] }] : [])
    return {
      ok: true,
      data: { forms, totalForms: forms.length },
    }
  } catch (e) {
    console.error("[stagehand-enrich] form discovery failed:", e)
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
