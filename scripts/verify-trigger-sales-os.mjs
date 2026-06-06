import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import dotenv from "dotenv"

const root = process.cwd()
dotenv.config({ path: path.join(root, ".env.local"), quiet: true })
dotenv.config({ path: path.join(root, ".env"), quiet: true })

const taskSource = path.join(root, "trigger", "sales-os.ts")
const configSource = path.join(root, "trigger.config.ts")

const expectedTasks = [
  "sales-os-pipeline",
  "sales-enrichment-runner",
  "post-outreach-router",
  "chatwoot-reply-router",
  "livekit-discovery-router",
  "sales-video-pipeline",
]

const envTaskMap = {
  TRIGGER_SALES_OS_PIPELINE_TASK_ID: "sales-os-pipeline",
  TRIGGER_SALES_ENRICHMENT_TASK_ID: "sales-enrichment-runner",
  TRIGGER_POST_OUTREACH_TASK_ID: "post-outreach-router",
  TRIGGER_CHATWOOT_REPLY_TASK_ID: "chatwoot-reply-router",
  TRIGGER_LIVEKIT_DISCOVERY_TASK_ID: "livekit-discovery-router",
  TRIGGER_VIDEO_PIPELINE_TASK_ID: "sales-video-pipeline",
}

function env(name) {
  const value = process.env[name]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function printStatus(label, ok, detail) {
  const prefix = ok ? "[OK]" : "[MISSING]"
  console.log(`${prefix} ${label}${detail ? ` - ${detail}` : ""}`)
}

function fail(message) {
  console.error(`[ERROR] ${message}`)
  process.exitCode = 1
}

printStatus("trigger.config.ts", fs.existsSync(configSource), "Trigger.dev config file")
printStatus("trigger/sales-os.ts", fs.existsSync(taskSource), "Sales OS task source")

if (!fs.existsSync(taskSource) || !fs.existsSync(configSource)) {
  fail("Trigger.dev task source is incomplete.")
  process.exit()
}

const source = fs.readFileSync(taskSource, "utf8")
for (const taskId of expectedTasks) {
  printStatus(`task:${taskId}`, source.includes(`id: "${taskId}"`), "defined in trigger/sales-os.ts")
  if (!source.includes(`id: "${taskId}"`)) fail(`Missing Trigger.dev task ${taskId}`)
}

for (const [name, defaultId] of Object.entries(envTaskMap)) {
  const value = env(name)
  printStatus(name, true, value ? `set to ${value}` : `unset; app default is ${defaultId}`)
}

const projectRef = env("TRIGGER_PROJECT_REF")
printStatus("TRIGGER_PROJECT_REF", Boolean(projectRef), projectRef ? "set" : "unset; trigger.config.ts uses repo fallback")

const secretName = ["TRIGGER_SECRET_KEY", "TRIGGER_ACCESS_TOKEN", "TRIGGER_DEV_API_KEY"].find((name) => env(name))
printStatus("Trigger.dev API key", Boolean(secretName), secretName ? `${secretName} is set` : "unset")

const deployToken = env("TRIGGER_ACCESS_TOKEN")
const hasDeployToken = Boolean(deployToken?.startsWith("tr_pat_"))
printStatus(
  "Trigger.dev deploy token",
  true,
  hasDeployToken
    ? "TRIGGER_ACCESS_TOKEN is a PAT and can deploy tasks non-interactively"
    : "not set; task deploy requires CLI login or a tr_pat_ TRIGGER_ACCESS_TOKEN",
)

if (!secretName) {
  fail("Trigger.dev cloud cannot be verified or deployed until one API key env is set.")
  process.exit()
}

const apiUrl = (env("TRIGGER_API_URL") ?? "https://api.trigger.dev").replace(/\/+$/, "")
const url = `${apiUrl}/api/v1/runs?limit=1`

try {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${env(secretName)}` },
    signal: AbortSignal.timeout(10_000),
  })
  printStatus("Trigger.dev API auth", res.ok, `HTTP ${res.status}`)
  if (!res.ok) {
    fail("Trigger.dev API authentication failed.")
    process.exit()
  }
  if (!hasDeployToken) {
    console.warn("[WARN] Remote task deployment cannot be verified by the secret-key runs API. Use `trigger.dev deploy` after CLI login or set a tr_pat_ TRIGGER_ACCESS_TOKEN.")
  }
} catch (error) {
  fail(`Trigger.dev API verification failed: ${error instanceof Error ? error.message : String(error)}`)
}
