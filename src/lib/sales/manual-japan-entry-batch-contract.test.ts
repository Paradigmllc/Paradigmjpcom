import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import {
  MANUAL_WORK_BATCH_DRAIN_SIZE,
  MANUAL_WORK_BATCH_MAX_URLS,
  MANUAL_WORK_BATCH_QUEUE_MAX_BATCHES,
} from "./manual-japan-entry-batch-types"

describe("manual work durable batch contract", () => {
  const migration = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/20260720233215_manual_work_durable_batches.sql"), "utf8")
  const queueMigration = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/20260721164000_manual_work_multi_batch_queue.sql"), "utf8")
  const scaleMigration = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/20260721193000_manual_work_report_ownership_and_scale.sql"), "utf8")
  const batchStore = fs.readFileSync(path.join(process.cwd(), "src/lib/sales/manual-japan-entry-batch-store.ts"), "utf8")
  const fastService = fs.readFileSync(path.join(process.cwd(), "src/lib/sales/manual-work-fast-service.ts"), "utf8")
  const fastEvidence = fs.readFileSync(path.join(process.cwd(), "src/lib/sales/manual-work-fast-evidence.ts"), "utf8")
  const editorialBrief = fs.readFileSync(path.join(process.cwd(), "src/lib/sales/manual-work-editorial-brief.ts"), "utf8")
  const editorialWriter = fs.readFileSync(path.join(process.cwd(), "src/lib/sales/manual-work-gpt56-writer.ts"), "utf8")

  it("supports 500 URLs while keeping each database claim bounded", () => {
    expect(MANUAL_WORK_BATCH_MAX_URLS).toBe(500)
    expect(MANUAL_WORK_BATCH_DRAIN_SIZE).toBe(3)
    expect(migration).toContain("total_count BETWEEN 1 AND 500")
    expect(migration).toContain("FOR UPDATE SKIP LOCKED")
    expect(migration).toContain("least(coalesce(p_limit, 3), 3)")
  })

  it("keeps new batches homepage-only and defers all customer-facing writing", () => {
    expect(fastEvidence).toContain("ParadigmFastQualification/1.0")
    expect(fastEvidence).toContain("FAST_HOMEPAGE_TIMEOUT_MS = 5_000")
    expect(fastEvidence).toContain("auditJapanMarketReadinessFromHtml")
    expect(fastEvidence).not.toContain("fetchPageWithCrawl4Ai")
    expect(fastService).toContain('analysis_mode: "fast_qualification"')
    expect(fastService).toContain('twenty_sync_status: "skipped"')
    expect(fastService).toContain("form_url: null")
    expect(fastService).toContain("initial_message: null")
  })

  it("uses bounded multi-page evidence and GPT-5.6 without a DeepSeek or template fallback", () => {
    expect(editorialBrief).toContain("MAX_EXTRA_PAGES = 4")
    expect(editorialBrief).toContain("PAGE_TIMEOUT_MS = 5_000")
    expect(editorialWriter).toContain('"gpt-5.6-terra"')
    expect(editorialWriter).toContain('"gpt-5.6-sol"')
    expect(editorialWriter).toContain("DeepSeek fallback is intentionally disabled")
    expect(editorialWriter).toContain("score < 88")
  })

  it("is service-role-only, RLS protected, resumable, and permanently zero-send", () => {
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY")
    expect(migration).toContain("REVOKE ALL ON public.manual_japan_entry_batches FROM PUBLIC, anon, authenticated")
    expect(migration).toContain("TO service_role")
    expect(migration).toContain("claimed_at < now() - interval '10 minutes'")
    expect(migration).toContain("sent boolean NOT NULL DEFAULT false CHECK (sent = false)")
    expect(queueMigration).toContain("uq_manual_japan_entry_single_running_batch")
  })

  it("queues up to 20 batches, promotes one runner atomically, and leases each drain", () => {
    expect(MANUAL_WORK_BATCH_QUEUE_MAX_BATCHES).toBe(20)
    expect(queueMigration).toContain("v_open_batches >= 20")
    expect(queueMigration).toContain("pg_advisory_xact_lock")
    expect(queueMigration).toContain("manual_japan_entry_promote_next_batch")
    expect(queueMigration).toContain("manual_japan_entry_claim_batch_drain")
    expect(queueMigration).toContain("manual_japan_entry_release_batch_drain")
    expect(queueMigration).toContain("WHERE status = 'running'")
    expect(queueMigration).toContain("batch.status = 'running'")
  })

  it("keeps 100-500 row drains constant-size and preserves durable compact snapshots", () => {
    expect(scaleMigration).toContain("queued_count integer NOT NULL DEFAULT 0")
    expect(scaleMigration).toContain("processing_count integer NOT NULL DEFAULT 0")
    expect(scaleMigration).toContain("failed_count integer NOT NULL DEFAULT 0")
    expect(scaleMigration).toContain("interval '16 minutes'")
    expect(scaleMigration).toContain("interval '20 minutes'")
    expect(batchStore).toContain("getManualWorkBatchCompact")
    expect(batchStore).toContain("return { batch, items: [], counts")
  })
})
