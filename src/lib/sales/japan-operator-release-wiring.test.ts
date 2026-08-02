import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("Japan operator production wiring", () => {
  const migration = readFileSync("supabase/migrations/20260801224308_sales_japan_operator_cases.sql", "utf8")
  const hardening = readFileSync("supabase/migrations/20260801235327_sales_japan_operator_case_hardening.sql", "utf8")
  const operations = readFileSync("supabase/migrations/20260802015455_japan_operator_operations_os.sql", "utf8")
  const commercial = readFileSync("supabase/migrations/20260802015712_japan_operator_commercial_os.sql", "utf8")
  const delivery = readFileSync("supabase/migrations/20260802015715_japan_operator_delivery_os.sql", "utf8")
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

  it("blocks live outbound unless suppression and exact operator authorization checks pass", () => {
    expect(operations).toContain("sales_contact_suppressions")
    expect(operations).toContain("sales_check_outbound_authorization")
    expect(operations).toContain("message_sha256")
    expect(operations).toContain("sales_consume_outbound_authorization")
  })

  it("forces evidence, commercial and delivery records behind private RLS tables", () => {
    expect(operations).toContain("sales_japan_operator_evidence")
    expect(operations).toContain("sales_apply_japan_operator_action_v2")
    expect(commercial).toContain("sales_japan_operator_contract_links")
    expect(commercial).toContain("sales_japan_operator_invoices")
    expect(commercial).toContain("sales_japan_operator_skus")
    expect(delivery).toContain("sales_japan_operator_finance_periods")
    expect(delivery).toContain("sales_japan_operator_incidents")
    expect(delivery).toContain("sales_japan_operator_outbox")
    for (const sql of [operations, commercial, delivery]) {
      expect(sql).toContain("FORCE ROW LEVEL SECURITY")
      expect(sql).toContain("FROM PUBLIC, anon, authenticated")
    }
  })

  it("keeps events append-only and resolves production Wave 1 aliases", () => {
    expect(hardening).toContain("REVOKE ALL ON TABLE public.sales_japan_operator_events FROM service_role")
    expect(hardening).toContain("GRANT SELECT, INSERT ON TABLE public.sales_japan_operator_events TO service_role")
    expect(hardening).toContain("DONGJIN BEDDING Co., Ltd. / Little Archive")
    expect(hardening).toContain("external_messages_sent', 0")
  })

  it("applies the migration through both production migration paths", () => {
    expect(deploy).toContain("applyJapanOperatorCasesMigration")
    expect(deploy).toContain("20260801224308_sales_japan_operator_cases.sql")
    expect(deploy).toContain("applyJapanOperatorCaseHardeningMigration")
    expect(deploy).toContain("20260801235327_sales_japan_operator_case_hardening.sql")
    expect(runMigrations).toContain("20260801224308_sales_japan_operator_cases.sql")
    expect(runMigrations).toContain("20260801235327_sales_japan_operator_case_hardening.sql")
    expect(deploy).toContain("applyJapanOperatorOperationsOsMigrations")
    expect(runMigrations).toContain("20260802015455_japan_operator_operations_os.sql")
    expect(runMigrations).toContain("20260802015712_japan_operator_commercial_os.sql")
    expect(runMigrations).toContain("20260802015715_japan_operator_delivery_os.sql")
  })
})
