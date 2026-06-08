#!/usr/bin/env node
/**
 * setup-trigger-oss.mjs — Coolify API 経由で Trigger.dev OSS を新 Droplet にデプロイ
 *
 * 使用法:
 *   node scripts/setup-trigger-oss.mjs
 *
 * 事前準備:
 *   1. Coolify 管理画面で新サーバー（Droplet 4vCPU/8GB+, Ubuntu 22.04+）を追加
 *   2. サーバーに Docker がインストールされていることを確認
 *   3. サーバー UUID をこのスクリプトの SERVER_UUID に設定
 *   4. COOLIFY_API_TOKEN を環境変数に設定
 *
 * このスクリプトが行うこと:
 *   1. シークレット生成（SESSION_SECRET, MAGIC_LINK_SECRET, etc.）
 *   2. レジストリ htpasswd ファイル生成
 *   3. Trigger.dev OSS docker-compose を Coolify にデプロイ
 *   4. 初期セットアップ手順を表示
 */

import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import crypto from "node:crypto"

const ROOT = path.resolve(import.meta.dirname, "..")

// ── Configuration ──
const COOLIFY_API_URL = process.env.COOLIFY_API_URL || "https://coolify.appexx.me"
const PROJECT_UUID = "okgoks4gwkg0o04csso0s0wg"
const SERVER_UUID = process.env.TRIGGER_SERVER_UUID || "" // Set this!
const DOMAIN = process.env.TRIGGER_DOMAIN || "trigger.paradigmjp.com"

async function main() {
  console.log("🚀 Trigger.dev OSS self-hosting setup\n")

  // 0. Auth check
  const token = process.env.COOLIFY_API_TOKEN
  if (!token) {
    console.error("❌ COOLIFY_API_TOKEN is not set")
    process.exit(1)
  }
  if (!SERVER_UUID) {
    console.error("❌ TRIGGER_SERVER_UUID is not set")
    console.error("   Set it to the UUID of the Coolify server that will host Trigger.dev OSS")
    console.error("   Run: $env:TRIGGER_SERVER_UUID='<uuid>' (PowerShell)")
    process.exit(1)
  }

  // 1. Generate secrets
  console.log("🔐 Generating secrets...")
  const secrets = {
    SESSION_SECRET: crypto.randomBytes(16).toString("hex"),
    MAGIC_LINK_SECRET: crypto.randomBytes(16).toString("hex"),
    ENCRYPTION_KEY: crypto.randomBytes(16).toString("hex"),
    MANAGED_WORKER_SECRET: crypto.randomBytes(16).toString("hex"),
    POSTGRES_PASSWORD: crypto.randomBytes(32).toString("hex"),
    CLICKHOUSE_PASSWORD: crypto.randomBytes(16).toString("hex"),
    MINIO_ROOT_USER: "trigger-admin",
    MINIO_ROOT_PASSWORD: crypto.randomBytes(24).toString("hex"),
  }
  console.log("  ✓ Secrets generated")

  // 2. Generate registry htpasswd
  console.log("🔑 Generating registry credentials...")
  const registryUser = process.env.REGISTRY_USER || "trigger-deploy"
  const registryPass = crypto.randomBytes(16).toString("hex")
  const htpasswdFile = path.join(ROOT, "trigger-registry-auth.htpasswd")

  try {
    execSync(
      `docker run --rm --entrypoint htpasswd httpd:2 -Bbn "${registryUser}" "${registryPass}"`,
      { encoding: "utf8", stdio: "pipe", timeout: 30_000 },
    )
  } catch {
    console.error("  ⚠ docker not available for htpasswd generation")
    console.error("     Run this manually after Docker is available:")
    console.error(`     docker run --rm --entrypoint htpasswd httpd:2 -Bbn "${registryUser}" "${registryPass}" > trigger-registry-auth.htpasswd`)
  }
  console.log(`  ✓ Registry user: ${registryUser}`)

  // 3. Build env variables for the compose file
  console.log("🔧 Building compose environment...")
  const composeEnv = {
    APP_ORIGIN: `https://${DOMAIN}`,
    LOGIN_ORIGIN: `https://${DOMAIN}`,
    API_ORIGIN: `https://${DOMAIN}`,
    ...secrets,
    POSTGRES_USER: "postgres",
    POSTGRES_DB: "postgres",
    CLICKHOUSE_USER: "default",
    DOCKER_REGISTRY_URL: `localhost:5000`,
    DOCKER_REGISTRY_USERNAME: registryUser,
    DOCKER_REGISTRY_PASSWORD: registryPass,
    DOCKER_REGISTRY_NAMESPACE: "trigger",
    TRIGGER_IMAGE_TAG: "v4-beta",
    WEBAPP_PUBLISH_IP: "0.0.0.0",
  }

  // 4. Read compose file
  const composePath = path.join(ROOT, "docker-compose.trigger-oss.yml")
  if (!fs.existsSync(composePath)) {
    console.error(`❌ ${composePath} not found`)
    process.exit(1)
  }
  const composeRaw = fs.readFileSync(composePath, "utf8")

  // 5. Check for existing service
  console.log("\n📋 Checking Coolify services...")
  const existing = await coolifyApi("/api/v1/services", token)
  const existingTrigger = Array.isArray(existing)
    ? existing.find((s) => s.name === "paradigm-trigger-oss")
    : null

  if (existingTrigger) {
    console.log(`  ✓ Service already exists: ${existingTrigger.uuid}`)
    console.log(`    Status: ${existingTrigger.status || "unknown"}`)
    console.log(`    URL: https://coolify.appexx.me/project/${PROJECT_UUID}/services`)
    printPostDeployInstructions(composeEnv, registryUser, registryPass)
    return
  }

  // 6. Create service via Coolify API
  console.log("  → Creating Trigger.dev OSS service...")
  const body = {
    type: "docker-compose",
    name: "paradigm-trigger-oss",
    project_uuid: PROJECT_UUID,
    server_uuid: SERVER_UUID,
    environment_name: "production",
    description: `Trigger.dev OSS self-hosted orchestrator (${DOMAIN}) — Sales OS pipeline runner`,
    docker_compose_raw: composeRaw,
  }

  try {
    const result = await coolifyApi("/api/v1/services", token, {
      method: "POST",
      body: JSON.stringify(body),
    })
    console.log(`  ✓ Service created: ${result.uuid}`)
    console.log(`  → Configure domain in Coolify UI: ${DOMAIN} → port 8030`)
    printPostDeployInstructions(composeEnv, registryUser, registryPass)
  } catch (e) {
    console.error(`  ❌ API creation failed: ${e.message}`)
    console.log()
    console.log("🔧 Manual setup:")
    console.log("  1. Open https://coolify.appexx.me")
    console.log("  2. New Service → Docker Compose")
    console.log("  3. Paste docker-compose.trigger-oss.yml")
    console.log(`  4. Set domain: ${DOMAIN} → port 8030`)
    console.log("  5. Add the environment variables listed below")
    console.log("  6. Deploy")
    printPostDeployInstructions(composeEnv, registryUser, registryPass)
  }
}

