import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isSalesApiAuthorized } from "@/lib/sales/api-auth";
import { getServiceSalesSupabase } from "@/lib/supabase";
import { DB_TABLES } from "@/lib/sales/db-tables";
import {
  enqueueJapanEntryReportBatch,
  fetchRecentEnrichmentJobs,
} from "@/lib/sales/enrichment-jobs";
import {
  assessJapanEntryReportReadiness,
  type JapanEntryReportCandidate,
} from "@/lib/sales/japan-entry-report-readiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const enqueueSchema = z.object({
  companyIds: z.array(z.string().uuid()).min(1).max(100),
  requireCompetitors: z.boolean().default(true),
  priority: z.number().int().min(1).max(100).default(70),
  assumptions: z
    .object({
      businessModel: z.enum(["ecommerce", "saas", "service"]).optional(),
      averageOrderValueUsd: z.number().positive().max(1_000_000).optional(),
      conversionRate: z.number().positive().max(1).optional(),
      grossMargin: z.number().positive().max(1).optional(),
      currentJapanShare: z.number().min(0).max(1).optional(),
      targetJapanShareMonth24: z.number().positive().max(1).optional(),
    })
    .default({}),
});

const runSchema = z.object({
  limit: z.number().int().min(1).max(5).default(3),
});

const retrySchema = z.object({
  jobIds: z.array(z.string().uuid()).min(1).max(100),
});

async function authorized(req: NextRequest): Promise<boolean> {
  try {
    return await isSalesApiAuthorized(req);
  } catch (error) {
    console.error("[opportunity-report-batch] authorization failed:", error);
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!(await authorized(req)))
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  const limit = Math.max(
    1,
    Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 100), 100),
  );
  const jobs = await fetchRecentEnrichmentJobs(limit, "japan_entry_report");
  const summary = jobs.reduce<Record<string, number>>((counts, job) => {
    counts[job.status] = (counts[job.status] ?? 0) + 1;
    return counts;
  }, {});
  return NextResponse.json({ ok: true, jobs, summary, sendingEnabled: false });
}

export async function POST(req: NextRequest) {
  if (!(await authorized(req)))
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  let body: unknown;
  try {
    body = await req.json();
  } catch (error) {
    console.error("[opportunity-report-batch] invalid JSON:", error);
    return NextResponse.json(
      { ok: false, error: "invalid json body" },
      { status: 400 },
    );
  }
  const parsed = enqueueSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { ok: false, error: "invalid request", issues: parsed.error.issues },
      { status: 400 },
    );

  const companyIds = [...new Set(parsed.data.companyIds)];
  const sb = getServiceSalesSupabase();
  if (!sb)
    return NextResponse.json(
      { ok: false, error: "Supabase service_role not configured" },
      { status: 503 },
    );
  const companies = await sb
    .from(DB_TABLES.SALES_COMPANIES)
    .select("id, company_name, domain, slug, industry, meta")
    .in("id", companyIds);
  if (companies.error) {
    console.error(
      "[opportunity-report-batch] company lookup failed:",
      companies.error.message,
    );
    return NextResponse.json(
      { ok: false, error: companies.error.message },
      { status: 500 },
    );
  }

  const rows = (companies.data ?? []) as JapanEntryReportCandidate[];
  const foundIds = new Set(rows.map((company) => company.id));
  const missingCompanyIds = companyIds.filter(
    (companyId) => !foundIds.has(companyId),
  );
  const checked = rows.map((company) => ({
    company,
    readiness: assessJapanEntryReportReadiness(company, {
      requireCompetitors: parsed.data.requireCompetitors,
    }),
  }));
  const rejected = checked
    .filter((item) => !item.readiness.ready)
    .map((item) => ({
      companyId: item.company.id,
      companyName: item.company.company_name,
      score: item.readiness.score,
      reasons: item.readiness.reasons,
    }));
  const targets = checked
    .filter((item) => item.readiness.ready)
    .map((item) => ({
      companyId: item.company.id,
      payload: {
        business_model:
          parsed.data.assumptions.businessModel ?? item.readiness.businessModel,
        average_order_value_usd: parsed.data.assumptions.averageOrderValueUsd,
        conversion_rate: parsed.data.assumptions.conversionRate,
        gross_margin: parsed.data.assumptions.grossMargin,
        current_japan_share: parsed.data.assumptions.currentJapanShare,
        target_japan_share_month_24:
          parsed.data.assumptions.targetJapanShareMonth24,
        evidence_readiness_score: item.readiness.score,
        require_competitors: parsed.data.requireCompetitors,
        sending_enabled: false,
      },
    }));
  if (targets.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "生成可能な企業がありません",
        rejected,
        missingCompanyIds,
      },
      { status: 422 },
    );
  }

  const queued = await enqueueJapanEntryReportBatch({
    targets,
    triggeredBy: "operator_report_factory",
    priority: parsed.data.priority,
  });
  if (!queued.ok)
    return NextResponse.json(
      { ok: false, error: queued.error, rejected, missingCompanyIds },
      { status: 500 },
    );

  try {
    const { notifyBothChannels } = await import("@/lib/notify");
    await notifyBothChannels("sales", {
      title: `Opportunity Brief生成キュー: ${queued.queued.length}社`,
      message: `再利用${queued.reused.length}社、証拠不足${rejected.length}社、未送信モード固定`,
      link: "/ja/admin/opportunity-briefs",
      type: "japan_entry_report_batch_queued",
    });
  } catch (error) {
    console.error(
      "[opportunity-report-batch] enqueue notification failed:",
      error,
    );
  }

  return NextResponse.json(
    {
      ok: true,
      status: "queued",
      queued: queued.queued.length,
      reused: queued.reused.length,
      rejected,
      missingCompanyIds,
      sendingEnabled: false,
    },
    { status: 202 },
  );
}

