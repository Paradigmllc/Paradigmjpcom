import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const readRepoFile = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")

describe("production origin-lock release wiring", () => {
  it("reapplies Cloudflare-only middleware to the app and every Docker alias", () => {
    const deploy = readRepoFile("scripts/sales-os-no-login-deploy.mjs")
    const helper = readRepoFile("scripts/lib/refresh-traefik-origin-lock.py")

    expect(deploy).toContain("refresh-traefik-origin-lock.py")
    expect(deploy).toContain("originLockHelper")
    expect(deploy.lastIndexOf("prepareManualTraefikOriginLock()")).toBeLessThan(
      deploy.indexOf("const uuid = await triggerDeploy()"),
    )
    expect(deploy.indexOf("const uuid = await triggerDeploy()")).toBeLessThan(
      deploy.lastIndexOf("refreshManualTraefikRoute()"),
    )
    expect(deploy).toContain("python3 - --prepare")
    expect(deploy).toContain("python3 - --apply")
    expect(deploy).not.toMatch(/route file not found"\s*\n\s*exit 0/)
    expect(helper).toContain("https://api.cloudflare.com/client/v4/ips")
    expect(helper).toContain("prepare_cloudflare_cache")
    expect(helper).toContain("load_cached_ranges")
    expect(helper).toContain("CACHE_MAX_AGE_SECONDS")
    expect(helper).toContain("paradigm-cloudflare-only")
    expect(helper).toContain("ipAllowList")
    expect(helper).toContain("discover_app_aliases")
    expect(helper).toContain("paradigmhp-origin-alias-https")
    expect(helper).toContain("keystatic-https")

    const applyBody = helper.match(/def apply_cached_origin_lock\([\s\S]*?(?:\r?\n){2,}def main\(/)?.[0]
    expect(applyBody).toContain("load_cached_ranges")
    expect(applyBody).toContain("atomic_write(")
    expect(applyBody).toContain('["priority"] = 1000')
    expect(applyBody).not.toContain("fetch_cloudflare_ranges(")
  })

  it("gates releases on public Cloudflare and direct-origin measurements", () => {
    const doctor = readRepoFile("scripts/release-doctor.mjs")

    expect(doctor).toContain("checkOriginAccessGate")
    expect(doctor).toContain('fetch("https://www.paradigmjp.com/api/ready"')
    expect(doctor).not.toContain('fetch("https://paradigmjp.com/api/ready", {\n      redirect: "manual"')
    expect(doctor).toContain("--resolve")
    expect(doctor).toContain("CF-Connecting-IP: 203.0.113.10")
    expect(doctor).toContain("cf-ray")
    expect(doctor).toContain('scheme === "http" && /^3\\d\\d$/.test(statusCode)')
    expect(doctor).toContain("direct origin HTTP serves no application content")
    expect(doctor).toContain("forged Cloudflare headers are blocked")
  })

  it("blocks production release when either Turnstile key is absent", () => {
    const doctor = readRepoFile("scripts/release-doctor.mjs")

    expect(doctor).toContain('hasMinimumSecret("TURNSTILE_SECRET_KEY")')
    expect(doctor).toContain("envs.NEXT_PUBLIC_TURNSTILE_SITE_KEY.trim().length > 0")
    expect(doctor).toContain(
      'fail("TURNSTILE_SECRET_KEY and NEXT_PUBLIC_TURNSTILE_SITE_KEY are required in production")',
    )
    expect(doctor).not.toContain("Turnstile is not configured; signed challenge")
  })
})