function printPostDeployInstructions(env, registryUser, registryPass) {
  console.log()
  console.log("═".repeat(60))
  console.log("📋 POST-DEPLOY INSTRUCTIONS")
  console.log("═".repeat(60))
  console.log()
  console.log("1. Deploy the service in Coolify UI")
  console.log("2. Wait for all containers to be healthy (~2-3 min)")
  console.log()
  console.log("3. Check webapp logs for magic link and worker token:")
  console.log(`   docker compose -p trigger-oss logs -f webapp`)
  console.log()
  console.log("4. Login to Trigger.dev CLI:")
  console.log(`   npx trigger.dev@latest login -a https://${DOMAIN}`)
  console.log()
  console.log("5. Create project:")
  console.log(`   npx trigger.dev@latest init -p paradigm-sales-os -a https://${DOMAIN}`)
  console.log()
  console.log("6. Deploy tasks:")
  console.log("   npx trigger.dev@latest deploy")
  console.log()
  console.log("7. Login to Docker registry on deploy machine:")
  console.log(`   docker login -u ${registryUser} localhost:5000`)
  console.log(`   Password: ${registryPass}`)
  console.log()
  console.log("8. Create Personal Access Token in Trigger.dev dashboard:")
  console.log(`   https://${DOMAIN} → Settings → Personal Access Tokens`)
  console.log("   Set as TRIGGER_SECRET_KEY in Coolify production env")
  console.log()
  console.log("9. Update Coolify production envs for paradigm-hp:")
  console.log(`   TRIGGER_API_URL=https://${DOMAIN}`)
  console.log(`   TRIGGER_DASHBOARD_URL=https://${DOMAIN}`)
  console.log(`   TRIGGER_SECRET_KEY=<PAT from step 8>`)
  console.log(`   TRIGGER_PROJECT_REF=paradigm-sales-os`)
  console.log()
  console.log("10. Redeploy paradigm-hp")
  console.log()
  saveSecretsToEnvFile(env)
}

function saveSecretsToEnvFile(env) {
  const triggerEnvPath = path.join(ROOT, ".env.trigger-oss")
  const lines = [
    "# Trigger.dev OSS self-hosted — generated secrets",
    "# Store these in Coolify env for the paradigm-trigger-oss service",
    "# Do NOT commit this file",
    "",
  ]
  for (const [key, value] of Object.entries(env)) {
    lines.push(`${key}=${value}`)
  }
  fs.writeFileSync(triggerEnvPath, lines.join("\n"))
  console.log(`   Secrets saved to .env.trigger-oss (DO NOT COMMIT)`)
}

async function coolifyApi(pathname, token, options = {}) {
  const url = `${COOLIFY_API_URL}${pathname}`
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Coolify API ${res.status}: ${text.substring(0, 300)}`)
  }
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

main()
