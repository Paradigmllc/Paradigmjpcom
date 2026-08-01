#!/usr/bin/env node
import { readProductionEnvValue } from "./lib/coolify-env.mjs"

const baseUrl = (process.env.ARTIFACT_SMOKE_BASE_URL || "https://paradigmjp.com").replace(/\/$/, "")
const reportSlug = process.env.ARTIFACT_SMOKE_REPORT_SLUG || "airbnb"
const demoSlug = process.env.ARTIFACT_SMOKE_DEMO_SLUG || `${reportSlug}-demo`
const adminPassword = await readProductionEnvValue("ADMIN_PASSWORD")
const webhookSecret = await readProductionEnvValue("TRIGGER_WEBHOOK_SECRET")

if (!adminPassword && !webhookSecret) {
  console.error("ARTIFACT_ADMIN_SMOKE failed: ADMIN_PASSWORD/TRIGGER_WEBHOOK_SECRET unavailable")
  process.exit(1)
}

let authHeaders
if (adminPassword) {
  const login = await fetch(`${baseUrl}/api/admin`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "login", password: adminPassword }),
  })
  if (!login.ok) {
    throw new Error(`admin login HTTP ${login.status}`)
  }
  const setCookie = login.headers.get("set-cookie") ?? ""
  const cookie = setCookie.split(";")[0]
  if (!cookie) throw new Error("admin login did not return a session cookie")
  authHeaders = { cookie }
} else {
  authHeaders = { "x-webhook-secret": webhookSecret }
}

async function expectOk(label, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders,
      ...(options.headers || {}),
    },
  })
  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new Error(`${label} HTTP ${response.status}: ${body.slice(0, 160)}`)
  }
  return response
}

async function expectTextWithCookie(label, url, signature) {
  if (!adminPassword) return
  const response = await fetch(url, {
    headers: authHeaders,
  })
  if (!response.ok) throw new Error(`${label} HTTP ${response.status}`)
  const html = await response.text()
  if (!html.includes(signature)) throw new Error(`${label} missing ${signature}`)
}

await expectTextWithCookie("report admin page", `${baseUrl}/ja/report/${reportSlug}`, "診断レポート編集")
await expectTextWithCookie("demo admin page", `${baseUrl}/ja/demo/${demoSlug}`, "デモサイト編集")

await expectOk("report dry-run save", `${baseUrl}/api/sales/artifact-edits/report/${reportSlug}`, {
  method: "PATCH",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ dryRun: true, fields: { hook: "smoke" } }),
})

await expectOk("demo dry-run save", `${baseUrl}/api/sales/artifact-edits/demo/${demoSlug}`, {
  method: "PATCH",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ dryRun: true, fields: { homeTitle: "smoke" } }),
})

console.log(`ARTIFACT_ADMIN_SMOKE ok mode=${adminPassword ? "admin-cookie" : "webhook-dry-run"} report=${reportSlug} demo=${demoSlug}`)
