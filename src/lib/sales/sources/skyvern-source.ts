/**
 * Skyvern source module — AI browser automation for sales OS enrichment.
 *
 * Skyvern navigates prospect websites autonomously, extracts structured data,
 * and identifies conversion bottlenecks visible only through browser interaction.
 *
 * Role in pipeline:
 *  - Screenshot prospect homepage + key pages (replaces manual review)
 *  - Discover contact forms and test submission path
 *  - Detect broken CTAs, missing trust elements, layout issues
 *  - Extract competitor pricing / feature tables where publicly visible
 *
 * Runs via Skyvern API (self-hosted OSS on Coolify).
 */
import { envValue } from "../oss-service-health"

interface SkyvernResult {
  source: string
  ok: boolean
  data?: Record<string, unknown>
  error?: string
}

function skyvernBase(): string | null {
  return envValue("SKYVERN_BASE_URL")
}

function skyvernApiKey(): string | null {
  return envValue("SKYVERN_API_KEY")
}

async function skyvernFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const base = skyvernBase()
  if (!base) throw new Error("SKYVERN_BASE_URL is not configured")

  const apiKey = skyvernApiKey()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) ?? {}),
  }
  if (apiKey) headers["x-api-key"] = apiKey

  const url = `${base.replace(/\/+$/, "")}${path}`
  return fetch(url, { ...options, headers, signal: AbortSignal.timeout(60_000) })
}

/** Health check — called by oss-service-health.ts */
export async function checkSkyvernHealth(): Promise<{ ok: boolean; detail?: string }> {
  try {
    const res = await skyvernFetch("/api/v1/health")
    return { ok: res.ok, detail: `HTTP ${res.status}` }
  } catch (error) {
    return { ok: false, detail: String(error) }
  }
}

/** Capture a screenshot of a target URL via Skyvern */
export async function captureSkyvernScreenshot(targetUrl: string): Promise<SkyvernResult> {
  if (!targetUrl?.startsWith("http")) {
    return { source: "skyvern", ok: false, error: "invalid target URL" }
  }
  try {
    const res = await skyvernFetch("/api/v1/tasks", {
      method: "POST",
      body: JSON.stringify({
        url: targetUrl,
        navigation_goal: "Take a full-page screenshot of the homepage. Capture the hero section, navigation, and above-the-fold content.",
        data_extraction_goal: null,
        navigation_payload: null,
        max_steps: 3,
      }),
    })
    if (!res.ok) {
      return { source: "skyvern", ok: false, error: `Skyvern API HTTP ${res.status}` }
    }
    const data = await res.json() as { task_id?: string; status?: string }
    return {
      source: "skyvern",
      ok: true,
      data: {
        task_id: data.task_id,
        status: data.status,
        screenshot_queued: true,
      },
    }
  } catch (error) {
    console.error("[skyvern-source] screenshot capture failed:", error)
    return { source: "skyvern", ok: false, error: String(error) }
  }
}

/** Extract structured data from a prospect website via Skyvern */
export async function extractSkyvernSiteData(targetUrl: string): Promise<SkyvernResult> {
  if (!targetUrl?.startsWith("http")) {
    return { source: "skyvern", ok: false, error: "invalid target URL" }
  }
  try {
    const res = await skyvernFetch("/api/v1/tasks", {
      method: "POST",
      body: JSON.stringify({
        url: targetUrl,
        navigation_goal: null,
        data_extraction_goal: `Extract the following from the page:
1. Company name and tagline
2. Main services/products listed
3. Contact form fields (label names)
4. CTA buttons and their text
5. Social proof elements (testimonials, client logos, case study links)
6. Pricing information if visible
7. Trust indicators (certifications, awards, security badges)`,
        navigation_payload: null,
        max_steps: 5,
      }),
    })
    if (!res.ok) {
      return { source: "skyvern", ok: false, error: `Skyvern API HTTP ${res.status}` }
    }
    const data = await res.json() as { task_id?: string; extracted_data?: unknown; status?: string }
    return {
      source: "skyvern",
      ok: true,
      data: {
        task_id: data.task_id,
        extracted_data: data.extracted_data,
        status: data.status,
      },
    }
  } catch (error) {
    console.error("[skyvern-source] data extraction failed:", error)
    return { source: "skyvern", ok: false, error: String(error) }
  }
}

/** Discover forms on a site and check if they're functional */
export async function discoverSkyvernForms(targetUrl: string): Promise<SkyvernResult> {
  if (!targetUrl?.startsWith("http")) {
    return { source: "skyvern", ok: false, error: "invalid target URL" }
  }
  try {
    const res = await skyvernFetch("/api/v1/tasks", {
      method: "POST",
      body: JSON.stringify({
        url: targetUrl,
        navigation_goal: "Navigate the website and find all contact/ inquiry/ consultation forms. Note the page URL for each form, the number of fields, and whether the form appears functional.",
        data_extraction_goal: "For each form found, extract: page URL, form action URL, field count, field names, submit button text, and whether the form has CAPTCHA.",
        navigation_payload: null,
        max_steps: 8,
      }),
    })
    if (!res.ok) {
      return { source: "skyvern", ok: false, error: `Skyvern API HTTP ${res.status}` }
    }
    const data = await res.json() as { task_id?: string; extracted_data?: unknown; status?: string }
    return {
      source: "skyvern",
      ok: true,
      data: {
        task_id: data.task_id,
        forms: data.extracted_data,
        status: data.status,
      },
    }
  } catch (error) {
    console.error("[skyvern-source] form discovery failed:", error)
    return { source: "skyvern", ok: false, error: String(error) }
  }
}
