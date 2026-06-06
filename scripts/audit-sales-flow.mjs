/**
 * scripts/audit-sales-flow.mjs — 営業フロー E2E 監査 (デプロイ後・本番/staging 用)
 *
 * デプロイ済みエンドポイントを叩いて「一連の営業フロー」が動くか検証する。
 * ローカルからは秘密鍵が無いため実行できない (本番 env を持つ環境で実行)。
 *
 * 使い方:
 *   BASE_URL=https://paradigmjp.com \
 *   TRIGGER_WEBHOOK_SECRET=xxxxx \
 *   node scripts/audit-sales-flow.mjs
 *
 * 検証項目:
 *   1. /api/sales/outreach/run  (dryRun=true) — ④フォーム営業の判定パイプライン
 *   2. /api/sales/kpi-snapshot — ⑤進捗 KPI 集計
 *   3. /api/sales/weekly-digest — Slack 週次ダイジェスト (任意)
 *
 * dryRun=true なので実送信は一切行わない (安全)。
 */

import { readProductionEnvValue } from "./lib/coolify-env.mjs"

const BASE_URL = process.env.BASE_URL ?? "https://paradigmjp.com"

async function post(path, body) {
  const secret =
    process.env.TRIGGER_WEBHOOK_SECRET ??
    process.env.N8N_WEBHOOK_SECRET ??
    (await readProductionEnvValue("TRIGGER_WEBHOOK_SECRET").catch(() => null)) ??
    (await readProductionEnvValue("N8N_WEBHOOK_SECRET").catch(() => null))
  if (!secret) {
    return {
      status: 0,
      json: {
        ok: false,
        error: "TRIGGER_WEBHOOK_SECRET is not configured in env or readable Coolify application envs",
      },
    }
  }
  const headers = { "Content-Type": "application/json", "X-Webhook-Secret": secret }
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, json }
}

async function main() {
  console.log(`🔍 営業フロー E2E 監査 → ${BASE_URL}\n`)
  let ok = true

  // 1) ④フォーム営業 (dryRun・実送信なし)
  console.log("① /api/sales/outreach/run (dryRun=true, limit=3)")
  const outreach = await post("/api/sales/outreach/run", { region: "jp", limit: 3, dryRun: true })
  console.log(`   → ${outreach.status} processed=${outreach.json.processed} submitted=${outreach.json.submitted} manualQueue=${outreach.json.manualQueue} skipped=${outreach.json.skipped} failed=${outreach.json.failed}`)
  if (outreach.status !== 200) ok = false
  for (const item of outreach.json.items ?? []) {
    console.log(`     - ${item.domain}: ${item.finalStage} (${item.reason})`)
  }

  // 2) ⑤ KPI スナップショット
  console.log("\n② /api/sales/kpi-snapshot")
  const kpi = await post("/api/sales/kpi-snapshot", {})
  console.log(`   → ${kpi.status} ${JSON.stringify(kpi.json.snapshot ?? kpi.json)}`)
  if (kpi.status !== 200) ok = false

  // 3) 週次ダイジェスト (任意・存在すれば)
  console.log("\n③ /api/sales/weekly-digest")
  const digest = await post("/api/sales/weekly-digest", {})
  console.log(`   → ${digest.status} ${digest.status === 200 ? "ok" : JSON.stringify(digest.json)}`)

  console.log(`\n${ok ? "✅ 監査 PASS" : "❌ 監査 FAIL"}`)
  process.exit(ok ? 0 : 1)
}

main().catch((e) => {
  console.error("監査スクリプト異常:", e)
  process.exit(1)
})
