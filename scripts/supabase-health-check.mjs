#!/usr/bin/env node
/**
 * supabase-health-check.mjs — Supabase プロジェクト状態確認・自動復旧・migration 適用
 *
 * 使用法:
 *   node scripts/supabase-health-check.mjs                    # ヘルスチェックのみ
 *   node scripts/supabase-health-check.mjs --migrate          # ヘルスチェック + migration 適用
 *   node scripts/supabase-health-check.mjs --restore          # プロジェクト復旧試行 (PAT 必要)
 *   node scripts/supabase-health-check.mjs --all              # 全チェック + 復旧 + migration
 *
 * 環境変数:
 *   SUPABASE_PROJECT_ID      — default: yihdmgtxiqfdgdueolub
 *   SUPABASE_SERVICE_ROLE_KEY — 必須（Data API + SQL 用）
 *   SUPABASE_PAT             — Supabase Management API 用 Personal Access Token（復旧時必須）
 *   COOLIFY_API_TOKEN        — Coolify API token
 *   PARADIGM_APP_UUID        — default: i12am4vvcbggefnqdizhnv9a
 */

const PROJECT_ID = process.env.SUPABASE_PROJECT_ID || "yihdmgtxiqfdgdueolub"
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PAT = process.env.SUPABASE_PAT
const COOLIFY_TOKEN = process.env.COOLIFY_API_TOKEN
const APP_UUID = process.env.PARADIGM_APP_UUID || "i12am4vvcbggefnqdizhnv9a"

const MGMT_API = "https://api.supabase.com"
const DATA_API = `https://${PROJECT_ID}.supabase.co`
const COOLIFY_API = process.env.COOLIFY_API_URL || "https://coolify.appexx.me"

const MIGRATE = process.argv.includes("--migrate") || process.argv.includes("--all")
const RESTORE = process.argv.includes("--restore") || process.argv.includes("--all")

function mask(s, show = 8) {
  if (!s || s.length <= show * 2) return s ? s.substring(0, show) + "..." : "(missing)"
  return s.substring(0, show) + "..." + s.substring(s.length - show)
}

async function checkServiceRoleKey() {
  if (!SERVICE_ROLE_KEY) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY is not set")
    return false
  }
  console.log("  ✓ SUPABASE_SERVICE_ROLE_KEY:", mask(SERVICE_ROLE_KEY))
  return true
}

// 1. Supabase Management API → プロジェクト状態
async function checkProjectStatus() {
  if (!PAT) {
    console.warn("  ⚠ SUPABASE_PAT not set — skipping Management API check")
    return { ok: false, status: "unknown", reason: "no PAT" }
  }
  try {
    const res = await fetch(`${MGMT_API}/v1/projects/${PROJECT_ID}`, {
      headers: { Authorization: `Bearer ${PAT}` },
    })
    if (!res.ok) {
      const body = await res.text()
      console.error(`  ❌ Management API: HTTP ${res.status}: ${body.substring(0, 200)}`)
      return { ok: false, status: "api_error", reason: body.substring(0, 100) }
    }
    const data = await res.json()
    const status = data.status || data.health || "unknown"
    console.log(`  ✓ Project status: ${status}`)
    return { ok: status === "ACTIVE_HEALTHY", status, data }
  } catch (e) {
    console.error(`  ❌ Management API error: ${e.message}`)
    return { ok: false, status: "network_error", reason: e.message }
  }
}

// 2. Supabase Data API → DB 接続テスト
async function checkDataApi() {
  if (!SERVICE_ROLE_KEY) return { ok: false, reason: "no key" }
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(`${DATA_API}/rest/v1/?limit=0`, {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      signal: controller.signal,
    })
    clearTimeout(timer)
    console.log(`  ✓ Data API: HTTP ${res.status}`)
    return { ok: res.status === 200, status: res.status }
  } catch (e) {
    console.error(`  ❌ Data API error: ${e.message}`)
    return { ok: false, reason: e.message }
  }
}

