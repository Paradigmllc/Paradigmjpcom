import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { MANUAL_WORK_BATCH_DRAIN_SIZE, MANUAL_WORK_BATCH_MAX_URLS } from "./manual-japan-entry-batch-types"

describe("manual work durable batch contract", () => {
  const migration = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/20260720233215_manual_work_durable_batches.sql"), "utf8")

  it("supports 500 URLs while keeping each server drain bounded", () => {
    expect(MANUAL_WORK_BATCH_MAX_URLS).toBe(500)
    expect(MANUAL_WORK_BATCH_DRAIN_SIZE).toBe(3)
    expect(migration).toContain("total_count BETWEEN 1 AND 500")
    expect(migration).toContain("FOR UPDATE SKIP LOCKED")
    expect(migration).toContain("least(coalesce(p_limit, 3), 3)")
  })

  it("is service-role-only, RLS protected, resumable, and permanently zero-send", () => {
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY")
    expect(migration).toContain("REVOKE ALL ON public.manual_japan_entry_batches FROM PUBLIC, anon, authenticated")
    expect(migration).toContain("TO service_role")
    expect(migration).toContain("claimed_at < now() - interval '10 minutes'")
    expect(migration).toContain("sent boolean NOT NULL DEFAULT false CHECK (sent = false)")
    expect(migration).toContain("uq_manual_japan_entry_single_active_batch")
  })
})
