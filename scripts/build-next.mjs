#!/usr/bin/env node
/**
 * Production build wrapper.
 *
 * Public pages have static fallbacks, so build-time Payload reads are disabled
 * to keep Coolify/Nixpacks builds independent from transient Postgres DNS.
 * Runtime CMS reads remain enabled.
 */

import { spawn, spawnSync } from "node:child_process"
import path from "node:path"
import fs from "node:fs"

const binExt = process.platform === "win32" ? ".cmd" : ""

function localBin(name) {
  return path.join(process.cwd(), "node_modules", ".bin", `${name}${binExt}`)
}

function shellQuote(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`
}

function run(command, args, options = {}) {
  const useShell = process.platform === "win32"
  const result = spawnSync(useShell ? [shellQuote(command), ...args.map(shellQuote)].join(" ") : command, useShell ? [] : args, {
    stdio: "inherit",
    shell: useShell,
    ...options,
    env: {
      ...process.env,
      ...(options.env ?? {}),
    },
  })

  if (result.error) {
    console.error(`[build] failed to start ${command}:`, result.error)
    process.exit(1)
  }
  if (result.status !== 0) {
    console.error(`[build] ${command} ${args.join(" ")} exited with ${result.status}`)
    process.exit(result.status ?? 1)
  }
}

function runWithHeartbeat(command, args, options = {}) {
  const useShell = process.platform === "win32"
  const startedAt = Date.now()
  const display = `${command} ${args.join(" ")}`
  const child = spawn(useShell ? [shellQuote(command), ...args.map(shellQuote)].join(" ") : command, useShell ? [] : args, {
    stdio: "inherit",
    shell: useShell,
    ...options,
    env: {
      ...process.env,
      ...(options.env ?? {}),
    },
  })

  const heartbeat = setInterval(() => {
    const elapsed = Math.round((Date.now() - startedAt) / 1000)
    console.log(`[build] still running ${display} (${elapsed}s)`)
  }, 30_000)

  return new Promise((resolve) => {
    child.on("error", (error) => {
      clearInterval(heartbeat)
      console.error(`[build] failed to start ${command}:`, error)
      resolve(1)
    })
    child.on("exit", (code) => {
      clearInterval(heartbeat)
      if (code !== 0) console.error(`[build] ${display} exited with ${code}`)
      resolve(code ?? 1)
    })
  })
}

if (!process.env.PAYLOAD_READS_DISABLED_DURING_BUILD) {
  run(localBin("payload"), ["generate:importmap"])
}
const buildMode = process.argv.includes("--turbo") ? [] : ["--webpack"]
const nextStatus = await runWithHeartbeat(localBin("next"), ["build", ...buildMode], {
  env: {
    PAYLOAD_READS_DISABLED_DURING_BUILD: "1",
  },
})
if (nextStatus !== 0) process.exit(nextStatus)

// Copy content/ into standalone output for Keystatic local storage
const standaloneDir = path.join(process.cwd(), ".next", "standalone")
const contentSrc = path.join(process.cwd(), "content")
const contentDst = path.join(standaloneDir, "content")
if (fs.existsSync(contentSrc)) {
  fs.cpSync(contentSrc, contentDst, { recursive: true })
  console.log("[build] content/ copied to standalone output")
}
