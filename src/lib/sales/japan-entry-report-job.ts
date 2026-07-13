import { DB_TABLES } from "./db-tables";
import type { BusinessModel } from "./japan-entry-projection";
import { generateJapanEntryProjection } from "./japan-entry-projection-service";
import type {
  JsonRecord,
  SalesEnrichmentJob,
  ServiceSupabase,
} from "./enrichment-jobs";
import { logDiagnosisEvent } from "./enrichment-jobs-runner-phases";
import type { SalesCompany } from "./types";

function optionalJobNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function jobBusinessModel(value: unknown): BusinessModel | undefined {
  return value === "ecommerce" || value === "saas" || value === "service"
    ? value
    : undefined;
}

export async function processJapanEntryReportJob(
  sb: ServiceSupabase,
  job: SalesEnrichmentJob,
  company: SalesCompany,
): Promise<{ ok: boolean; error?: string }> {
  const idempotencyKey = `report-job:${job.id}`;
  const result = await generateJapanEntryProjection(company.id, {
    businessModel: jobBusinessModel(job.input_payload.business_model),
    averageOrderValueUsd: optionalJobNumber(
      job.input_payload.average_order_value_usd,
    ),
    conversionRate: optionalJobNumber(job.input_payload.conversion_rate),
    grossMargin: optionalJobNumber(job.input_payload.gross_margin),
    currentJapanShare: optionalJobNumber(job.input_payload.current_japan_share),
    targetJapanShareMonth24: optionalJobNumber(
      job.input_payload.target_japan_share_month_24,
    ),
    idempotencyKey,
  });
  if (!result.ok || !result.projection || !result.opportunityBriefUrl) {
    return {
      ok: false,
      error: result.error ?? "Japan Entry Opportunity Brief generation failed",
    };
  }

  const resultPayload: JsonRecord = {
    projection_id: result.projection.id,
    canonical_url: result.opportunityBriefUrl,
    quality_score:
      result.projection.projection.messageGeneration?.qualityScore ?? null,
    safety_score:
      result.projection.projection.messageGeneration?.safetyScore ?? null,
    twenty_status: result.twentySync?.status ?? "failed",
    twenty_company_id: result.twentySync?.companyId ?? null,
    sending_enabled: false,
    idempotency_key: idempotencyKey,
  };
  const partialUpdate = await sb
    .from(DB_TABLES.SALES_ENRICHMENT_JOBS)
    .update({ result_payload: resultPayload })
    .eq("id", job.id);
  if (partialUpdate.error) {
    console.error(
      "[sales-enrichment] Japan Entry report result persistence failed:",
      partialUpdate.error.message,
    );
    return { ok: false, error: partialUpdate.error.message };
  }
  if (!result.twentySync?.ok || result.twentySync.statusPersistenceError) {
    return {
      ok: false,
      error:
        result.twentySync?.statusPersistenceError ??
        result.twentySync?.error ??
        "Twenty sync failed after report generation",
    };
  }

  const completion = await sb
    .from(DB_TABLES.SALES_ENRICHMENT_JOBS)
    .update({
      status: "completed",
      result_payload: resultPayload,
      completed_at: new Date().toISOString(),
      locked_at: null,
      lock_owner: null,
      error_message: null,
    })
    .eq("id", job.id);
  if (completion.error) return { ok: false, error: completion.error.message };

  await logDiagnosisEvent(sb, {
    companyId: company.id,
    jobId: job.id,
    eventType: "japan_entry_opportunity_ready",
    status: "success",
    title: "Japan Entry Opportunity Briefの生成とTwenty同期が完了しました",
    message: result.opportunityBriefUrl,
    payload: resultPayload,
  });
  return { ok: true };
}
