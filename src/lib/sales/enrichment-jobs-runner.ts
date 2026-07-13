import { getServiceSalesSupabase } from "@/lib/supabase";
import { findCompanyById } from "./companies";
import { DB_TABLES } from "@/lib/sales/db-tables";
import type {
  SalesEnrichmentJob,
  EnrichmentJobType,
  EnrichmentRunResult,
  JsonRecord,
  ServiceSupabase,
} from "./enrichment-jobs";
import type { SalesCompany } from "./types";
import {
  logDiagnosisEvent,
  reportUrlFor,
  processEnrichmentPhase,
  processDiagnosisPhase,
  processReportPhase,
  processAssetPhase,
  processSyncPhase,
} from "./enrichment-jobs-runner-phases";
import { generateFullStackDemo } from "./demo-page-service";
import { readValidatedDemoSourceManifest } from "./demo-source-policy";
import { processJapanEntryReportJob } from "./japan-entry-report-job";

export type { EnrichmentRunResult };

const STALE_RUNNING_JOB_MS = 30 * 60_000;
const STALE_SCAN_LIMIT = 50;

function getSb(): ServiceSupabase | null {
  return getServiceSalesSupabase();
}

function nowIso(): string {
  return new Date().toISOString();
}

function newestTimestamp(
  row: Pick<
    SalesEnrichmentJob,
    "locked_at" | "updated_at" | "started_at" | "created_at"
  >,
): number {
  const timestamps = [
    row.locked_at,
    row.updated_at,
    row.started_at,
    row.created_at,
  ]
    .map((value) => (value ? Date.parse(value) : 0))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b - a);
  return timestamps[0] ?? 0;
}

async function fetchQueuedJobs(
  sb: ServiceSupabase,
  limit: number,
  jobTypes: EnrichmentJobType[] = [],
): Promise<SalesEnrichmentJob[]> {
  let query = sb
    .from(DB_TABLES.SALES_ENRICHMENT_JOBS)
    .select("*")
    .eq("status", "queued")
    .lte("next_run_at", new Date().toISOString())
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (jobTypes.length > 0) query = query.in("job_type", jobTypes);
  const { data, error } = await query;

  if (error) {
    console.error(
      "[sales-enrichment] fetch queued jobs failed:",
      error.message,
    );
    return [];
  }

  return (data ?? []) as SalesEnrichmentJob[];
}

export async function recoverStaleEnrichmentJobs(limit = 20): Promise<number> {
  const sb = getSb();
  if (!sb) return 0;

  const safeLimit = Math.max(1, Math.min(limit, STALE_SCAN_LIMIT));
  const { data, error } = await sb
    .from(DB_TABLES.SALES_ENRICHMENT_JOBS)
    .select("*")
    .eq("status", "running")
    .order("updated_at", { ascending: true })
    .limit(STALE_SCAN_LIMIT);

  if (error) {
    console.error(
      "[sales-enrichment] stale running job scan failed:",
      error.message,
    );
    return 0;
  }

  const staleJobs = ((data ?? []) as SalesEnrichmentJob[])
    .filter((job) => {
      const reference = newestTimestamp(job);
      return !!reference && Date.now() - reference > STALE_RUNNING_JOB_MS;
    })
    .slice(0, safeLimit);

  const recoveredAt = nowIso();
  if (staleJobs.length === 0) return 0;

  const ids = staleJobs.map((j) => j.id);
  const { error: updateError } = await sb
    .from(DB_TABLES.SALES_ENRICHMENT_JOBS)
    .update({
      status: "queued",
      error_message: "auto-retry: stale running enrichment job recovered",
      next_run_at: recoveredAt,
      started_at: null,
      locked_at: null,
      lock_owner: null,
    })
    .in("id", ids)
    .eq("status", "running");

  if (updateError) {
    console.error(
      "[sales-enrichment] stale running job recovery failed:",
      updateError.message,
    );
    return 0;
  }

  return staleJobs.length;
}

async function markJobFailure(
  sb: ServiceSupabase,
  job: SalesEnrichmentJob,
  message: string,
): Promise<void> {
  const nextAttempts = job.attempts + 1;
  // Opportunity Briefs are fail-closed: a weak/partial report must be visible
  // to an operator immediately instead of sitting in a delayed retry queue
  // with no durable timer. PATCH retries reuse the same job and projection key.
  const terminal =
    job.job_type === "japan_entry_report" || nextAttempts >= job.max_attempts;
  const delayMs = Math.min(30 * 60_000, 2 ** nextAttempts * 60_000);
  const retrying = !terminal;
  const { error } = await sb
    .from(DB_TABLES.SALES_ENRICHMENT_JOBS)
    .update({
      status: terminal ? "failed" : "queued",
      attempts: nextAttempts,
      error_message: message,
      next_run_at: new Date(Date.now() + delayMs).toISOString(),
      completed_at: terminal ? nowIso() : null,
      started_at: retrying ? null : job.started_at,
      locked_at: null,
      lock_owner: null,
    })
    .eq("id", job.id);

  if (error)
    console.error("[sales-enrichment] mark failure failed:", error.message);
}

