import { getServiceSalesSupabase } from "@/lib/supabase";
import { cacheHitRatio } from "@/lib/deepseek";
import { DB_TABLES } from "./db-tables";
import { findCompanyById } from "./companies";
import {
  buildJapanEntryProjection,
  type BusinessModel,
  type JapanEntryProjection,
} from "./japan-entry-projection";
import { generatePersonalizedJapanEntryMessage } from "./japan-entry-personalized-message";
import { companyJapanMarketAudit } from "./company-data-view";
import type { MarketVisibilityIndex } from "./market-visibility";
import { syncCompanyKarteToTwenty } from "./twenty-sync-companies";
import type { TwentySyncResult } from "./twenty-sync-utils";
import { buildOpportunityBriefUrl, normalizeReportLocale } from "./routing";

type JsonRecord = Record<string, unknown>;

export interface GenerateProjectionOptions {
  businessModel?: BusinessModel;
  averageOrderValueUsd?: number;
  conversionRate?: number;
  grossMargin?: number;
  currentJapanShare?: number;
  targetJapanShareMonth24?: number;
  idempotencyKey?: string;
}

export interface StoredJapanEntryProjection {
  id: string;
  company_id: string;
  status: "needs_review" | "approved" | "superseded";
  projection: JapanEntryProjection;
  initial_message: string;
  idempotency_key?: string | null;
  created_at: string;
}

export interface JapanEntryTwentySyncResult extends TwentySyncResult {
  status: "synced" | "not_configured" | "failed";
  projectionId: string;
  attemptedAt: string;
  sent: false;
  statusPersistenceError?: string;
}

export async function syncJapanEntryProjectionToTwenty(
  companyId: string,
  projectionId: string,
): Promise<JapanEntryTwentySyncResult> {
  const attemptedAt = new Date().toISOString();
  const sb = getServiceSalesSupabase();
  if (!sb) {
    return {
      ok: false,
      configured: false,
      status: "not_configured",
      projectionId,
      attemptedAt,
      sent: false,
      error: "Supabase service_role not configured",
      statusPersistenceError: "Supabase service_role not configured",
    };
  }

  const syncResult = await syncCompanyKarteToTwenty(companyId, {
    syncOpportunities: false,
  });
  const status = syncResult.ok
    ? "synced"
    : syncResult.configured
      ? "failed"
      : "not_configured";
  const twentySync: JapanEntryTwentySyncResult = {
    ...syncResult,
    status,
    projectionId,
    attemptedAt,
    sent: false,
  };
  const syncStatusUpdate = await sb.rpc("sales_atomic_meta_merge", {
    p_company_id: companyId,
    p_patch: {
      japan_entry_twenty_sync: {
        status,
        configured: syncResult.configured,
        twenty_company_id: syncResult.companyId ?? null,
        home_synced: syncResult.homeSynced ?? false,
        error: syncResult.error ?? null,
        projection_id: projectionId,
        attempted_at: attemptedAt,
        sent: false,
      },
    },
  });
  if (syncStatusUpdate.error) {
    console.error(
      "[japan-entry-projection] Twenty sync status persistence failed:",
      syncStatusUpdate.error.message,
    );
    twentySync.statusPersistenceError = syncStatusUpdate.error.message;
  }
  return twentySync;
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function visibilityFromMeta(meta: JsonRecord): MarketVisibilityIndex | null {
  const smbSignals = asRecord(meta.smb_signals);
  const candidate =
    asRecord(smbSignals?.marketVisibility) ?? asRecord(meta.market_visibility);
  if (!candidate || candidate.version !== "public-signals-v1") return null;
  if (typeof candidate.band !== "string" || !Array.isArray(candidate.evidence))
    return null;
  return candidate as unknown as MarketVisibilityIndex;
}

function productContextFromMeta(meta: JsonRecord): string | null {
  const scan = asRecord(meta.scan);
  const websiteAssets = asRecord(meta.website_assets);
  const candidates = [
    scan?.html_description,
    meta.html_description,
    websiteAssets?.description,
    websiteAssets?.summary,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length >= 12)
      return candidate.trim().slice(0, 600);
  }
  return null;
}

export async function getLatestJapanEntryProjection(
  companyId: string,
): Promise<{
  ok: boolean;
  projection: StoredJapanEntryProjection | null;
  error?: string;
}> {
  const sb = getServiceSalesSupabase();
  if (!sb)
    return {
      ok: false,
      projection: null,
      error: "Supabase service_role not configured",
    };
  const { data, error } = await sb
    .from(DB_TABLES.SALES_JAPAN_ENTRY_PROJECTIONS)
    .select(
      "id, company_id, status, projection, initial_message, idempotency_key, created_at",
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error(
      "[japan-entry-projection] latest fetch failed:",
      error.message,
    );
    return { ok: false, projection: null, error: error.message };
  }
  return { ok: true, projection: data as StoredJapanEntryProjection | null };
}

