import { createServer } from "node:http"
import { readFile } from "node:fs/promises"
import { extname, join, normalize } from "node:path"
import { fileURLToPath } from "node:url"

const rootDir = fileURLToPath(new URL("..", import.meta.url))
const publicDir = join(rootDir, "public")

function optionalEnv(name) {
  const value = process.env[name]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function requiredEnv(name) {
  const value = optionalEnv(name)
  if (value) return value
  console.error(`[sales-pipeline-container] ${name} is not configured`)
  return null
}

const port = Number(optionalEnv("PORT") ?? "8090")
const secret = optionalEnv("SALES_PIPELINE_CONTAINER_SECRET")

const stepPlan = [
  { key: "twenty_csv_intake", ownerTool: "twenty_or_csv", required: true },
  { key: "supabase_normalize", ownerTool: "supabase", required: true },
  { key: "karte_generate", ownerTool: "supabase_dify", required: true },
  { key: "report_generate", ownerTool: "nextjs_reports", required: true },
  { key: "video_generate", ownerTool: "trigger_dev_video", required: false },
  { key: "r2_manifest", ownerTool: "cloudflare_r2", required: true },
  { key: "external_studio_sync", ownerTool: "directus_keystatic", required: false },
  { key: "twenty_writeback", ownerTool: "twenty", required: true },
  { key: "outreach_preflight", ownerTool: "sales_outreach", required: true },
  { key: "outreach_send", ownerTool: "sales_outreach", required: true },
  { key: "reply_capture", ownerTool: "chatwoot_livekit", required: false },
  { key: "follow_up_queue", ownerTool: "operator_queue", required: false },
]

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  })
  res.end(JSON.stringify(payload))
}

function bearerToken(req) {
  const value = req.headers.authorization
  if (!value) return null
  const match = value.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() ?? null
}

function authorized(req) {
  return Boolean(secret) && (req.headers["x-pipeline-secret"] === secret || bearerToken(req) === secret)
}

async function readJson(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString("utf8")
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch (error) {
    console.error("[sales-pipeline-container] invalid json:", error)
    throw new Error("invalid JSON body")
  }
}

function supabaseConfig() {
  const url = requiredEnv("SALES_SUPABASE_URL")
  const key = requiredEnv("SALES_SUPABASE_SERVICE_ROLE_KEY")
  if (!url || !key) return null
  return { url: url.replace(/\/+$/, ""), key }
}

async function postgrest(path, init = {}) {
  const config = supabaseConfig()
  if (!config) {
    throw new Error("Sales Supabase is not configured")
  }
  const headers = {
    apikey: config.key,
    authorization: `Bearer ${config.key}`,
    "content-type": "application/json",
    ...init.headers,
  }
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    headers,
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`PostgREST ${response.status}: ${text.slice(0, 400)}`)
  }
  if (!text) return { data: null, response }
  return { data: JSON.parse(text), response }
}

async function countRows(table, query = "select=id") {
  const { response } = await postgrest(`${table}?${query}`, {
    method: "GET",
    headers: {
      prefer: "count=exact",
      range: "0-0",
    },
  })
  const range = response.headers.get("content-range")
  const total = range?.split("/").at(1)
  return total && /^\d+$/.test(total) ? Number(total) : 0
}

function parseLimit(searchParams, fallback = 20, max = 100) {
  const parsed = Number(searchParams.get("limit"))
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(Math.floor(parsed), max)
}

function cleanText(value, maxLength = 120) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
}

function booleanValue(value, fallback) {
  if (typeof value === "boolean") return value
  return fallback
}

async function summaryHandler(res) {
  const [candidates, scored, promoted, runsQueued, runsRunning, runsFailed, acquisitionRunning] = await Promise.all([
    countRows("sales_lead_candidate_domains"),
    countRows("sales_lead_candidate_domains", "select=id&status=eq.scored"),
    countRows("sales_lead_candidate_domains", "select=id&status=eq.promoted"),
    countRows("sales_pipeline_runs", "select=id&status=eq.queued"),
    countRows("sales_pipeline_runs", "select=id&status=eq.running"),
    countRows("sales_pipeline_runs", "select=id&status=eq.failed"),
    countRows("sales_lead_candidate_runs", "select=id&status=in.(queued,running,partial)"),
  ])
  sendJson(res, 200, {
    ok: true,
    summary: {
      candidates,
      scored,
      promoted,
      pipelineQueued: runsQueued,
      pipelineRunning: runsRunning,
      pipelineFailed: runsFailed,
      acquisitionRunning,
    },
  })
}

