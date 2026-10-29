// @vitest-environment node
import { describe, expect, it } from "vitest"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"

describe("reviewed security dependency provenance", () => {
  it("ships the exact reviewed local CMS archive with upstream attribution", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"))
    const lock = JSON.parse(readFileSync("package-lock.json", "utf8"))
    const archive = "vendor/paradigmllc-payload-security-3.91.0.tgz"
    expect(pkg.dependencies.payload).toBe(`file:${archive}`)
    expect(pkg.overrides.payload).toBe("$payload")
    const expected = "sha512-5l5ktHasDu0zdVkrjcCsX24Xym46RrkZFbMZON8TzZQqD2t7XrIimYHDbW6GYhNKPKPNKz0AAvWzj8ZDZfhqaw=="
    expect(`sha512-${createHash("sha512").update(readFileSync(archive)).digest("base64")}`).toBe(expected)
    expect(lock.packages["node_modules/payload"]).toMatchObject({ name: "@paradigmllc/payload-security", version: "3.91.0", integrity: expected })
    const payloadDir = dirname(dirname(createRequire(import.meta.url).resolve("payload")))
    const installed = JSON.parse(readFileSync(join(payloadDir, "package.json"), "utf8"))
    expect(installed.paradigmSecurityRevision).toBe("1")
    expect(installed.paradigmUpstream.package).toBe("payload@3.91.0")
    expect(installed.paradigmSecurityAdvisory).toBe("GHSA-jg8r-5jh2-v2xj")
    expect(readFileSync(join(payloadDir, "dist/auth/operations/unlock.js"), "utf8")).toContain("collectionConfig.access.unlock ?? (() => false)")
    expect(readFileSync("Dockerfile", "utf8")).toContain(`COPY ${archive} ./${archive}`)
  })

  it("does not reinstall the obsolete image parser", () => {
    const lock = JSON.parse(readFileSync("package-lock.json", "utf8"))
    expect(Object.keys(lock.packages).filter(path => path.endsWith("node_modules/image-size"))).toEqual([])
  })
})
