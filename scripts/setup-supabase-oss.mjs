#!/usr/bin/env node
/**
 * setup-supabase-oss.mjs — Coolify API 経由で Supabase OSS Docker Compose をデプロイ
 *
 * 使用法:
 *   node scripts/setup-supabase-oss.mjs
 *
 * 環境変数:
 *   COOLIFY_API_TOKEN — Coolify API token（必須）
 *
 * 参照: docker-compose.supabase.yml
 */

const TOKEN = process.env.COOLIFY_API_TOKEN
if (!TOKEN) {
  console.error("❌ COOLIFY_API_TOKEN is not set")
  process.exit(1)
}

const BASE = process.env.COOLIFY_API_URL || "https://coolify.appexx.me"
const PROJECT_UUID = "okgoks4gwkg0o04csso0s0wg"
const SERVER_UUID = "cw84s4488k8kwc4osckkosk8"

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

async function main() {
  console.log("🚀 Setting up Supabase OSS on Coolify...")

  // 1. Check if service already exists
  const existing = await api("/api/v1/services")
  const existingSupabase = Array.isArray(existing)
    ? existing.find((s) => s.name === "paradigm-supabase")
    : null

  if (existingSupabase) {
    console.log(`  ✓ Service already exists: ${existingSupabase.uuid}`)
    console.log(`    Status: ${existingSupabase.status || "unknown"}`)
    return existingSupabase
  }

  // 2. Create new Docker Compose service
  const compose = await import("fs").then((fs) =>
    fs.readFileSync(
      new URL("../docker-compose.supabase.yml", import.meta.url).pathname,
      "utf8"
    )
  )

  console.log("  → Creating Supabase OSS service...")
  const body = {
    type: "docker-compose",
    name: "paradigm-supabase",
    project_uuid: PROJECT_UUID,
    server_uuid: SERVER_UUID,
    environment_name: "production",
    description: "paradigmjp.com Supabase OSS (PostgreSQL + Studio + Auth + REST)",
    docker_compose_raw: compose,
  }

  try {
    const result = await api("/api/v1/services", {
      method: "POST",
      body: JSON.stringify(body),
    })
    console.log("  ✓ Service created:", result.uuid || JSON.stringify(result).substring(0, 200))
    return result
  } catch (e) {
    console.error("  ❌ Failed to create service:", e.message)

    // Fallback: Try with 'supabase' type if 'docker-compose' fails
    console.log("  → Trying with type 'supabase'...")
    body.type = "supabase"
    try {
      const result2 = await api("/api/v1/services", {
        method: "POST",
        body: JSON.stringify(body),
      })
      console.log("  ✓ Service created (supabase):", result2.uuid || JSON.stringify(result2).substring(0, 200))
    } catch (e2) {
      console.error("  ❌ Also failed:", e2.message)
      console.log()
      console.log("🔧 Manual setup required:")
      console.log("  1. Open https://coolify.appexx.me")
      console.log("  2. New Service → Docker Compose")
      console.log("  3. Paste docker-compose.supabase.yml")
      console.log("  4. Deploy")
    }
  }
}

main()