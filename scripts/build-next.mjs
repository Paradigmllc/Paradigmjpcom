#!/usr/bin/env node
/**
 * Production build wrapper.
 *
 * Public pages have static fallbacks, so build-time Payload reads are disabled
 * to keep Coolify/Nixpacks builds independent from transient Postgres DNS.
 * Runtime CMS reads remain enabled.
 */

import { spawnSync } from "node:child_process"
import path from "node:path"

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

run(localBin("payload"), ["generate:importmap"])
run(localBin("next"), ["build", "--webpack"], {
  env: {
    PAYLOAD_READS_DISABLED_DURING_BUILD: "1",
  },
})