export async function generateJapanEntryProjection(
  companyId: string,
  options: GenerateProjectionOptions = {},
): Promise<{
  ok: boolean;
  projection?: StoredJapanEntryProjection;
  twentySync?: JapanEntryTwentySyncResult;
  opportunityBriefUrl?: string | null;
  error?: string;
}> {
  const sb = getServiceSalesSupabase();
  if (!sb) return { ok: false, error: "Supabase service_role not configured" };
  const company = await findCompanyById(companyId);
  if (!company) return { ok: false, error: "company not found" };
  const idempotencyKey = options.idempotencyKey?.trim() || null;
  const opportunityBriefUrl = company.slug
    ? buildOpportunityBriefUrl(
        normalizeReportLocale(company.report_locale, "global"),
        company.slug,
      )
    : null;
  if (idempotencyKey) {
    const existing = await sb
      .from(DB_TABLES.SALES_JAPAN_ENTRY_PROJECTIONS)
      .select(
        "id, company_id, status, projection, initial_message, idempotency_key, created_at",
      )
      .eq("company_id", company.id)
      .eq("idempotency_key", idempotencyKey)
      .limit(1)
      .maybeSingle();
    if (existing.error) {
      console.error(
        "[japan-entry-projection] idempotency lookup failed:",
        existing.error.message,
      );
      return { ok: false, error: existing.error.message };
    }
    if (existing.data) {
      const stored = existing.data as StoredJapanEntryProjection;
      const twentySync = await syncJapanEntryProjectionToTwenty(
        company.id,
        stored.id,
      );
      return { ok: true, projection: stored, twentySync, opportunityBriefUrl };
    }
  }
  const visibility = visibilityFromMeta(company.meta ?? {});
  if (!visibility) {
    return {
      ok: false,
      error: "public-signals-v1 market visibility evidence is required",
    };
  }

  let projection: JapanEntryProjection;
  let initialMessage: string;
  try {
    projection = buildJapanEntryProjection({
      companyName: company.company_name,
      domain: company.domain,
      targetCountry: company.target_country,
      visibility,
      businessModel: options.businessModel,
      averageOrderValueUsd: options.averageOrderValueUsd,
      conversionRate: options.conversionRate,
      grossMargin: options.grossMargin,
      currentJapanShare: options.currentJapanShare,
      targetJapanShareMonth24: options.targetJapanShareMonth24,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "projection calculation failed";
    console.error("[japan-entry-projection] calculation failed:", error);
    return { ok: false, error: message };
  }

  const personalized = await generatePersonalizedJapanEntryMessage({
    companyName: company.company_name,
    industry: company.industry,
    productContext: productContextFromMeta(company.meta ?? {}),
    targetCountry: company.target_country ?? null,
    businessModel: projection.assumptions.businessModel,
    projection,
    audit: companyJapanMarketAudit(company),
    competitorAnalysis: company.meta?.japan_entry_competitor_analysis,
  });
  if (!personalized.ok || !personalized.message || !personalized.review) {
    console.error(
      "[japan-entry-projection] DeepSeek V4 Pro message generation failed:",
      personalized.error,
    );
    return {
      ok: false,
      error: personalized.error ?? "DeepSeek V4 Pro message generation failed",
    };
  }
  initialMessage = personalized.message;
  projection = {
    ...projection,
    messageGeneration: {
      engine: "deepseek-v4-pro",
      model: personalized.review.model,
      qualityScore: personalized.review.score,
      safetyScore: personalized.review.safetyScore,
      wordCount: personalized.review.wordCount,
      observedFactIds: personalized.review.observedFactIds,
      attempts: personalized.review.attempts,
      editorialScores: personalized.review.editorialScores,
      rationale: personalized.review.rationale,
      riskFlags: personalized.review.riskFlags,
      promptTokens: personalized.usage?.prompt_tokens ?? 0,
      completionTokens: personalized.usage?.completion_tokens ?? 0,
      cacheHitTokens: personalized.usage?.cache_hit_tokens ?? 0,
      cacheMissTokens: personalized.usage?.cache_miss_tokens ?? 0,
      cacheHitRatio: cacheHitRatio(personalized.usage),
      generatedAt: new Date().toISOString(),
    },
  };

  const input = {
    domain: company.domain,
    target_country: company.target_country,
    business_model: projection.assumptions.businessModel,
    assumptions: projection.assumptions,
    visibility_version: visibility.version,
    visibility_band: visibility.band,
    idempotency_key: idempotencyKey,
    message_generation: projection.messageGeneration,
  };
  const { data, error } = await sb
    .from(DB_TABLES.SALES_JAPAN_ENTRY_PROJECTIONS)
    .insert({
      company_id: company.id,
      model_version: projection.modelVersion,
      status: "needs_review",
      input,
      evidence: projection.evidence,
      projection,
      initial_message: initialMessage,
      idempotency_key: idempotencyKey,
      created_by: "revenue_os",
    })
    .select(
      "id, company_id, status, projection, initial_message, idempotency_key, created_at",
    )
    .single();
  if (error) {
    console.error("[japan-entry-projection] insert failed:", error.message);
    return { ok: false, error: error.message };
  }

  const metaPatch = {
    japan_entry_projection: projection,
    japan_entry_opportunity_url: opportunityBriefUrl,
    japan_entry_initial_message: initialMessage,
    japan_entry_message_engine: "deepseek-v4-pro",
    japan_entry_message_review: projection.messageGeneration,
    japan_entry_outreach_state: "needs_review",
  };
  const metaUpdate = await sb.rpc("sales_atomic_meta_merge", {
    p_company_id: company.id,
    p_patch: metaPatch,
  });
  if (metaUpdate.error) {
    console.error(
      "[japan-entry-projection] company meta update failed:",
      metaUpdate.error.message,
    );
    const rollback = await sb
      .from(DB_TABLES.SALES_JAPAN_ENTRY_PROJECTIONS)
      .delete()
      .eq("id", data.id);
    if (rollback.error) {
      console.error(
        "[japan-entry-projection] projection rollback failed:",
        rollback.error.message,
      );
      return {
        ok: false,
        error: `${metaUpdate.error.message}; rollback failed: ${rollback.error.message}`,
      };
    }
    return { ok: false, error: metaUpdate.error.message };
  }

  const stored = data as StoredJapanEntryProjection;
  const twentySync = await syncJapanEntryProjectionToTwenty(
    company.id,
    stored.id,
  );
  return { ok: true, projection: stored, twentySync, opportunityBriefUrl };
}
