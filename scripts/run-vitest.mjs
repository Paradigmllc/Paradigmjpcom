#!/usr/bin/env node
/**
 * Stable Vitest launcher for the Desktop junction checkout.
 *
 * The user-facing repo path is C:\Users\apple\Desktop\paradigmjpcom, while the
 * filesystem target is D:\dev\paradigmjpcom. Vite can mix those paths and fail
 * to load tests through /@fs unless the real root is passed explicitly.
 */

import fs from "node:fs"
import { spawnSync } from "node:child_process"

const realRoot = fs.realpathSync(process.cwd())
const args = process.argv.slice(2).filter((arg) => arg !== "--run")
const result = spawnSync("npx", ["vitest", "run", "--root", realRoot, ...args], {
  cwd: realRoot,
  stdio: "inherit",
  shell: process.platform === "win32",
})

process.exit(result.status ?? 1)
