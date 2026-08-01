#!/usr/bin/env node
/**
 * OpenClaw Pipeline — Deploy & Verify Script
 * 2026-07-06: Trigger.dev → OpenClaw
 *
 * Usage:
 *   node scripts/deploy-openclaw-pipeline.mjs [--verify]
 */

import { execSync } from "node:child_process"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")
const PIPE_DIR = resolve(ROOT, "services/openclaw-pipeline")

const SKILLS = ["lead-discovery", "diagnosis-output", "crm-sync", "outreach-exec"]

function check(condition, message) {
  if (!condition) {
    console.error(`  ❌ ${message}`)
    process.exitCode = 1
    return false
  }
  console.log(`  ✅ ${message}`)
  return true
}

async function main() {
  const args = process.argv.slice(2)
  const verify = args.includes("--verify")

  console.log("╔══════════════════════════════════════╗")
  console.log("║  OpenClaw Pipeline — Deploy Script   ║")
  console.log("╚══════════════════════════════════════╝")

  console.log("\n🔍 Validating structure...")
  check(existsSync(PIPE_DIR), "services/openclaw-pipeline/ exists")

  for (const skill of SKILLS) {
    const d = resolve(PIPE_DIR, skill)
    check(existsSync(d), `${skill}/ exists`)
    check(existsSync(resolve(d, "SKILL.md")), `${skill}/SKILL.md`)
    check(existsSync(resolve(d, "scripts")), `${skill}/scripts/`)
    const scripts = readdirSync(resolve(d, "scripts")).filter((f) => f.endsWith(".js"))
    console.log(`     ${scripts.length} scripts: ${scripts.join(", ")}`)
  }

  console.log("\n🔍 Validating scripts have content...")
  for (const skill of SKILLS) {
    const dir = resolve(PIPE_DIR, skill, "scripts")
    if (!existsSync(dir)) continue
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".js"))) {
      const content = readFileSync(resolve(dir, file), "utf8")
      check(content.length > 20, `${skill}/scripts/${file} (${content.split('\n').length} lines)`)
    }
  }

  console.log("\n🔍 Validating Dockerfile...")
  const dockerfile = readFileSync(resolve(ROOT, "Dockerfile"), "utf8")
  check(dockerfile.includes("openclaw-pipeline"), "Dockerfile includes openclaw-pipeline COPY")

  console.log("\n🔍 Validating integration registry...")
  const orchestrationDefs = readFileSync(resolve(ROOT, "src/lib/sales/integration-defs-orchestration.ts"), "utf8")
  check(orchestrationDefs.includes('"openclaw"'), "integration-defs includes openclaw")
  check(!orchestrationDefs.includes("TRIGGER_SECRET_KEY"), "No Trigger.dev env refs in integration-defs")

  const failed = process.exitCode === 1
  console.log(failed ? "\n❌ FAILED" : "\n✅ All checks passed")
}

main().catch((e) => { console.error(e.message); process.exit(1) })
