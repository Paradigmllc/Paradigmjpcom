import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("Japan operator production wiring", () => {
  const migration = readFileSync("supabase/migrations/20260801224308_sales_japan_operator_cases.sql", "utf8")
  const deploy = readFileSync("scripts/sales-os-no-login-deploy.mjs", "utf8")
  const runMigrations = readFileSync("scripts/run-migrations.sh", "utf8")

  it("keeps both case tables private and service-role only", () => {
    expect(migration).toContain("sales_japan_operator_cases ENABLE ROW LEVEL SECURITY")
    expect(migration).toContain("sales_japan_operator_cases FORCE ROW LEVEL SECURITY")
    expect(migration).toContain("sales_japan_operator_events ENABLE ROW LEVEL SECURITY")
    expect(migration).toContain("FROM PUBLIC, anon, authenticated")
    expect(migration).toContain("TO service_role")
  })

  it("uses atomic audited mutations and never adds an outbound sender", () => {
    expect(migration).toContain("sales_apply_japan_operator_action")
    expect(migration).toContain("sales_create_japan_operator_case")
    expect(migration).toContain("external_messages_sent', 0")
    expect(migration).not.toMatch(/sendgrid|mailgun|resend|smtp/i)
  })

  it("applies the migration through both production migration paths", () => {
    expect(deploy).toContain("applyJapanOperatorCasesMigration")
    expect(deploy).toContain("20260801224308_sales_japan_operator_cases.sql")
    expect(runMigrations).toContain("20260801224308_sales_japan_operator_cases.sql")
  })
})
