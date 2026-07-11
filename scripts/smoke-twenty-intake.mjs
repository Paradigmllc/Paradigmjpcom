import path from "node:path"
import process from "node:process"
import dotenv from "dotenv"
import { readProductionEnvValue } from "./lib/coolify-env.mjs"

const root = process.cwd()
dotenv.config({ path: path.join(root, ".env.local"), quiet: true })
dotenv.config({ path: path.join(root, ".env"), quiet: true })

function env(name) {
  const value = process.env[name]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function argValue(name, fallback = null) {
  const prefix = `--${name}=`
  const hit = process.argv.slice(2).find((arg) => arg.startsWith(prefix))
  return hit ? hit.slice(prefix.length) : fallback
}

function boolArg(name, fallback) {
  const raw = argValue(name)
  if (raw === null) return fallback
  return raw === "1" || raw === "true" || raw === "yes"
}

function fail(message) {
  console.error(`[ERROR] ${message}`)
  process.exit(1)
}

const baseUrl = (argValue("base-url", env("NEXT_PUBLIC_SITE_URL") ?? "https://paradigmjp.com") ?? "").replace(/\/+$/, "")
const limit = Math.max(1, Math.min(Number(argValue("limit", "5")), 50))
const dryRun = boolArg("dry-run", true)
const dispatchPipeline = boolArg("dispatch-pipeline", false)

if (!baseUrl) fail("base URL is empty")

const localSecret = env("TRIGGER_WEBHOOK_SECRET")
const productionSecret = await readProductionEnvValue("TRIGGER_WEBHOOK_SECRET").catch((error) => {
  console.error("[smoke-twenty-intake] failed to read production webhook secret:", error)
  return null
})
const isLocalBaseUrl = /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::|\/|$)/.test(baseUrl)
const secret = isLocalBaseUrl ? localSecret ?? productionSecret : productionSecret ?? localSecret

if (!secret) fail("TRIGGER_WEBHOOK_SECRET is not configured in local env or readable Coolify envs")

const res = await fetch(`${baseUrl}/api/sales/twenty/pull`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Webhook-Secret": secret,
  },
  body: JSON.stringify({
    limit,
    dry_run: dryRun,
    auto_run_pipeline: true,
    dispatch_pipeline: dispatchPipeline,
  }),
  signal: AbortSignal.timeout(30_000),
})

const text = await res.text()
let data = null
try {
  data = text ? JSON.parse(text) : null
} catch (error) {
  console.error("[smoke-twenty-intake] invalid JSON response:", error)
}

if (!res.ok || !data?.ok) {
  console.error(`[ERROR] Twenty intake smoke failed: HTTP ${res.status}`)
  if (data?.error) console.error(`[ERROR] ${data.error}`)
  else console.error(text.slice(0, 500))
  process.exit(1)
}

console.log("[OK] Twenty intake endpoint")
console.log(
  JSON.stringify(
    {
      baseUrl,
      dryRun,
      scanned: data.scanned,
      created: data.created,
      updated: data.updated,
      skipped: data.skipped,
      pipelineRunsCreated: data.pipelineRunsCreated,
      pipelineRunsDispatched: data.pipelineRunsDispatched,
      pipelineRunsReused: data.pipelineRunsReused,
      failures: Array.isArray(data.failures) ? data.failures.length : 0,
    },
    null,
    2,
  ),
)