// 3. Pooler TCP 接続テスト (Transaction mode port 6543)
async function checkPoolerTcp() {
  const poolerHost = `aws-0-ap-southeast-1.pooler.supabase.com`
  const poolerPortTx = 6543 // Transaction mode (recommended)
  const poolerPortSession = 5432 // Session mode (deprecated for serverless)
  const results = {}
  try {
    await new Promise((resolve, reject) => {
      const net = require("net")
      const socket = net.createConnection({ host: poolerHost, port: poolerPortTx }, () => {
        console.log(`  ✓ Pooler TCP (Transaction/port ${poolerPortTx}): ${poolerHost}:${poolerPortTx} OK`)
        socket.destroy()
        resolve()
      })
      socket.on("error", (e) => {
        console.warn(`  ⚠ Pooler TCP (Transaction/port ${poolerPortTx}): ${e.message}`)
        socket.destroy()
        resolve() // Don't reject — session port may work
      })
      setTimeout(() => {
        socket.destroy()
        console.warn(`  ⚠ Pooler TCP (Transaction/port ${poolerPortTx}): timeout`)
        resolve()
      }, 5000)
    })
    results.tx = { ok: true, port: poolerPortTx }
  } catch (e) {
    results.tx = { ok: false, reason: e.message }
  }

  try {
    await new Promise((resolve, reject) => {
      const net = require("net")
      const socket = net.createConnection({ host: poolerHost, port: poolerPortSession }, () => {
        console.log(`  ⚠ Pooler TCP (Session/port ${poolerPortSession}): reachable — recommend switching to port ${poolerPortTx}`)
        socket.destroy()
        resolve()
      })
      socket.on("error", (e) => {
        console.log(`  - Pooler TCP (Session/port ${poolerPortSession}): ${e.message}`)
        socket.destroy()
        resolve()
      })
      setTimeout(() => {
        socket.destroy()
        resolve()
      }, 5000)
    })
    results.session = { ok: true, port: poolerPortSession }
  } catch (e) {
    results.session = { ok: false, reason: e.message }
  }

  return results
}

// 4. SQL migration 実行
async function runMigration(sqlContent, label) {
  if (!SERVICE_ROLE_KEY) return { ok: false, reason: "no key" }
  try {
    // Supabase の REST RPC 経由で SQL 実行を試みる
    // 注: exec_sql は Supabase ではデフォルト無効。有効化が必要。
    const res = await fetch(`${DATA_API}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sqlContent }),
    })
    if (res.ok) {
      console.log(`  ✓ Migration ${label}: OK`)
      return { ok: true }
    }
    const body = await res.text()
    // exec_sql が有効でない場合、Management API 経由を試みる
    if (res.status === 404 && PAT) {
      console.log(`  → exec_sql not available, trying Management API...`)
      const mgmtRes = await fetch(
        `${MGMT_API}/v1/projects/${PROJECT_ID}/database/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${PAT}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: sqlContent }),
        }
      )
      if (mgmtRes.ok) {
        console.log(`  ✓ Migration ${label} via Management API: OK`)
        return { ok: true }
      }
      const mgmtBody = await mgmtRes.text()
      console.error(`  ❌ Migration ${label} via Management API failed: ${mgmtBody.substring(0, 300)}`)
      return { ok: false, reason: mgmtBody.substring(0, 200) }
    }
    console.error(`  ❌ Migration ${label}: HTTP ${res.status}: ${body.substring(0, 300)}`)
    return { ok: false, reason: body.substring(0, 200) }
  } catch (e) {
    console.error(`  ❌ Migration ${label} error: ${e.message}`)
    return { ok: false, reason: e.message }
  }
}

