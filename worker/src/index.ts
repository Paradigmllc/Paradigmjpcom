/**
 * Minimal HTTP server used by Next.js RemoteWorkerProvider.
 *
 * Endpoints:
 * - GET /health
 * - POST /submit       with X-Worker-Secret
 * - POST /discover-spa with X-Worker-Secret
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { submitForm, type SubmitInput } from "./submit.js"
import { discoverSpaForm } from "./discover-spa.js"
import { closeBrowser } from "./browser.js"

const SECRET = process.env.WORKER_SECRET ?? ""
const PORT = Number(process.env.PORT ?? 8080)

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

const server = createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") {
      return send(res, 200, { ok: true, provider: process.env.CDP_ENDPOINT ? "remote-cdp" : "local-chromium" })
    }
    if (!SECRET) return send(res, 503, { ok: false, error: "WORKER_SECRET not configured" })
    if (req.headers["x-worker-secret"] !== SECRET) {
      return send(res, 401, { ok: false, error: "unauthorized" })
    }

    if (req.method === "POST" && req.url === "/submit") {
      const body = await readJson<SubmitInput>(req)
      if (!body.formUrl) return send(res, 400, { ok: false, error: "formUrl required" })
      const result = await submitForm(body)
      return send(res, 200, result)
    }

    if (req.method === "POST" && req.url === "/discover-spa") {
      const body = await readJson<{ homeUrl?: string }>(req)
      if (!body.homeUrl) return send(res, 400, { ok: false, error: "homeUrl required" })
      const formUrl = await discoverSpaForm(body.homeUrl)
      return send(res, 200, { ok: true, formUrl })
    }

    send(res, 404, { ok: false, error: "not found" })
  } catch (e) {
    console.error("[worker] handler error:", e)
    send(res, 500, { ok: false, error: e instanceof Error ? e.message : String(e) })
  }
})

server.listen(PORT, () => console.log(`[worker] outreach browser worker listening on :${PORT}`))

async function shutdown(): Promise<void> {
  await closeBrowser().catch((error) => {
    console.error("[worker] browser shutdown failed:", error)
  })
  server.close(() => process.exit(0))
}

process.on("SIGTERM", shutdown)
process.on("SIGINT", shutdown)
