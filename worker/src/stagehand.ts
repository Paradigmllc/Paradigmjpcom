import { Stagehand } from "@browserbasehq/stagehand"
import { z } from "zod"
import type { SubmitResult } from "./submit.js"

export interface StagehandSubmitInput {
  url: string
  fields: Record<string, string>
  message: string
  dryRun: boolean
  timeoutMs?: number
}

export interface StagehandDiscoveryInput {
  url: string
  mode?: string
}

interface StagehandReadiness {
  ok: boolean
  mode: "browserbase" | "local-cdp" | "local-chromium"
  model: string | null
  missing: string[]
}

function optionalEnv(name: string): string | null {
  const value = process.env[name]
  return value && value.trim().length > 0 ? value.trim() : null
}

function steelCdpEndpoint(): string | null {
  const cdpEndpoint = optionalEnv("CDP_ENDPOINT")
  if (cdpEndpoint) return cdpEndpoint

  const steelBaseUrl = optionalEnv("STEEL_BASE_URL")
  if (!steelBaseUrl) return null

  try {
    const url = new URL(steelBaseUrl)
    url.protocol = "ws:"
    url.port = "9223"
    return url.toString()
  } catch (error) {
    console.warn("[worker/stagehand] invalid STEEL_BASE_URL:", error)
    return null
  }
}

function llmConfig(): { apiKey: string | null; baseURL?: string; modelName: string } {
  const explicitKey = optionalEnv("STAGEHAND_LLM_API_KEY")
  const openAiKey = optionalEnv("OPENAI_API_KEY")
  const deepSeekKey = optionalEnv("DEEPSEEK_API_KEY")
  const apiKey = explicitKey ?? openAiKey ?? deepSeekKey
  const baseURL =
    optionalEnv("STAGEHAND_LLM_BASE_URL") ??
    optionalEnv("OPENAI_BASE_URL") ??
    optionalEnv("DEEPSEEK_BASE_URL") ??
    (apiKey && apiKey === deepSeekKey ? "https://api.deepseek.com" : undefined)
  const modelName =
    optionalEnv("STAGEHAND_MODEL") ??
    (apiKey && apiKey === deepSeekKey ? "deepseek-chat" : "gpt-4.1-mini")
  return { apiKey, baseURL, modelName }
}

export function getStagehandReadiness(): StagehandReadiness {
  const cdp = optionalEnv("CDP_ENDPOINT") ?? steelCdpEndpoint()
  const browserbaseKey = optionalEnv("BROWSERBASE_API_KEY")
  const { apiKey, modelName } = llmConfig()
  const missing = [
    ...(apiKey ? [] : ["STAGEHAND_LLM_API_KEY or OPENAI_API_KEY or DEEPSEEK_API_KEY"]),
    ...(!browserbaseKey && !cdp ? ["BROWSERBASE_API_KEY or CDP_ENDPOINT/STEEL_BASE_URL"] : []),
  ]
  return {
    ok: missing.length === 0,
    mode: browserbaseKey ? "browserbase" : cdp ? "local-cdp" : "local-chromium",
    model: apiKey ? modelName : null,
    missing,
  }
}

async function withStagehand<T>(fn: (stagehand: Stagehand) => Promise<T>): Promise<T> {
  const readiness = getStagehandReadiness()
  if (!readiness.ok) {
    throw new Error(`Stagehand is not configured: ${readiness.missing.join(", ")}`)
  }

  const cdp = optionalEnv("CDP_ENDPOINT") ?? steelCdpEndpoint()
  const browserbaseKey = optionalEnv("BROWSERBASE_API_KEY")
  const browserbaseProjectId = optionalEnv("BROWSERBASE_PROJECT_ID")
  const { apiKey, baseURL, modelName } = llmConfig()

  const stagehand = new Stagehand({
    env: browserbaseKey ? "BROWSERBASE" : "LOCAL",
    ...(browserbaseKey ? { apiKey: browserbaseKey } : {}),
    ...(browserbaseProjectId ? { projectId: browserbaseProjectId } : {}),
    disablePino: true,
    verbose: 0,
    model: {
      modelName,
      apiKey: apiKey ?? undefined,
      ...(baseURL ? { baseURL } : {}),
    },
    ...(cdp
      ? {
          localBrowserLaunchOptions: {
            cdpUrl: cdp,
            connectTimeoutMs: Number(process.env.STAGEHAND_CONNECT_TIMEOUT_MS ?? 30_000),
            viewport: { width: 1280, height: 800 },
          },
        }
      : {
          localBrowserLaunchOptions: {
            headless: true,
            chromiumSandbox: false,
            args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
            viewport: { width: 1280, height: 800 },
          },
        }),
  })

  await stagehand.init()
  try {
    return await fn(stagehand)
  } finally {
    await stagehand.close().catch((error) => {
      console.error("[worker/stagehand] close failed:", error)
    })
  }
}

export async function discoverFormWithStagehand(input: StagehandDiscoveryInput): Promise<string | null> {
  const schema = z.object({
    formUrl: z.string().url().nullable(),
    confidence: z.number().min(0).max(1).optional(),
  })

  return withStagehand(async (stagehand) => {
    const page = stagehand.context.pages()[0] ?? (await stagehand.context.newPage())
    await page.goto(input.url, { waitUntil: "domcontentloaded", timeoutMs: Number(process.env.STAGEHAND_NAV_TIMEOUT_MS ?? 45_000) })
    const extracted = await stagehand.extract(
      "Find the best contact, inquiry, demo request, or consultation form URL for this company website. Return null if there is no safe contact form URL.",
      schema,
    )
    return extracted.formUrl
  })
}

export async function submitFormWithStagehand(input: StagehandSubmitInput): Promise<SubmitResult> {
  try {
    return await withStagehand(async (stagehand) => {
      const page = stagehand.context.pages()[0] ?? (await stagehand.context.newPage())
      await page.goto(input.url, { waitUntil: "domcontentloaded", timeoutMs: input.timeoutMs ?? 60_000 })

      const fields = Object.entries(input.fields)
        .filter(([, value]) => value.trim().length > 0)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n")
      await stagehand.act(
        [
          "Fill this contact form using the provided business outreach data.",
          "Do not invent required values. Do not bypass CAPTCHA, login, payment, or anti-bot challenges.",
          "If a CAPTCHA or challenge appears, stop and leave the form for manual review.",
          `Fields:\n${fields}`,
          `Message:\n${input.message}`,
        ].join("\n\n"),
        { timeout: input.timeoutMs ?? 90_000 },
      )

      if (input.dryRun) {
        return { ok: true, outcome: "uncertain", detail: "stagehand dry-run: form was filled but not submitted." }
      }

      await stagehand.act(
        "Submit the contact form only if there is no CAPTCHA, payment, login, or anti-bot challenge. Stop if the page asks for manual verification.",
        { timeout: input.timeoutMs ?? 90_000 },
      )
      return { ok: true, outcome: "uncertain", detail: "stagehand submitted or attempted submission; manual confirmation may be required." }
    })
  } catch (error) {
    return {
      ok: false,
      outcome: "failed",
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}
