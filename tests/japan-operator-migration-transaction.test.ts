import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe.each([
  "20260801224308_sales_japan_operator_cases.sql",
  "20260801235327_sales_japan_operator_case_hardening.sql",
])("Japan operator migration replay over psql/SSH: %s", (file) => {
  const sql = readFileSync(`supabase/migrations/${file}`, "utf8")
    .replace(/--[^\n]*/g, "").trim()
  it("keeps the existing RPC mutation capability inside one explicit transaction", () => {
    expect(sql).toMatch(/^BEGIN;/)
    expect(sql).toContain("SELECT set_config('app.japan_operator_mutation', 'rpc', true);")
    expect(sql).toMatch(/COMMIT;$/)
    expect(sql.match(/\bBEGIN;/g)).toHaveLength(1)
    expect(sql.match(/\bCOMMIT;/g)).toHaveLength(1)
    expect(sql).not.toMatch(/DISABLE\s+TRIGGER|session_replication_role|set_config\([^;]+false\)/i)
  })
  it("retains case idempotency and append-only audit history", () => {
    expect(sql).toContain("ON CONFLICT (company_id, engagement_no) DO NOTHING")
    expect(sql).toContain("ON CONFLICT (idempotency_key) DO NOTHING")
    expect(sql).not.toMatch(/DELETE\s+FROM\s+public\.sales_japan_operator_(cases|events)/i)
    const guard = readFileSync("supabase/migrations/20260802015455_japan_operator_operations_os.sql", "utf8")
    expect(guard).toContain("current_setting('app.japan_operator_mutation', true) IS DISTINCT FROM 'rpc'")
  })
})
