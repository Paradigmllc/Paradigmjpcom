#!/usr/bin/env node
import { readProductionEnvValue } from "./lib/coolify-env.mjs"

const baseUrl = (process.env.ARTIFACT_SMOKE_BASE_URL || "https://paradigmjp.com").replace(/\/$/, "")
const reportSlug = process.env.ARTIFACT_SMOKE_REPORT_SLUG || "ccbc-xynd21"
const demoSlug = process.env.ARTIFACT_SMOKE_DEMO_SLUG || `${reportSlug}-demo`
const adminPassword = await readProductionEnvValue("ADMIN_PASSWORD")

if (!adminPassword) {
  console.error("ARTIFACT_ADMIN_SMOKE failed: ADMIN_PASSWORD is unavailable")
  process.exit(1)
}

const cookie = `paradigm_admin_token=${encodeURIComponent(adminPassword)}`

async function expectOk(label, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      cookie,
      ...(options.headers || {}),
    },
  })
  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new Error(`${label} HTTP ${response.status}: ${body.slice(0, 160)}`)
  }
  return response
}

async function expectText(label, url, signature) {
  const response = await expectOk(label, url)
  const html = await response.text()
  if (!html.includes(signature)) throw new Error(`${label} missing ${signature}`)
}

await expectText("report admin page", `${baseUrl}/ja/report/${reportSlug}`, "診断レポート編集")
await expectText("demo admin page", `${baseUrl}/ja/demo/${demoSlug}`, "デモサイト編集")

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

console.log(`ARTIFACT_ADMIN_SMOKE ok report=${reportSlug} demo=${demoSlug}`)
