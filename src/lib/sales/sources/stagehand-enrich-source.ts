/**
 * stagehand-enrich-source.ts — Stagehand AI browser enrichment (SDK in-process)
 *
 * Uses Stagehand OSS directly as an SDK within the Node.js process.
 * No separate Docker service needed — runs headless Chromium in-app.
 *
 * Falls back gracefully if Playwright/Stagehand not installed.
 */
import { envValue } from "../oss-service-health"

let _stagehandModule: any = null

async function getStagehand() {
  if (_stagehandModule) return _stagehandModule
  try {
    const mod = await import("@browserbasehq/stagehand")
    _stagehandModule = mod
    return mod
  } catch {
    console.warn("[stagehand-enrich] @browserbasehq/stagehand not installed — using fallback")
    return null
  }
}

export async function checkStagehandEnrichHealth(): Promise<{ ok: boolean; detail: string }> {
  try {
    const mod = await getStagehand()
    return { ok: !!mod, detail: mod ? "Stagehand SDK available" : "Stagehand SDK not installed" }
  } catch (e) {
    return { ok: false, detail: `SDK error: ${e instanceof Error ? e.message : String(e)}` }
  }
}

interface StagehandExtractResult {
  ok: boolean
  data?: {
    title?: string
    description?: string
    bodyText?: string
    links?: string[]
    forms?: Array<{ action?: string; method?: string; fields?: Array<{ name: string; type: string }> }>
  }
  error?: string
}

export async function extractSiteData(url: string): Promise<StagehandExtractResult> {
  if (!url?.startsWith("http")) return { ok: false, error: "invalid url" }
  try {
    const mod = await getStagehand()
    if (!mod) return { ok: false, error: "Stagehand SDK not available" }

    const stagehand = new mod.Stagehand({
      env: "LOCAL",
      headless: true,
      logger: () => {},
    })
    await stagehand.init()
    await stagehand.page.goto(url, { waitUntil: "networkidle", timeout: 30000 })

    const title = await stagehand.page.title()
    const bodyText = await stagehand.page.evaluate(() => document.body.innerText.slice(0, 10000))
    const links = await stagehand.page.evaluate(() =>
      Array.from(document.querySelectorAll("a[href]")).map(a => (a as HTMLAnchorElement).href).slice(0, 200)
    )
    const forms = await stagehand.page.evaluate(() =>
      Array.from(document.querySelectorAll("form")).map(f => ({
        action: (f as HTMLFormElement).action || "",
        method: (f as HTMLFormElement).method || "GET",
        fields: Array.from(f.querySelectorAll("input,textarea,select")).map(el => ({
          name: (el as HTMLInputElement).name || "",
          type: (el as HTMLInputElement).type || "text",
        })),
      })).slice(0, 10)
    )
    const description = await stagehand.page.evaluate(() =>
      (document.querySelector('meta[name="description"]') as HTMLMetaElement)?.content || ""
    )

    await stagehand.close()

    return {
      ok: true,
      data: { title, description, bodyText, links, forms },
    }
  } catch (e) {
    console.error("[stagehand-enrich] extract failed:", e)
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

interface StagehandFormResult {
  ok: boolean
  data?: { forms: Array<{ url: string; method: string; fields: Array<{ name: string; type: string; required: boolean }> }>; totalForms: number }
  error?: string
}

export async function discoverForms(url: string): Promise<StagehandFormResult> {
  if (!url?.startsWith("http")) return { ok: false, error: "invalid url" }
  try {
    const mod = await getStagehand()
    if (!mod) return { ok: false, error: "Stagehand SDK not available" }

    const stagehand = new mod.Stagehand({
      env: "LOCAL",
      headless: true,
      logger: () => {},
    })
    await stagehand.init()
    await stagehand.page.goto(url, { waitUntil: "networkidle", timeout: 30000 })

    const forms = await stagehand.page.evaluate(() =>
      Array.from(document.querySelectorAll("form")).map(f => ({
        url: (f as HTMLFormElement).action || window.location.href,
        method: (f as HTMLFormElement).method || "POST",
        fields: Array.from(f.querySelectorAll("input,textarea,select")).map(el => ({
          name: (el as HTMLInputElement).name || "",
          type: (el as HTMLInputElement).type || "text",
          required: (el as HTMLInputElement).required || false,
        })),
      })).slice(0, 10)
    )

    await stagehand.close()

    return { ok: true, data: { forms, totalForms: forms.length } }
  } catch (e) {
    console.error("[stagehand-enrich] form discovery failed:", e)
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
