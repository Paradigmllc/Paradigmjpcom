#!/usr/bin/env node
/**
 * scripts/audit-sales-os.mjs — Sprint 11/12 本番運用 End-to-End 監査
 *
 * 役割: Sales OS API/LP/DB を一気通貫でチェックし pass/fail を colorized 出力.
 *
 * 使い方:
 *   AUDIT_BASE=https://paradigmjp.com \
 *   AUDIT_WEBHOOK_SECRET=$N8N_WEBHOOK_SECRET \
 *   AUDIT_TEST_COMPANY_ID=00335ac8-fe51-40bb-bd00-b5b018b6d4e3 \
 *   AUDIT_DOMAIN=example.com \
 *   node scripts/audit-sales-os.mjs
 *
 * 終了コード: 0 = 全 pass / 1 = 1 件以上 fail
 */

import { readProductionEnvValue } from "./lib/coolify-env.mjs"

const BASE = process.env.AUDIT_BASE ?? "https://paradigmjp.com"
let SECRET = process.env.AUDIT_WEBHOOK_SECRET ?? process.env.N8N_WEBHOOK_SECRET ?? ""
// Sprint 13: slug ベース URL に切替 (旧 UUID ID は backward compat に track-view でのみ使用)
const TEST_SLUG = process.env.AUDIT_TEST_SLUG ?? "izakaya-en"
const TEST_DOMAIN = process.env.AUDIT_DOMAIN ?? "example.com"

const C = {
  pass: "\x1b[32m✓\x1b[0m",
  fail: "\x1b[31m✗\x1b[0m",
  warn: "\x1b[33m⚠\x1b[0m",
  info: "\x1b[36m·\x1b[0m",
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
}

let pass = 0
let fail = 0
let warn = 0

function logCheck(ok, name, detail = "") {
  if (ok === true) {
    console.log(`${C.pass} ${C.bold(name)} ${C.dim(detail)}`)
    pass++
  } else if (ok === "warn") {
    console.log(`${C.warn} ${C.bold(name)} ${C.dim(detail)}`)
    warn++
  } else {
    console.log(`${C.fail} ${C.bold(name)} ${C.dim(detail)}`)
    fail++
  }
}

async function checkGet(name, path, expectStatus = 200, opts = {}) {
  try {
    const url = `${BASE}${path}`
    const res = await fetch(url, {
      method: "GET",
      headers: opts.headers ?? {},
      signal: AbortSignal.timeout(30_000),
    })
    const ok = res.status === expectStatus
    logCheck(ok, name, `${res.status} ${url}`)
    return ok
  } catch (e) {
    logCheck(false, name, e.message)
    return false
  }
}

async function checkPost(name, path, body, expectStatus = 200, opts = {}) {
  try {
    const url = `${BASE}${path}`
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(opts.headers ?? {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(120_000),
    })
    const ok = res.status === expectStatus
    let detail = `${res.status} ${url}`
    if (!ok) {
      const text = await res.text().catch(() => "")
      detail += ` :: ${text.slice(0, 150)}`
    }
    logCheck(ok, name, detail)
    return ok
  } catch (e) {
    logCheck(false, name, e.message)
    return false
  }
}

async function main() {
  if (!SECRET) {
    SECRET = (await readProductionEnvValue("N8N_WEBHOOK_SECRET").catch(() => null)) ?? ""
  }

  console.log(C.bold("\n🔍 Sales OS End-to-End 監査"))
  console.log(C.dim(`Base: ${BASE}`))
  console.log(C.dim(`Test slug: ${TEST_SLUG}`))
  console.log(C.dim(`Test domain: ${TEST_DOMAIN}`))
  console.log()

  /* Layer 1: 公開 LP */
  console.log(C.bold("Layer 1: 公開 LP (200 必須)"))
  await checkGet("HP root /ja", "/ja", 200)
  await checkGet("Video LP", "/ja/video", 200)
  await checkGet("Agency LP", "/ja/agency", 200)
  await checkGet(`Report LP /ja/report/${TEST_SLUG}`, `/ja/report/${TEST_SLUG}`, 200)
  await checkGet("OG dynamic image", `/ja/report/${TEST_SLUG}/opengraph-image`, 200)
  console.log()

  /* Layer 2: 公開 API (no-auth) */
  console.log(C.bold("Layer 2: 公開 API"))
  await checkGet("Track view pixel (by slug)", `/api/sales/track-view?slug=${TEST_SLUG}`, 200)
  console.log()

  /* Layer 3: Webhook-protected API (X-Webhook-Secret 必須) */
  console.log(C.bold("Layer 3: Webhook API (X-Webhook-Secret 認証)"))
  if (!SECRET) {
    console.log(`  ${C.warn} AUDIT_WEBHOOK_SECRET 未設定・Layer 3 skip`)
    warn++
  } else {
    const authHeaders = { "X-Webhook-Secret": SECRET }
    await checkPost(
      "Scan API (no secret = 401)",
      `/api/sales/scan/${TEST_DOMAIN}`,
      null,
      401,
    )
    await checkPost(
      "Scan API (with secret = 200)",
      `/api/sales/scan/${TEST_DOMAIN}`,
      null,
      200,
      { headers: authHeaders },
    )
    await checkPost(
      "Weekly digest (no secret = 401)",
      "/api/sales/weekly-digest",
      null,
      401,
    )
    await checkPost(
      "Weekly digest (with secret = 200)",
      "/api/sales/weekly-digest",
      null,
      200,
      { headers: authHeaders },
    )
  }
  console.log()

  /* Layer 4: 営業 OS = PayloadCMS admin と同じログインで統合 */
  console.log(C.bold("Layer 4: 営業 OS 統合管理画面"))
  await checkGet("Sales command center /ja/admin/sales", "/ja/admin/sales", 200)
  await checkGet("Template workbench", "/ja/admin/sales?tab=templates", 200)
  await checkGet("Video pipeline workbench", "/ja/admin/sales?tab=videoPipeline", 200)
  console.log()

  /* サマリ */
  console.log()
  console.log(C.bold("─".repeat(60)))
  console.log(`${C.bold("結果")}: ${C.pass} ${pass} pass / ${C.warn} ${warn} warn / ${C.fail} ${fail} fail`)

  if (fail > 0) {
    console.log(`\n${C.bold("⚠️ 失敗あり — 本番リリース前に修正必要")}`)
    process.exit(1)
  } else {
    console.log(`\n${C.bold("✅ 全 pass — Sales OS 本番運用可能")}`)
    process.exit(0)
  }
}

main().catch((e) => {
  console.error("FATAL:", e.message)
  process.exit(1)
})