async function claimJob(
  sb: ServiceSupabase,
  job: SalesEnrichmentJob,
  runnerId: string,
): Promise<boolean> {
  const claimedAt = nowIso();
  const { data, error } = await sb
    .from(DB_TABLES.SALES_ENRICHMENT_JOBS)
    .update({
      status: "running",
      error_message: null,
      started_at: claimedAt,
      locked_at: claimedAt,
      lock_owner: runnerId,
    })
    .eq("id", job.id)
    .eq("status", "queued")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[sales-enrichment] claim failed:", error.message);
    return false;
  }
  return !!data;
}

async function completeJob(
  sb: ServiceSupabase,
  job: SalesEnrichmentJob,
  company: SalesCompany,
  resultPayload: JsonRecord,
): Promise<void> {
  const { error } = await sb
    .from(DB_TABLES.SALES_ENRICHMENT_JOBS)
    .update({
      status: "completed",
      result_payload: resultPayload,
      completed_at: nowIso(),
      locked_at: null,
      lock_owner: null,
    })
    .eq("id", job.id);
  if (error)
    console.error("[sales-enrichment] complete job failed:", error.message);

  await logDiagnosisEvent(sb, {
    companyId: company.id,
    jobId: job.id,
    eventType: "report_ready",
    status: "success",
    title: "企業カルテと診断レポートを生成しました",
    message: reportUrlFor(company),
    payload: resultPayload,
  });

  // Notify on enrichment completion
  try {
    const { notifyBothChannels } = await import("@/lib/notify");
    await notifyBothChannels("sales", {
      title: `✅ エンリッチメント完了: ${company.company_name ?? company.domain}`,
      message: `レポートURL: ${reportUrlFor(company) ?? "N/A"}`,
      link: reportUrlFor(company) ?? undefined,
      type: "enrichment_completed",
    });
  } catch (e) {
    console.error("[sales-enrichment] notification failed:", e);
  }

  // Phase 2-1/2-2: resume the waiting pipeline run via Trigger.dev dispatch (event-driven,
  // isolated from the enrichment runner process; dispatchSalesPipelineRun falls back to an
  // app-side one-shot when Trigger.dev is not configured) instead of running it inline here.
  const pipelineRunId =
    typeof job.input_payload?.pipeline_run_id === "string"
      ? job.input_payload.pipeline_run_id
      : null;
  if (pipelineRunId) {
    try {
      const { dispatchSalesPipelineRun } = await import("./sales-pipeline");
      void dispatchSalesPipelineRun(pipelineRunId).catch((err: unknown) => {
        console.error(
          "[sales-enrichment] auto-resume pipeline dispatch failed:",
          err,
        );
      });
    } catch (importErr) {
      console.error(
        "[sales-enrichment] failed to import dispatchSalesPipelineRun for auto-resume:",
        importErr,
      );
    }
  }
}

async function processDemoGenerationJob(
  sb: ServiceSupabase,
  job: SalesEnrichmentJob,
  company: SalesCompany,
): Promise<{ ok: boolean; error?: string }> {
  const sourceReview = readValidatedDemoSourceManifest(company.meta);
  if (!sourceReview.ok)
    return {
      ok: false,
      error: `source manifest rejected: ${sourceReview.errors.join(", ")}`,
    };

  const locale = job.input_payload.locale === "en" ? "en" : "ja";
  const result = await generateFullStackDemo(company.id, locale, {
    publicationMode: "private_review",
    sourcePolicy: "reviewed_manifest",
    enhanceWithAI: true,
    notify: false,
  });
  if (!result.ok || !result.slug)
    return { ok: false, error: result.error ?? "demo quality gate failed" };

  const resultPayload: JsonRecord = {
    slug: result.slug,
    canonical_url: result.demoUrl,
    quality_score: result.qualityScore ?? null,
    quality_report: result.qualityReport ?? null,
    generation_candidates: result.candidates ?? [],
    publication_status: result.publicationStatus ?? "private_review",
    source_policy: "reviewed_manifest",
    sending_enabled: false,
  };
  const { error } = await sb
    .from(DB_TABLES.SALES_ENRICHMENT_JOBS)
    .update({
      status: "completed",
      result_payload: resultPayload,
      completed_at: nowIso(),
      locked_at: null,
      lock_owner: null,
    })
    .eq("id", job.id);
  if (error) return { ok: false, error: error.message };

  await logDiagnosisEvent(sb, {
    companyId: company.id,
    jobId: job.id,
    eventType: "private_demo_ready",
    status: "success",
    title: "非公開デモの品質審査が完了しました",
    message: result.demoUrl ?? undefined,
    payload: resultPayload,
  });
  return { ok: true };
}