async function candidatesHandler(reqUrl, res) {
  const limit = parseLimit(reqUrl.searchParams, 25, 100)
  const lane = cleanText(reqUrl.searchParams.get("lane"))
  const status = cleanText(reqUrl.searchParams.get("status"))
  const filters = [
    "select=id,domain,root_url,lane,source_slug,status,company_id,observation_count,last_seen_at,created_at,updated_at,meta",
    `order=updated_at.desc`,
    `limit=${limit}`,
  ]
  if (lane) filters.push(`lane=eq.${encodeURIComponent(lane)}`)
  if (status) filters.push(`status=eq.${encodeURIComponent(status)}`)
  const { data } = await postgrest(`sales_lead_candidate_domains?${filters.join("&")}`)
  sendJson(res, 200, { ok: true, candidates: Array.isArray(data) ? data : [] })
}

async function acquisitionRunsHandler(reqUrl, res) {
  const limit = parseLimit(reqUrl.searchParams, 20, 80)
  const { data } = await postgrest(
    `sales_lead_candidate_runs?select=id,source_slug,lane,country_code,technology,status,requested_limit,verify_limit,promote,fetched_count,upserted_count,verified_count,scored_count,promoted_count,jobs_enqueued_count,failure_count,errors,created_at,updated_at,heartbeat_at&order=created_at.desc&limit=${limit}`,
  )
  sendJson(res, 200, { ok: true, runs: Array.isArray(data) ? data : [] })
}

async function pipelineRunsHandler(reqUrl, res) {
  const limit = parseLimit(reqUrl.searchParams, 20, 80)
  const { data } = await postgrest(
    `sales_pipeline_runs?select=id,company_id,source,status,current_step,trigger_provider,trigger_task_id,trigger_run_id,requested_by,require_video,auto_sync_external_studios,input_payload,result_payload,error_message,started_at,completed_at,created_at,updated_at&order=created_at.desc&limit=${limit}`,
  )
  const runs = Array.isArray(data) ? data : []
  const runIds = runs.map((run) => run.id).filter(Boolean)
  let steps = []
  if (runIds.length > 0) {
    const quoted = runIds.map((id) => `"${String(id).replaceAll('"', "")}"`).join(",")
    const result = await postgrest(
      `sales_pipeline_steps?select=id,run_id,step_key,position,status,required,owner_tool,error_message,created_at,updated_at&run_id=in.(${quoted})&order=position.asc`,
    )
    steps = Array.isArray(result.data) ? result.data : []
  }
  const stepsByRun = new Map()
  for (const step of steps) {
    const list = stepsByRun.get(step.run_id) ?? []
    list.push(step)
    stepsByRun.set(step.run_id, list)
  }
  sendJson(res, 200, {
    ok: true,
    runs: runs.map((run) => ({ ...run, steps: stepsByRun.get(run.id) ?? [] })),
  })
}