// 5. プロジェクト復旧試行
async function restoreProject() {
  if (!PAT) {
    console.warn("  ⚠ SUPABASE_PAT not set — cannot restore project")
    return { ok: false, reason: "no PAT" }
  }
  try {
    // Supabase プロジェクトの復旧（paused → active）
    const res = await fetch(
      `${MGMT_API}/v1/projects/${PROJECT_ID}/restore`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAT}`,
          "Content-Type": "application/json",
        },
      }
    )
    const body = await res.text()
    if (res.ok) {
      console.log("  ✓ Project restore triggered")
      return { ok: true }
    }
    console.error(`  ❌ Project restore: HTTP ${res.status}: ${body.substring(0, 300)}`)
    return { ok: false, reason: body.substring(0, 200) }
  } catch (e) {
    console.error(`  ❌ Restore error: ${e.message}`)
    return { ok: false, reason: e.message }
  }
}

// メイン
async function main() {
  console.log("🔍 Supabase Health Check")
  console.log(`  Project: ${PROJECT_ID}`)
  console.log(`  Pooler: aws-0-ap-southeast-1.pooler.supabase.com:6543`)
  console.log()

  const results = {}

  // キー確認
  console.log("── Keys ──")
  results.hasServiceRole = await checkServiceRoleKey()
  console.log(`  PAT: ${PAT ? "✓ " + mask(PAT) : "⚠ not set"}`)
  console.log()

  // 接続テスト
  console.log("── Connectivity ──")
  results.dataApi = await checkDataApi()
  results.pooler = await checkPoolerTcp()
  console.log()

  // プロジェクト状態
  console.log("── Project Status ──")
  results.project = await checkProjectStatus()
  console.log()

  // 復旧（必要な場合）
  if (RESTORE && results.project && !results.project.ok && results.project.status !== "api_error") {
    console.log("── Restore ──")
    results.restore = await restoreProject()
    console.log()
  }

  // Migration 適用
  if (MIGRATE) {
    console.log("── Migrations ──")
    
    const fs = require("fs")
    const path = require("path")
    const supabaseDir = path.join(__dirname, "..", "supabase")

    const migrations = [
      { file: "migration_008_sales_country_locale_templates.sql", label: "008 (sales routing)" },
      { file: "migration_010_legacy_cleanup.sql", label: "010 (legacy locale drop)" },
      { file: "migration_011_legacy_settings_cleanup.sql", label: "011 (legacy settings drop)" },
      { file: "migration_022_sales_content_templates.sql", label: "022 (sales content templates)" },
    ]

    for (const m of migrations) {
      const filePath = path.join(supabaseDir, m.file)
      if (!fs.existsSync(filePath)) {
        console.log(`  ⚠ ${m.label}: file not found — ${fieldPath}`)
        continue
      }
      const sql = fs.readFileSync(filePath, "utf8")
      results[`migration_${m.label}`] = await runMigration(sql, m.label)
    }
    console.log()
  }

  // サマリー
  console.log("── Summary ──")
  const checks = Object.entries(results)
  let ok = 0
  let fail = 0
  for (const [name, result] of checks) {
    if (name === "pooler" && result && typeof result === "object") {
      const poolerResult = result
      if (poolerResult.tx?.ok) {
        ok++
        console.log(`  ✓ pooler-tx (port 6543 Transaction mode)`)
      } else {
        fail++
        console.log(`  ❌ pooler-tx: ${poolerResult.tx?.reason || "unreachable"}`)
      }
      if (poolerResult.session?.ok) {
        console.log(`  ⚠ pooler-session (port 5432): reachable but NOT recommended for serverless`)
      }
      continue
    }
    if (result && result.ok) {
      ok++
    } else {
      fail++
      console.log(`  ❌ ${name}: ${result?.reason || "failed"}`)
    }
  }
  console.log(`  ${ok} OK, ${fail} failed`)

  if (fail > 0) {
    console.log()
    console.log("🔧 Recommended actions:")
    if (results.dataApi && !results.dataApi.ok) {
      console.log("  1. Supabase Dashboard → プロジェクトが paused なら Resume")
      console.log("      https://supabase.com/dashboard/project/yihdmgtxiqfdgdueolub")
    }
    if (results.project && !results.project.ok && !PAT) {
      console.log("  2. SUPABASE_PAT を設定して --restore で自動復旧")
      console.log("      Supabase Dashboard → Settings → Access Token で PAT 発行")
    }
    if (results.hasServiceRole === false) {
      console.log("  3. Coolify で SUPABASE_SERVICE_ROLE_KEY を確認")
      console.log(`      ${COOLIFY_API}/applications/${APP_UUID}`)
    }
    if (results.pooler && typeof results.pooler === "object") {
      if (results.pooler.session?.ok && !results.pooler.tx?.ok) {
        console.log("  4. Transaction mode pooler (port 6543) is unreachable")
        console.log("      Supabase Dashboard → Settings → Database → enable Connection Pooling port 6543")
      }
      if (results.pooler.session?.ok) {
        console.log("  5. DATABASE_URI is using Session mode (port 5432) — switch to port 6543")
        console.log("      Coolify env DATABASE_URI: change port 5432 → 6543")
      }
    }
  }

  process.exit(fail > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error("Unexpected error:", e)
  process.exit(1)
})