// ── Orchestrator: runs all 5 phases sequentially, preserves partial results ──
export async function processJob(
  sb: ServiceSupabase,
  job: SalesEnrichmentJob,
): Promise<{ ok: boolean; error?: string }> {
  const company = await findCompanyById(job.company_id);
  if (!company) return { ok: false, error: "company not found" };

  if (job.job_type === "demo_generate") {
    return processDemoGenerationJob(sb, job, company);
  }
  if (job.job_type === "japan_entry_report") {
    return processJapanEntryReportJob(sb, job, company);
  }

  await logDiagnosisEvent(sb, {
    companyId: company.id,
    jobId: job.id,
    eventType: "karte_started",
    status: "info",
    title: "企業カルテ生成を開始しました",
    message: company.domain,
  });

  let currentCompany = company;

  // Phase 1: Enrichment (save eagerly)
  const phase1 = await processEnrichmentPhase(sb, job, currentCompany);
  if (!phase1.ok) {
    return { ok: false, error: phase1.error };
  }
  currentCompany = phase1.company!;

  // Phase 2: Diagnosis (Dify + Japan audit)
  const phase2 = await processDiagnosisPhase(sb, job, currentCompany);
  currentCompany = (await findCompanyById(job.company_id)) as SalesCompany;
  if (!currentCompany)
    return { ok: false, error: "company lost after diagnosis" };

  if (!phase2.ok) {
    return { ok: false, error: phase2.error };
  }

  // Phase 3: Report generation
  const phase3 = await processReportPhase(sb, job, currentCompany);
  let reportPhaseFailed = false;
  if (!phase3.ok) {
    console.error(
      "[sales-enrichment] Report phase failed but enrichment+diagnosis data is saved:",
      phase3.error,
    );
    reportPhaseFailed = true;
  }

  // Phase 4: Asset generation (conditional, errors are non-fatal)
  const phase4 = await processAssetPhase(
    sb,
    job,
    currentCompany,
    phase3.reportData,
  );

  // Phase 5: Sync + Complete
  const phase5 = await processSyncPhase(
    sb,
    job,
    currentCompany,
    {
      difyConfigured: phase2.difyConfigured,
      difyOk: phase2.difyOk,
      difyError: phase2.difyError,
      painSummary: phase2.painSummary,
      demoUrl: phase4.demoUrl,
      coverageScore: phase3.coverageScore,
    },
    completeJob,
  );

  return {
    ok: phase5.ok && !reportPhaseFailed,
    error: reportPhaseFailed
      ? (phase3.error ?? "report phase failed")
      : phase5.error,
  };
}

export async function runEnrichmentJobs(
  limit = 3,
  jobTypes: EnrichmentJobType[] = [],
): Promise<EnrichmentRunResult> {
  const sb = getSb();
  if (!sb) {
    return {
      ok: false,
      processed: 0,
      completed: 0,
      failed: 0,
      errors: ["Supabase service_role not configured"],
    };
  }

  const safeLimit = Math.max(1, Math.min(limit, 100));
  const runnerId = `next-${process.pid}-${Date.now()}`;
  await recoverStaleEnrichmentJobs(safeLimit);
  const jobs = await fetchQueuedJobs(sb, safeLimit, jobTypes);
  const errors: string[] = [];
  let completed = 0;
  let failed = 0;

  // Claim all jobs first (serial — DB lock requires it), then process in parallel
  const claimedJobs: SalesEnrichmentJob[] = [];
  for (const job of jobs) {
    const claimed = await claimJob(sb, job, runnerId);
    if (claimed) claimedJobs.push(job);
  }

  // Process claimed jobs in parallel with Promise.allSettled
  const results = await Promise.allSettled(
    claimedJobs.map(async (job) => {
      let result: { ok: boolean; error?: string };
      try {
        result = await processJob(sb, job);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(
          "[sales-enrichment] job processing exception:",
          job.id,
          message,
        );
        result = { ok: false, error: `exception: ${message}` };
      }
      return { job, result };
    }),
  );

  for (const settled of results) {
    if (settled.status === "rejected") {
      failed++;
      const message =
        settled.reason instanceof Error
          ? settled.reason.message
          : String(settled.reason);
      errors.push(`promise rejection: ${message}`);
    } else {
      const { job, result } = settled.value;
      if (result.ok) {
        completed++;
      } else {
        failed++;
        const message = result.error ?? "unknown enrichment error";
        errors.push(`${job.id}: ${message}`);
        await markJobFailure(sb, job, message);
        await logDiagnosisEvent(sb, {
          companyId: job.company_id,
          jobId: job.id,
          eventType: "karte_failed",
          status: "error",
          title: "企業カルテ生成に失敗しました",
          message,
        });
      }
    }
  }

  return {
    ok: failed === 0,
    processed: completed + failed,
    completed,
    failed,
    errors,
  };
}
