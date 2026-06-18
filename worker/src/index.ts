/**
 * Minimal HTTP server used by Next.js RemoteWorkerProvider.
 *
 * Endpoints:
 * - GET /health
 * - POST /submit       with X-Worker-Secret
 * - POST /screenshot   with X-Worker-Secret
 * - POST /discover-spa with X-Worker-Secret
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { submitForm, type SubmitInput } from "./submit.js"
import { discoverSpaForm } from "./discover-spa.js"
import { captureScreenshot, type ScreenshotInput } from "./screenshot.js"
import { closeBrowser } from "./browser.js"
import {
  discoverFormWithStagehand,
  getStagehandReadiness,
  submitFormWithStagehand,
  type StagehandSubmitInput,
} from "./stagehand.js"

const SECRET = process.env.WORKER_SECRET ?? ""
const PORT = Number(process.env.PORT ?? 8080)
const MAX_CONCURRENT = Number(process.env.MAX_CONCURRENT_BROWSERS ?? 2)

class ConcurrencyLimiter {
  private activeCount = 0
  private queue: Array<() => void> = []

  constructor(private readonly maxConcurrent: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.activeCount >= this.maxConcurrent) {
      await new Promise<void>((resolve) => this.queue.push(resolve))
    }
    this.activeCount++
    try {
      return await fn()
    } finally {
      this.activeCount--
      const next = this.queue.shift()
      if (next) next()
    }
  }
}

const limiter = new ConcurrencyLimiter(MAX_CONCURRENT)

function send(res: ServerResponse, code: number, obj: unknown): void {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8" })
  res.end(JSON.stringify(obj))
}

async function readJson<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = []
  for await (const c of req) chunks.push(c as Buffer)
  const raw = Buffer.concat(chunks).toString("utf8")
  return (raw ? JSON.parse(raw) : {}) as T
}

function bearerToken(req: IncomingMessage): string | null {
  const value = req.headers.authorization
  if (!value) return null
  const match = value.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() ?? null
}

function authorized(req: IncomingMessage): boolean {
  return req.headers["x-worker-secret"] === SECRET || bearerToken(req) === SECRET
}

function isStagehandSubmitInput(body: SubmitInput | StagehandSubmitInput): body is StagehandSubmitInput {
  return "url" in body && typeof body.url === "string"
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") {
      const stagehand = getStagehandReadiness()
      return send(res, stagehand.ok ? 200 : 503, {
        ok: stagehand.ok,
        provider: stagehand.mode,
        stagehand,
      })
    }
    if (!SECRET) return send(res, 503, { ok: false, error: "WORKER_SECRET not configured" })
    if (!authorized(req)) {
      return send(res, 401, { ok: false, error: "unauthorized" })
    }

    if (req.method === "POST" && req.url === "/submit") {
      const body = await readJson<SubmitInput | StagehandSubmitInput>(req)
      if (isStagehandSubmitInput(body)) {
        if (!body.url) return send(res, 400, { ok: false, error: "url required" })
        const result = await limiter.run(() => submitFormWithStagehand(body))
        return send(res, 200, result)
      }
      if (!body.formUrl) return send(res, 400, { ok: false, error: "formUrl required" })
      const result = await limiter.run(() => submitForm(body))
      return send(res, 200, result)
    }

    if (req.method === "POST" && req.url === "/discover-form") {
      const body = await readJson<{ url?: string }>(req)
      if (!body.url) return send(res, 400, { ok: false, error: "url required" })
      const targetUrl = body.url
      const formUrl = await limiter.run(() => discoverFormWithStagehand({ url: targetUrl, mode: "contact_form_discovery" }))
      return send(res, 200, { ok: true, formUrl })
    }

    if (req.method === "POST" && req.url === "/screenshot") {
      const body = await readJson<ScreenshotInput>(req)
      if (!body.url) return send(res, 400, { ok: false, error: "url required" })
      const result = await limiter.run(() => captureScreenshot(body))
      return send(res, result.ok ? 200 : 502, result)
    }

    if (req.method === "POST" && req.url === "/discover-spa") {
      const body = await readJson<{ homeUrl?: string }>(req)
      if (!body.homeUrl) return send(res, 400, { ok: false, error: "homeUrl required" })
      const homeUrl = body.homeUrl
      const formUrl = await limiter.run(() => discoverSpaForm(homeUrl))
      return send(res, 200, { ok: true, formUrl })
    }

    send(res, 404, { ok: false, error: "not found" })
  } catch (e) {
    console.error("[worker] handler error:", e)
    send(res, 500, { ok: false, error: e instanceof Error ? e.message : String(e) })
  }
})

server.listen(PORT, () => console.log(`[worker] outreach browser worker listening on :${PORT} (max concurrent: ${MAX_CONCURRENT})`))

async function shutdown(): Promise<void> {
  await closeBrowser().catch((error) => {
    console.error("[worker] browser shutdown failed:", error)
  })
  server.close(() => process.exit(0))
}

process.on("SIGTERM", shutdown)
process.on("SIGINT", shutdown)
