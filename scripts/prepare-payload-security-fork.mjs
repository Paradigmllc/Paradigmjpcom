#!/usr/bin/env node
// Build a narrow, auditable local fork; never modify the installed dependency.
import { createHash } from "node:crypto"
import { mkdtempSync, mkdirSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { execFileSync } from "node:child_process"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const version = "3.85.0"
const upstreamIntegrity = "sha512-Cb3jX/WRkHhT5oZCx1BikR6fe32Xbld4Esxr0i+dXtHZMjBVgMjaf/oaK81jLRBstbJbUw7Ia/jMrRw82+FlwA=="
const scratch = mkdtempSync(join(tmpdir(), "paradigm-payload-fork-"))
const vendor = join(root, "vendor")
mkdirSync(vendor, { recursive: true })
function run(command, args, cwd = scratch) {
  return execFileSync(command, args, { cwd, encoding: "utf8", timeout: 120000, maxBuffer: 2 ** 20 })
}
try {
  const [download] = JSON.parse(run("npm", ["pack", `payload@${version}`, "--ignore-scripts", "--json"]))
  const archive = join(scratch, download.filename)
  const digest = `sha512-${createHash("sha512").update(readFileSync(archive)).digest("base64")}`
  if (digest !== upstreamIntegrity) throw new Error("Payload upstream archive integrity mismatch")
  run("tar", ["-xzf", archive])
  const source = join(scratch, "package")
  run("git", ["apply", "--check", join(root, "patches/payload/3.85.0-unlock.patch")], source)
  run("git", ["apply", join(root, "patches/payload/3.85.0-unlock.patch")], source)
  // Public API stays at 3.85.0 for Payload's exact peer dependencies.
  // The package identity and explicit revision disclose that this is NOT upstream.
  run("npm", ["pkg", "set", "name=@paradigmllc/payload-security", "paradigmSecurityRevision=1",
    `paradigmUpstream.package=payload@${version}`, `paradigmUpstream.integrity=${upstreamIntegrity}`,
    "paradigmSecurityAdvisory=GHSA-jg8r-5jh2-v2xj",
    "description=Paradigm local security fork of Payload 3.85.0; deny implicit account unlock"], source)
  const [packed] = JSON.parse(run("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", vendor], source))
  if (packed.files.some(file => file.path === "dist/auth/operations/unlock.js.map")) {
    throw new Error("Stale unlock source map must not ship")
  }
  process.stdout.write(JSON.stringify({ archive: join(vendor, packed.filename), integrity: packed.integrity, upstreamIntegrity, scratch }) + "\n")
} catch (error) {
  console.error("Payload security fork build failed:", error)
  process.exitCode = 1
}
