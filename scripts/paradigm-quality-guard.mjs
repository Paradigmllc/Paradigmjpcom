#!/usr/bin/env node
/**
 * Paradigm Quality Guard — prevents mobile Safari crashes and build speed
 * regressions from reaching production. Zero external dependencies.
 *
 * Run before deploy: node scripts/paradigm-quality-guard.mjs
 * Run in CI:        node scripts/paradigm-quality-guard.mjs --ci
 *
 * Checks are organized into:
 *   🔴 ERROR  — blocks deploy (known crash/failure cause)
 *   🟡 WARN   — prints warning (risk, but doesn't block)
 *
 * This script never prints secrets and never modifies files.
 */

import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"

const ROOT = process.cwd()
const CI = process.argv.includes("--ci")
const WARN_ONLY = process.argv.includes("--warn-only")

let errors = 0
let warnings = 0

function error(message) {
  console.error(`\x1b[31m🔴 ERROR\x1b[0m ${message}`)
  errors += 1
}

function warn(message) {
  console.warn(`\x1b[33m🟡 WARN \x1b[0m ${message}`)
  warnings += 1
}

function ok(message) {
  if (!CI) console.log(`\x1b[32m  OK  \x1b[0m ${message}`)
}

function readFile(relativePath) {
  try { return fs.readFileSync(path.join(ROOT, relativePath), "utf8") }
  catch { return null }
}

function findSourceFiles() {
  const result = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "src/"], {
    cwd: ROOT, encoding: "utf8", timeout: 10000,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
  })
  if (result.error || result.status !== 0) return []
  return result.stdout.trim().split(/\r?\n/).filter(Boolean)
    .filter(f => /\.(tsx?|jsx?)$/.test(f))
    .filter(f => !f.includes("node_modules") && !f.includes("astro-demo") && !f.includes("worker/"))
}

