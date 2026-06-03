import type { SubmitFormInput, SubmitFormResult } from "./types"
import { HttpFormProvider } from "./http-form-provider"

export interface BrowserProvider {
  readonly name: string
  submitForm(input: SubmitFormInput): Promise<SubmitFormResult>
  discoverSpaForm?(homeUrl: string): Promise<string | null>
}

export class DryRunProvider implements BrowserProvider {
  readonly name = "dry"

  async submitForm(input: SubmitFormInput): Promise<SubmitFormResult> {
    return {
      ok: true,
      outcome: "uncertain",
      detail: `dry-run: provider=dry, no form was submitted (form=${input.formUrl}, chars=${input.message.length})`,
      evidenceUrl: null,
    }
  }
}

export class RemoteWorkerProvider implements BrowserProvider {
  readonly name = "remote"

  constructor(
    private readonly endpoint: string,
    private readonly secret: string,
  ) {}

  async submitForm(input: SubmitFormInput): Promise<SubmitFormResult> {
    try {
      const res = await fetch(`${this.endpoint}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Worker-Secret": this.secret,
        },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(input.timeoutMs ?? 120_000),
      })
      if (!res.ok) {
        const text = await res.text().catch((error) => {
          console.warn("[outreach-worker] failed to read error body:", error)
          return ""
        })
        return { ok: false, outcome: "failed", detail: `worker HTTP ${res.status}: ${text.slice(0, 200)}` }
      }
      return (await res.json()) as SubmitFormResult
    } catch (error) {
      return {
        ok: false,
        outcome: "failed",
        detail: `worker unreachable: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  async discoverSpaForm(homeUrl: string): Promise<string | null> {
    try {
      const res = await fetch(`${this.endpoint}/discover-spa`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Worker-Secret": this.secret },
        body: JSON.stringify({ homeUrl }),
        signal: AbortSignal.timeout(60_000),
      })
      if (!res.ok) return null
      const data = (await res.json()) as { formUrl?: string | null }
      return data.formUrl ?? null
    } catch (error) {
      console.warn("[outreach-worker] SPA discovery endpoint failed:", error)
      return null
    }
  }
}

export class StagehandProvider implements BrowserProvider {
  readonly name = "stagehand"

  constructor(
    private readonly endpoint: string,
    private readonly apiKey?: string,
  ) {}

  async submitForm(input: SubmitFormInput): Promise<SubmitFormResult> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`
      }
      const res = await fetch(`${this.endpoint}/submit`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          url: input.formUrl,
          fields: input.fields,
          message: input.message,
          dryRun: input.dryRun,
        }),
        signal: AbortSignal.timeout(input.timeoutMs ?? 180_000), // Stagehand AI is slower, give it 3 minutes
      })
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        return { ok: false, outcome: "failed", detail: `Stagehand HTTP ${res.status}: ${text.slice(0, 200)}` }
      }
      return (await res.json()) as SubmitFormResult
    } catch (error) {
      console.error("[outreach/stagehand-provider] submission failed:", error)
      return {
        ok: false,
        outcome: "failed",
        detail: `Stagehand unreachable: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }
}

export function getBrowserProvider(): BrowserProvider {
  const mode = process.env.OUTREACH_BROWSER_PROVIDER ?? "http"
  if (mode === "dry") return new DryRunProvider()
  if (mode === "stagehand") {
    const endpoint = process.env.STAGEHAND_URL
    const apiKey = process.env.STAGEHAND_API_KEY
    if (endpoint) return new StagehandProvider(endpoint, apiKey)
    console.warn("[outreach] OUTREACH_BROWSER_PROVIDER=stagehand but STAGEHAND_URL is missing; falling back to http")
  }
  if (mode === "remote") {
    const endpoint = process.env.OUTREACH_WORKER_URL
    const secret = process.env.OUTREACH_WORKER_SECRET
    if (endpoint && secret) return new RemoteWorkerProvider(endpoint, secret)
    console.warn("[outreach] OUTREACH_BROWSER_PROVIDER=remote but OUTREACH_WORKER_URL/SECRET is missing; using http")
  }
  return new HttpFormProvider()
}
