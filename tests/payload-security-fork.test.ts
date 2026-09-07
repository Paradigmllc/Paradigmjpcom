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
    const archive = "vendor/paradigmllc-payload-security-3.85.0.tgz"
    expect(pkg.dependencies.payload).toBe(`file:${archive}`)
    expect(pkg.overrides.payload).toBe("$payload")
    const expected = "sha512-+YqhbzqTuB2cK3LvkhlY45glyB7gL6msX3yFzPa7QfdQAjMO5mKZ/OHGge7mpvme5Q6EyzHXDOjaGG2zy1lGdg=="
    expect(`sha512-${createHash("sha512").update(readFileSync(archive)).digest("base64")}`).toBe(expected)
    expect(lock.packages["node_modules/payload"]).toMatchObject({ name: "@paradigmllc/payload-security", version: "3.85.0", integrity: expected })
    const payloadDir = dirname(dirname(createRequire(import.meta.url).resolve("payload")))
    const installed = JSON.parse(readFileSync(join(payloadDir, "package.json"), "utf8"))
    expect(installed.paradigmSecurityRevision).toBe("1")
    expect(installed.paradigmUpstream.package).toBe("payload@3.85.0")
    expect(installed.paradigmSecurityAdvisory).toBe("GHSA-jg8r-5jh2-v2xj")
    expect(readFileSync(join(payloadDir, "dist/auth/operations/unlock.js"), "utf8")).toContain("collectionConfig.access.unlock ?? (() => false)")
    expect(readFileSync("Dockerfile", "utf8")).toContain(`COPY ${archive} ./${archive}`)
  })

  it("pins the parser's reviewed published artifact instead of just changing its name", () => {
    const lock = JSON.parse(readFileSync("package-lock.json", "utf8"))
    const copies = Object.entries(lock.packages).filter(([path]) => path.endsWith("node_modules/image-size"))
    expect(copies).toHaveLength(1)
    expect(copies[0][1]).toMatchObject({
      name: "image-size-next", version: "2.1.1",
      integrity: "sha512-n+DFjUct+G9mxZck+lvzqrTsqBJvSHMs6iEo//W5iAgRV7oUbrh1JWmKgAEpmyRB5lw6plIQizS1wK1dvrsvAw==",
    })
  })
})