// Files exempt from 500-line rule (auto-generated / codegen / migrations)
const SIZE_CHECK_EXEMPT = [/\/migrations\//, /\/payload-types\.ts$/, /\/keystatic\./]

// ═══════════════════════════════════════════════════════════════
// 1. MOBILE SAFARI CRASH PREVENTION
// ═══════════════════════════════════════════════════════════════

function checkMobileSafariGuards() {
  const srcFiles = findSourceFiles()

  for (const rel of srcFiles) {
    const content = readFile(rel)
    if (!content) continue

    // 🔴 Canvas element in useEffect without mobile/reduced-motion guard
    if (content.includes("<canvas") && content.includes("useEffect")) {
      const hasGuard = content.includes("prefers-reduced-motion")
        || content.includes("useIsMobile")
        || content.includes("isMobile")
        || content.includes("window.innerWidth")
      if (!hasGuard) {
        error(`${rel}: <canvas> in useEffect without mobile/prefers-reduced-motion guard — will crash mobile Safari`)
      }
    }

    // 🔴 -webkit-overflow-scrolling (deprecated, crash cause on modern Safari)
    if (content.includes("-webkit-overflow-scrolling")) {
      error(`${rel}: contains deprecated -webkit-overflow-scrolling:touch — remove immediately`)
    }

    // 🔴 <video> without playsInline
    if (/<video\b/.test(content) && !content.includes("playsInline") && !content.includes("playsinline")) {
      error(`${rel}: <video> element missing playsInline — will not play inline on iOS Safari`)
    }

    // 🟡 <video> with preload="auto" (Safari memory risk)
    if (/<video\b[\s\S]*?preload\s*=\s*["']auto["']/.test(content)) {
      warn(`${rel}: <video> with preload="auto" — use "none" on mobile to avoid Safari memory issues`)
    }

    // 🟡 CSS aspect-ratio on video containers (Safari rendering bug)
    if ((content.includes("aspectRatio") || content.includes("aspect-ratio")) && /<video\b/.test(content)) {
      warn(`${rel}: aspect-ratio used near <video> — use pb-[56.25%] padding-bottom technique for Safari`)
    }

    // 🟡 framer-motion useScroll without mobile guard
    if (content.includes("useScroll") && content.includes("framer-motion")) {
      const hasGuard = content.includes("useIsMobile")
        || content.includes("isMobile")
        || content.includes("prefers-reduced-motion")
      if (!hasGuard) {
        warn(`${rel}: framer-motion useScroll without mobile guard — expensive on mobile Safari`)
      }
    }

    // 🟡 min-h-screen on scrollable pages (Safari 100vh bug)
    if (content.includes("min-h-screen") && !content.includes("min-h-dvh") && !content.includes("min-h-svh")) {
      warn(`${rel}: uses min-h-screen — Safari address bar causes viewport jump; prefer min-h-dvh`)
    }
  }

  // 🔴 DifyChatbot rendering on report pages
  const chatbotRel = "src/components/DifyChatbot.tsx"
  const chatbot = readFile(chatbotRel)
  if (chatbot) {
    const hasReportGuard = chatbot.includes("/report/")
    const hasPGuard = chatbot.includes("/p/")
    const hasDGuard = /\/d\//.test(chatbot)
    if (!hasReportGuard) {
      error(`${chatbotRel}: does not exclude /report/ pages — will load heavy widget on diagnostic reports, crashing mobile Safari`)
    }
    if (!hasPGuard) {
      warn(`${chatbotRel}: does not exclude /p/ pages — chatbot may render on shim pages`)
    }
    if (!hasDGuard) {
      warn(`${chatbotRel}: does not exclude /d/ pages — chatbot may render on demo pages`)
    }
  }

  // 🔴 Video templates contain deprecated CSS
  const videoTemplates = readFile("src/lib/sales/video-templates.ts")
  if (videoTemplates && videoTemplates.includes("-webkit-overflow-scrolling")) {
    error("src/lib/sales/video-templates.ts: contains deprecated -webkit-overflow-scrolling:touch")
  }
}

// ═══════════════════════════════════════════════════════════════
// 2. BUILD SPEED REGRESSION PREVENTION
// ═══════════════════════════════════════════════════════════════

function checkBuildSpeedGuards() {
  const dockerfile = readFile("Dockerfile")
  if (!dockerfile) {
    error("Dockerfile not found")
    return
  }

  // 🔴 Dockerfile missing BuildKit syntax
  if (!/^#\s*syntax\s*=\s*docker\/dockerfile/.test(dockerfile)) {
    error("Dockerfile: missing `# syntax = docker/dockerfile:1` — BuildKit cache mounts won't work")
  }

  // 🔴 Dockerfile uses COPY . . (cache-busting anti-pattern)
  // Matches "COPY . ." or "COPY . ./" on a line (typically the entire build context copy)
  const hasCopyDot = dockerfile.split("\n").some(line => {
    const trimmed = line.trim()
    return /^COPY\s+\.\s+\.\/?\s*$/.test(trimmed)
  })
  if (hasCopyDot) {
    error("Dockerfile: uses `COPY . .` — invalidates entire build cache on any source change. Use selective COPY (tsconfig, src/, public/, content/, messages/) instead")
  }

  // 🟡 Dockerfile npm install missing cache mount
  if (dockerfile.includes("npm install") && !dockerfile.includes("--mount=type=cache")) {
    warn("Dockerfile: npm install missing `--mount=type=cache,target=/root/.npm` — npm cache not preserved between builds")
  }

  // 🟡 Dockerfile next build missing cache mount
  if (dockerfile.includes("npm run build") && !dockerfile.includes(".next/cache")) {
    warn("Dockerfile: next build missing `--mount=type=cache,target=/app/.next/cache` — Turbopack cache not preserved between builds")
  }

  // 🟡 build-next.mjs always executes payload generate:importmap unconditionally
  const buildScript = readFile("scripts/build-next.mjs")
  if (buildScript) {
    const hasConditionalPayload = buildScript.includes("PAYLOAD_READS_DISABLED_DURING_BUILD")
    const callsPayloadImportmap = buildScript.includes('"generate:importmap"') || buildScript.includes("'generate:importmap'")
    if (callsPayloadImportmap && !hasConditionalPayload) {
      warn("scripts/build-next.mjs: runs payload generate:importmap without checking PAYLOAD_READS_DISABLED_DURING_BUILD — wasted build time when DB is disabled")
    }
  }

  // 🟡 .dockerignore allows heavy directories into build context
  const dockerignore = readFile(".dockerignore")
  if (dockerignore) {
    const requiredIgnores = ["astro-demo", "worker", "supabase"]
    for (const entry of requiredIgnores) {
      if (!dockerignore.includes(entry)) {
        warn(`.dockerignore: "${entry}" not excluded from Docker build context — adds unnecessary transfer time`)
      }
    }
  }

  // 🔴 Healthcheck guards (Coolify requires these)
  const healthGuards = [
    [/ENV\s+HOSTNAME=0\.0\.0\.0/, "ENV HOSTNAME=0.0.0.0"],
    [/ENV\s+PORT=3000/, "ENV PORT=3000"],
    [/apk\s+add\s+--no-cache\s+curl/, "apk add --no-cache curl"],
    [/HEALTHCHECK\b[\s\S]*127\.0\.0\.1:\$\{PORT:-3000\}/, "HEALTHCHECK with localhost"],
  ]
  for (const [pattern, label] of healthGuards) {
    if (!pattern.test(dockerfile)) {
      error(`Dockerfile: missing ${label} — Coolify healthcheck will fail`)
    }
  }

  ok("Dockerfile healthcheck guards verified")
}

// ═══════════════════════════════════════════════════════════════
// 3. ANTI-PATTERN: SILENT CATCH
// ═══════════════════════════════════════════════════════════════

function checkSilentCatches() {
  const srcFiles = findSourceFiles()
  let silentCount = 0
  for (const rel of srcFiles) {
    const content = readFile(rel)
    if (!content) continue
    const lines = content.split("\n")
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim()
      if (trimmed === "} catch {}" || trimmed === "}catch{}" || trimmed === "} catch(e) {}" || trimmed === "}catch(e){}" || trimmed === "} catch (e) {}") {
        error(`${rel}:${i + 1}: silent catch — must include console.error + toast.error`)
        silentCount += 1
        if (silentCount > 20) return
      }
    }
  }
  if (silentCount === 0) ok("No silent catch blocks found")
}

// ═══════════════════════════════════════════════════════════════
// 4. FILE SIZE GUARD (500 line limit from AGENTS.md)
// ═══════════════════════════════════════════════════════════════

function checkFileSizes() {
  const srcFiles = findSourceFiles()
  let oversized = 0
  for (const rel of srcFiles) {
    if (SIZE_CHECK_EXEMPT.some(pattern => pattern.test(rel))) continue
    const content = readFile(rel)
    if (!content) continue
    const lines = content.split("\n").length
    if (lines > 500) {
      error(`${rel}: ${lines} lines — exceeds 500-line limit (AGENTS.md rule #7)`)
      oversized += 1
      if (oversized > 20) return
    } else if (lines > 350) {
      warn(`${rel}: ${lines} lines — approaching 500-line limit, consider splitting`)
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// 5. WW-EVENT: NO SERVER-SIDE PERIODIC AUTOMATION
// ═══════════════════════════════════════════════════════════════

function checkEventDrivenAutomation() {
  for (const rel of [
    "n8n-workflows/01-supabase-to-notion-sync.json",
    "n8n-workflows/02-notion-to-supabase-reverse.json",
    "n8n-workflows/03-notion-template-sync.json",
    "n8n-workflows/04-sales-video-pipeline.json",
  ]) {
    const workflow = readFile(rel)
    if (workflow && workflow.includes("n8n-nodes-base.scheduleTrigger")) {
      error(`${rel}: n8n scheduleTrigger is forbidden by WW-EVENT; use webhook trigger`)
    }
  }

  const serverFiles = [
    "src/instrumentation.ts",
    ...findSourceFiles().filter((rel) => rel.startsWith("src/lib/sales/") || rel.startsWith("src/app/api/sales/")),
  ]
  for (const rel of serverFiles) {
    const content = readFile(rel)
    if (content && /\bsetInterval\s*\(/.test(content)) {
      error(`${rel}: server-side setInterval is forbidden by WW-EVENT; use webhook/queue event drain`)
    }
  }

  const runMigrations = readFile("scripts/run-migrations.sh")
  if (runMigrations && !runMigrations.includes("migration_044_abolish_pg_cron_event_driven.sql")) {
    error("scripts/run-migrations.sh: missing migration_044_abolish_pg_cron_event_driven.sql")
  }

  const abolishRoute = readFile("src/app/api/sales/admin/abolish-periodic-jobs/route.ts")
  if (!abolishRoute) {
    error("src/app/api/sales/admin/abolish-periodic-jobs/route.ts: missing one-shot pg_cron abolition endpoint")
  } else {
    if (!abolishRoute.includes("isSalesApiAuthorized")) {
      error("src/app/api/sales/admin/abolish-periodic-jobs/route.ts: must require sales API authorization")
    }
    if (!abolishRoute.includes("to_regclass('cron.job')") || !abolishRoute.includes("cron.unschedule")) {
      error("src/app/api/sales/admin/abolish-periodic-jobs/route.ts: must verify and unschedule pg_cron jobs")
    }
  }

  ok("WW-EVENT no periodic automation guards verified")
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

console.log("\n🔍 Paradigm Quality Guard\n")

checkMobileSafariGuards()
checkBuildSpeedGuards()
checkSilentCatches()
checkFileSizes()
checkEventDrivenAutomation()

console.log(`\n${errors === 0 ? "✅" : "❌"} ${errors} error(s), ${warnings} warning(s)\n`)

if (!WARN_ONLY && errors > 0) {
  process.exit(1)
}
