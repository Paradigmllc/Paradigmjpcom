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

process.env.PAYLOAD_READS_DISABLED_DURING_BUILD ||= "1"
process.env.PAYLOAD_DISABLE_DATABASE_DURING_BUILD ||= "1"
process.env.DATABASE_URI ||= "postgresql://payload:payload@127.0.0.1:1/payload"
process.env.PAYLOAD_SECRET ||= "build-time-placeholder-secret-not-used-at-runtime"

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

function ensureTurbopackExternalShims() {
  const shims = [
    ["pino-1937dc62079f7d79", "pino"],
    ["pino-pretty-8058e85f21bde600", "pino-pretty"],
    ["sharp-f9ff7e9aeb14e04a", "sharp"],
    ["pg-5d52e11f38b0f90a", "pg"],
    ["pg-a8aea133d5e19d13", "pg"],
    ["@aws-sdk/client-s3-bf84029279c75b9f", "@aws-sdk/client-s3"],
    ["@aws-sdk/s3-request-presigner-9f4ce0e7a9203bcb", "@aws-sdk/s3-request-presigner"],
  ]
  for (const [externalName, realName] of shims) {
    if (!fs.existsSync(path.join(process.cwd(), "node_modules", realName))) continue

    // Next 16/Turbopack can rewrite some server dependencies to stable
    // external names during page-data collection. Node then tries to require
    // those names as real packages. Keep these shims tiny and local.
    const shimDir = path.join(process.cwd(), "node_modules", externalName)
    fs.mkdirSync(shimDir, { recursive: true })
    fs.writeFileSync(
      path.join(shimDir, "package.json"),
      JSON.stringify({ name: externalName, main: "index.js", private: true }, null, 2),
    )
    fs.writeFileSync(path.join(shimDir, "index.js"), `module.exports = require('${realName}')\n`)
  }
}

if (!process.env.PAYLOAD_READS_DISABLED_DURING_BUILD && !process.env.PAYLOAD_DISABLE_DATABASE_DURING_BUILD) {
  run(localBin("payload"), ["generate:importmap"])
}
const buildArgs = ["build"]
if (process.argv.includes("--turbo") || process.env.NEXT_BUILD_BUNDLER === "turbo") {
  buildArgs.push("--turbo")
} else {
  // Production deploys default to webpack because Turbopack still traces Payload
  // and generated package sources too broadly in this app.
  buildArgs.push("--webpack")
}
if (!buildArgs.includes("--webpack")) {
  ensureTurbopackExternalShims()
}
const nextStatus = await runWithHeartbeat(localBin("next"), buildArgs, {
  env: {
    NEXT_BUILD_BUNDLER: buildArgs.includes("--webpack") ? "webpack" : "turbo",
    PAYLOAD_READS_DISABLED_DURING_BUILD: "1",
    PAYLOAD_DISABLE_DATABASE_DURING_BUILD: "1",
    DATABASE_URI: process.env.DATABASE_URI || "postgresql://payload:payload@127.0.0.1:1/payload",
    PAYLOAD_SECRET: process.env.PAYLOAD_SECRET,
  },
})
if (nextStatus !== 0) process.exit(nextStatus)

// Copy content/ into standalone output for Keystatic local storage. Windows
// builds use regular output by default because Next.js can hold its own
// required-server-files.js open while assembling standalone output.
const shouldBuildStandalone = process.env.NEXT_BUILD_STANDALONE === "1"
  || (process.env.NEXT_BUILD_STANDALONE !== "0" && process.platform !== "win32")
const standaloneDir = path.join(process.cwd(), ".next", "standalone")
const contentSrc = path.join(process.cwd(), "content")
const contentDst = path.join(standaloneDir, "content")
if (shouldBuildStandalone && fs.existsSync(contentSrc)) {
  fs.cpSync(contentSrc, contentDst, { recursive: true })
  console.log("[build] content/ copied to standalone output")
} else if (!shouldBuildStandalone) {
  console.log("[build] standalone packaging skipped on Windows; Linux CI and production retain standalone output")
}