export async function PUT(req: NextRequest) {
  if (!(await authorized(req)))
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  let raw: unknown = {};
  try {
    raw = await req.json();
  } catch (error) {
    console.error("[opportunity-report-batch] run body parse failed:", error);
  }
  const parsed = runSchema.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json(
      { ok: false, error: "invalid request", issues: parsed.error.issues },
      { status: 400 },
    );

  const { runEnrichmentJobs } =
    await import("@/lib/sales/enrichment-jobs-runner");
  const result = await runEnrichmentJobs(parsed.data.limit, [
    "japan_entry_report",
  ]);
  try {
    const { notifyBothChannels } = await import("@/lib/notify");
    await notifyBothChannels("sales", {
      title: `Opportunity Brief生成結果: ${result.completed}/${result.processed}社`,
      message:
        result.failed > 0
          ? `失敗${result.failed}社。管理画面で再試行理由を確認してください。`
          : "全件完了。送信処理は実行していません。",
      link: "/ja/admin/opportunity-briefs",
      type:
        result.failed > 0
          ? "japan_entry_report_batch_failed"
          : "japan_entry_report_batch_completed",
    });
  } catch (error) {
    console.error(
      "[opportunity-report-batch] completion notification failed:",
      error,
    );
  }
  return NextResponse.json(
    { ...result, sendingEnabled: false },
    { status: result.ok ? 200 : 207 },
  );
}

export async function PATCH(req: NextRequest) {
  if (!(await authorized(req)))
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  let body: unknown;
  try {
    body = await req.json();
  } catch (error) {
    console.error("[opportunity-report-batch] retry body parse failed:", error);
    return NextResponse.json(
      { ok: false, error: "invalid json body" },
      { status: 400 },
    );
  }
  const parsed = retrySchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { ok: false, error: "invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  const sb = getServiceSalesSupabase();
  if (!sb)
    return NextResponse.json(
      { ok: false, error: "Supabase service_role not configured" },
      { status: 503 },
    );
  const jobIds = [...new Set(parsed.data.jobIds)];
  const retried = await sb
    .from(DB_TABLES.SALES_ENRICHMENT_JOBS)
    .update({
      status: "queued",
      next_run_at: new Date().toISOString(),
      error_message: null,
      locked_at: null,
      lock_owner: null,
      updated_at: new Date().toISOString(),
    })
    .eq("job_type", "japan_entry_report")
    .eq("status", "failed")
    .in("id", jobIds)
    .select("id");
  if (retried.error) {
    console.error(
      "[opportunity-report-batch] retry update failed:",
      retried.error.message,
    );
    return NextResponse.json(
      { ok: false, error: retried.error.message },
      { status: 500 },
    );
  }
  try {
    const { notifyBothChannels } = await import("@/lib/notify");
    await notifyBothChannels("sales", {
      title: `Opportunity Brief再試行: ${retried.data?.length ?? 0}件`,
      message: "同じジョブIDを再利用し、重複生成とフォーム送信を行わずに再処理します。",
      link: "/ja/admin/opportunity-briefs",
      type: "japan_entry_report_batch_retried",
    });
  } catch (error) {
    console.error("[opportunity-report-batch] retry notification failed:", error);
  }
  return NextResponse.json({
    ok: true,
    retried: retried.data?.length ?? 0,
    ignored: jobIds.length - (retried.data?.length ?? 0),
    sendingEnabled: false,
  });
}