async function createPipelineRunHandler(req, res) {
  const body = await readJson(req)
  const companyId = cleanText(body.companyId, 80)
  if (!/^[0-9a-f-]{32,36}$/i.test(companyId)) {
    sendJson(res, 400, { ok: false, error: "valid companyId is required" })
    return
  }
  const requireVideo = booleanValue(body.requireVideo, false)
  const autoSyncExternalStudios = booleanValue(body.autoSyncExternalStudios, true)
  const requestedBy = cleanText(body.requestedBy, 80) || "sales-pipeline-container"
  const source = cleanText(body.source, 40) || "manual"
  const validSources = new Set(["sales_os", "twenty", "twenty_csv_intake", "csv", "manual", "webhook", "batch"])
  if (!validSources.has(source)) {
    sendJson(res, 400, { ok: false, error: "source is invalid" })
    return
  }

  const payload = body.payload && typeof body.payload === "object" && !Array.isArray(body.payload) ? body.payload : {}
  const currentStep = stepPlan[0]?.key ?? null
  const { data } = await postgrest("sales_pipeline_runs?select=*", {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({
      company_id: companyId,
      source,
      status: "queued",
      current_step: currentStep,
      trigger_provider: "manual",
      requested_by: requestedBy,
      require_video: requireVideo,
      auto_sync_external_studios: autoSyncExternalStudios,
      input_payload: {
        ...payload,
        created_by_container: true,
      },
    }),
  })
  const run = Array.isArray(data) ? data[0] : null
  if (!run?.id) {
    throw new Error("pipeline run insert returned no id")
  }

  const steps = stepPlan.map((step, index) => ({
    run_id: run.id,
    company_id: companyId,
    step_key: step.key,
    position: index + 1,
    status: step.required ? "queued" : "skipped",
    required:
      step.key === "video_generate"
        ? requireVideo
        : step.key === "external_studio_sync"
          ? autoSyncExternalStudios
          : step.required,
    owner_tool: step.ownerTool,
    input_payload: {},
    output_payload: {},
  }))

  await postgrest("sales_pipeline_steps", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify(steps),
  })

  sendJson(res, 201, { ok: true, run })
}

async function serveStatic(reqUrl, res) {
  const requested = reqUrl.pathname === "/" ? "/index.html" : reqUrl.pathname
  const safePath = normalize(decodeURIComponent(requested)).replace(/^(\.\.[/\\])+/, "")
  const filePath = join(publicDir, safePath)
  if (!filePath.startsWith(publicDir)) {
    sendJson(res, 403, { ok: false, error: "forbidden" })
    return
  }
  const content = await readFile(filePath)
  const contentType = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
  }[extname(filePath)] ?? "application/octet-stream"
  res.writeHead(200, { "content-type": contentType, "cache-control": "no-store" })
  res.end(content)
}

const server = createServer(async (req, res) => {
  const reqUrl = new URL(req.url ?? "/", "http://127.0.0.1")
  try {
    if (req.method === "GET" && reqUrl.pathname === "/health") {
      const configured = Boolean(secret && optionalEnv("SALES_SUPABASE_URL") && optionalEnv("SALES_SUPABASE_SERVICE_ROLE_KEY"))
      sendJson(res, configured ? 200 : 503, {
        ok: configured,
        service: "sales-pipeline-container",
        configured,
        publicBase: optionalEnv("PARADIGMJP_PUBLIC_BASE"),
        twentyBase: optionalEnv("TWENTY_BASE_URL"),
      })
      return
    }

    if (reqUrl.pathname.startsWith("/api/")) {
      if (!secret) {
        sendJson(res, 503, { ok: false, error: "SALES_PIPELINE_CONTAINER_SECRET is not configured" })
        return
      }
      if (!authorized(req)) {
        sendJson(res, 401, { ok: false, error: "unauthorized" })
        return
      }
      if (req.method === "GET" && reqUrl.pathname === "/api/summary") return summaryHandler(res)
      if (req.method === "GET" && reqUrl.pathname === "/api/candidates") return candidatesHandler(reqUrl, res)
      if (req.method === "GET" && reqUrl.pathname === "/api/acquisition-runs") return acquisitionRunsHandler(reqUrl, res)
      if (req.method === "GET" && reqUrl.pathname === "/api/pipeline-runs") return pipelineRunsHandler(reqUrl, res)
      if (req.method === "POST" && reqUrl.pathname === "/api/pipeline-runs") return createPipelineRunHandler(req, res)
      sendJson(res, 404, { ok: false, error: "not found" })
      return
    }

    if (req.method === "GET") {
      await serveStatic(reqUrl, res)
      return
    }

    sendJson(res, 405, { ok: false, error: "method not allowed" })
  } catch (error) {
    console.error("[sales-pipeline-container] request failed:", error)
    sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
  }
})

server.listen(port, "0.0.0.0", () => {
  console.warn(`[sales-pipeline-container] listening on :${port}`)
})
