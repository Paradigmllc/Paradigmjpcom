import type { SubmitFormInput, SubmitFormResult } from "./types"
import { HttpFormProvider } from "./http-form-provider"
import {
  discoverWithCrawleeWorker,
} from "../sources/external-form-discovery"

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
      const res = await fetch(providerUrl(this.endpoint, "/submit"), {
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
      const res = await fetch(providerUrl(this.endpoint, "/discover-spa"), {
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
    private readonly apiKey: string,
  ) {}

  async submitForm(input: SubmitFormInput): Promise<SubmitFormResult> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      headers["Authorization"] = `Bearer ${this.apiKey}`
      const res = await fetch(providerUrl(this.endpoint, "/submit"), {
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

  async discoverSpaForm(homeUrl: string): Promise<string | null> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      }
      const res = await fetch(providerUrl(this.endpoint, "/discover-form"), {
        method: "POST",
        headers,
        body: JSON.stringify({ url: homeUrl, mode: "contact_form_discovery" }),
        signal: AbortSignal.timeout(90_000),
      })
      if (!res.ok) return null
      const data = (await res.json()) as { formUrl?: string | null; form_url?: string | null; url?: string | null }
      return data.formUrl ?? data.form_url ?? data.url ?? null
    } catch (error) {
      console.warn("[outreach/stagehand-provider] discovery failed:", error)
      return null
    }
  }
}

import { optionalEnv } from "@/lib/sales/japan-readiness-utils"

function providerUrl(endpoint: string, path: string): string {
  return `${endpoint.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`
}

function isKnownUnavailableEndpoint(endpoint: string | null): boolean {
  if (!endpoint) return true
  try {
    const host = new URL(endpoint).host.toLowerCase()
    return host === "stagehand.paradigmjp.com"
  } catch {
    return false
  }
}

function shouldEscalate(input: SubmitFormInput, providerName: string, result: SubmitFormResult): boolean {
  const detail = result.detail.toLowerCase()
  if (result.outcome === "submitted") return false
  if (providerName === "http" && input.dryRun && detail.includes("prepared")) return false
  if (providerName === "http" && detail.includes("post returned")) return false
  if (providerName === "http" && detail.includes("post ")) return false
  if (detail.includes("spa or client-rendered")) return true
  if (detail.includes("no fillable fields")) return true
  if (detail.includes("submit button was not found")) return true
  if (detail.includes("worker unreachable")) return true
  return false
}

function configuredRemoteProvider(): RemoteWorkerProvider | null {
  const endpoint = optionalEnv("OUTREACH_WORKER_URL") ?? optionalEnv("CRAWLEE_WORKER_URL")
  const secret = optionalEnv("OUTREACH_WORKER_SECRET") ?? optionalEnv("CRAWLEE_WORKER_SECRET")
  if (isKnownUnavailableEndpoint(endpoint)) return null
  return endpoint && secret ? new RemoteWorkerProvider(endpoint, secret) : null
}

function configuredStagehandProvider(): StagehandProvider | null {
  const endpoint = optionalEnv("STAGEHAND_URL")
  const apiKey = optionalEnv("STAGEHAND_API_KEY")
  if (isKnownUnavailableEndpoint(endpoint)) return null
  return endpoint && apiKey ? new StagehandProvider(endpoint, apiKey) : null
}

export class AutoBrowserProvider implements BrowserProvider {
  readonly name = "auto"

  private readonly http = new HttpFormProvider()
  private readonly remote = configuredRemoteProvider()
  private readonly stagehand = configuredStagehandProvider()

  async submitForm(input: SubmitFormInput): Promise<SubmitFormResult> {
    const attempts: Array<{ provider: string; result: SubmitFormResult }> = []
    const providers: BrowserProvider[] = [
      this.http,
      ...(this.remote ? [this.remote] : []),
      ...(this.stagehand ? [this.stagehand] : []),
    ]

    for (const provider of providers) {
      const result = await provider.submitForm(input)
      attempts.push({ provider: provider.name, result })
      if (!shouldEscalate(input, provider.name, result)) {
        return withAttemptTrace(result, attempts)
      }
    }

    const last = attempts[attempts.length - 1]?.result
    return withAttemptTrace(
      last ?? { ok: false, outcome: "failed", detail: "No outreach provider was available" },
      attempts,
    )
  }

  async discoverSpaForm(homeUrl: string): Promise<string | null> {
    if (this.remote) {
      const remoteUrl = await this.remote.discoverSpaForm(homeUrl)
      if (remoteUrl) return remoteUrl
    }

    const crawlee = await discoverWithCrawleeWorker({ origin: homeUrl, timeoutMs: 60_000 })
    if (crawlee?.formUrl) return crawlee.formUrl

    if (this.stagehand?.discoverSpaForm) return await this.stagehand.discoverSpaForm(homeUrl)
    return null
  }
}

function withAttemptTrace(result: SubmitFormResult, attempts: Array<{ provider: string; result: SubmitFormResult }>): SubmitFormResult {
  if (attempts.length <= 1) return result
  const trace = attempts.map((attempt) => `${attempt.provider}:${attempt.result.outcome}`).join(" -> ")
  return { ...result, detail: `${result.detail} [providers: ${trace}]` }
}

export function getBrowserProvider(): BrowserProvider {
  const mode = process.env.OUTREACH_BROWSER_PROVIDER ?? "auto"
  if (mode === "auto") return new AutoBrowserProvider()
  if (mode === "dry") return new DryRunProvider()
  if (mode === "stagehand") {
    const endpoint = optionalEnv("STAGEHAND_URL")
    const apiKey = optionalEnv("STAGEHAND_API_KEY")
    if (endpoint && apiKey && !isKnownUnavailableEndpoint(endpoint)) return new StagehandProvider(endpoint, apiKey)
    console.warn("[outreach] OUTREACH_BROWSER_PROVIDER=stagehand but STAGEHAND_URL/STAGEHAND_API_KEY is missing; falling back to http")
  }
  if (mode === "remote") {
    const endpoint = optionalEnv("OUTREACH_WORKER_URL")
    const secret = optionalEnv("OUTREACH_WORKER_SECRET")
    if (endpoint && secret && !isKnownUnavailableEndpoint(endpoint)) return new RemoteWorkerProvider(endpoint, secret)
    console.warn("[outreach] OUTREACH_BROWSER_PROVIDER=remote but OUTREACH_WORKER_URL/SECRET is missing; using http")
  }
  return new HttpFormProvider()
}
