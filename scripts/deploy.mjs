#!/usr/bin/env node
/**
 * deploy.mjs — Coolify 直接 deploy（GitHub Actions 不使用）
 *
 * 使用法:
 *   node scripts/deploy.mjs              # git push → Coolify deploy 実行 → 完了までポーリング
 *   node scripts/deploy.mjs --dry        # dry-run: deploy せずに確認のみ
 *   node scripts/deploy.mjs --no-wait    # deploy キューだけしてポーリングしない
 *
 * 環境変数 (必須):
 *   COOLIFY_API_TOKEN — Coolify API token
 *
 * 環境変数 (任意):
 *   COOLIFY_API_URL    — default: https://coolify.appexx.me
 *   PARADIGM_APP_UUID  — default: i12am4vvcbggefnqdizhnv9a
 */

const DRY = process.argv.includes("--dry")
const NO_WAIT = process.argv.includes("--no-wait")

const TOKEN = process.env.COOLIFY_API_TOKEN
if (!TOKEN) {
  console.error("❌ COOLIFY_API_TOKEN is not set")
  process.exit(1)
}

const BASE = process.env.COOLIFY_API_URL || "https://coolify.appexx.me"
const APP_UUID = process.env.PARADIGM_APP_UUID || "i12am4vvcbggefnqdizhnv9a"
const GH_REPO = "https://github.com/Paradigmllc/Paradigmjpcom"

async function api(path, options = {}) {
  const url = `${BASE}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Coolify API ${res.status}: ${text.substring(0, 200)}`)
  }
  return res.json()
}

async function run() {
  console.log("🚀 paradigmjp.com deploy via Coolify API")

  // 1. Sync git_repository
  console.log("  → Syncing git_repository to Coolify...")
  try {
    await api(`/api/v1/applications/${APP_UUID}`, {
      method: "PATCH",
      body: JSON.stringify({ git_repository: GH_REPO }),
    })
    console.log("  ✓ git_repository synced")
  } catch (e) {
    console.warn("  ⚠ git_repository sync skipped:", e.message)
  }

  if (DRY) {
    console.log("  → --dry: skipping deploy")
    return
  }

  // 2. Trigger deploy
  console.log("  → Triggering deploy...")
  const deployResp = await api(
    `/api/v1/deploy?uuid=${APP_UUID}&force=true`,
    { method: "POST" }
  )

  const deployments = deployResp?.deployments || []
  if (deployments.length === 0) {
    console.error("  ❌ No deployment UUID in response")
    process.exit(1)
  }

  const deployUuid = deployments[0].deployment_uuid
  console.log(`  ✓ Deployment queued: ${deployUuid}`)

  if (NO_WAIT) {
    console.log("  → --no-wait: skipping poll")
    return
  }

  // 3. Poll until done
  console.log("  → Polling deployment status...")
  for (let i = 1; i <= 60; i++) {
    await new Promise((r) => setTimeout(r, 15000))
    try {
      const status = await api(`/api/v1/deployments/${deployUuid}`)
      const s = status?.status || "unknown"
      console.log(`  [${i}/60] status: ${s}`)
      if (s === "finished" || s === "running:healthy") {
        console.log("  ✅ Deploy succeeded")
        return
      }
      if (s === "failed" || s === "error" || s === "cancelled") {
        console.error(`  ❌ Deploy failed: ${JSON.stringify(status).substring(0, 500)}`)
        process.exit(1)
      }
    } catch (e) {
      console.warn(`  ⚠ Poll error: ${e.message}`)
    }
  }
  console.error("  ❌ Deploy timed out after 15 minutes")
  process.exit(1)
}

run()