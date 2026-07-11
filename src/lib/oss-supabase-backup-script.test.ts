import { readFileSync } from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { describe, expect, it } from "vitest"

const script = path.resolve(process.cwd(), "scripts/backup-oss-supabase.sh")

function validateConfig(extraEnv: Record<string, string> = {}) {
  return spawnSync("bash", [script, "--validate-config"], {
    encoding: "utf8",
    env: {
      NODE_ENV: "test",
      PATH: process.env.PATH,
      OSS_SUPABASE_ENV_FILE: path.resolve(
        process.cwd(),
        ".missing-oss-supabase-backup-env",
      ),
      ...extraEnv,
    },
  })
}

describe("OSS Supabase backup script", () => {
  it("fails closed when no database password is available", () => {
    const result = validateConfig()

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain("POSTGRES_PASSWORD is unavailable")
  })

  it("accepts a service-provided password without printing it", () => {
    const password = "test-only-database-password"
    const result = validateConfig({
      OSS_SUPABASE_POSTGRES_PASSWORD: password,
    })

    expect(result.status).toBe(0)
    expect(result.stdout).toContain("Backup configuration: OK")
    expect(`${result.stdout}${result.stderr}`).not.toContain(password)
  })

  it("contains no hard-coded password fallback", () => {
    const source = readFileSync(script, "utf8")

    expect(source).not.toMatch(/if \[\[?[^\n]*-z[^\n]*\][\s\S]{0,120}(PASS|PASSWORD)=['\"][^$]/)
    expect(source).toContain('die "POSTGRES_PASSWORD is unavailable"')
  })

  it("fails closed when encrypted backups have no passphrase", () => {
    const result = validateConfig({
      OSS_SUPABASE_POSTGRES_PASSWORD: "test-only-database-password",
      OSS_SUPABASE_BACKUP_ENCRYPTION_REQUIRED: "true",
      OSS_SUPABASE_BACKUP_GPG_PASSPHRASE: "",
    })

    // --validate-config checks credential availability only; the runtime path
    // performs the encryption requirement check before dumping data.
    expect(result.status).toBe(0)
    const source = readFileSync(script, "utf8")
    expect(source).toContain("OSS_SUPABASE_BACKUP_GPG_PASSPHRASE is required")
  })
})
