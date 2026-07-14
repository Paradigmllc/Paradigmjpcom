import { getServiceSalesSupabase } from "@/lib/supabase";
import { DB_TABLES } from "./db-tables";
import {
  collectInitialFormDraftEvidence,
  initialDraftTechnologyNames,
} from "./initial-form-draft-evidence";
import { generatePersonalizedJapanEntryMessage } from "./japan-entry-personalized-message";
import { syncListLeadToTwenty } from "./twenty-sync-list-lead";

type JsonRecord = Record<string, unknown>;
type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>;

const GENERATION_VERSION = "initial-interest-v1";

interface CompanyRow {
  id: string;
  company_name: string;
  domain: string;
  industry: string | null;
  target_country: string | null;
  tech_stack: unknown;
  meta: JsonRecord | null;
}

interface TargetRow {
  companyId: string;
  runId: string | null;
  candidateId: string | null;
}

export interface InitialFormDraftResult {
  ok: boolean;
  companyId: string;
  companyName?: string;
  domain?: string;
  draftId?: string;
  message?: string;
  qualityScore?: number;
  safetyScore?: number;
  twentySyncStatus?: "synced" | "failed";
  error?: string;
}

export interface InitialFormDraftBatchInput {
  runIds?: string[];
  companyIds?: string[];
  limit?: number;
  force?: boolean;
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function getSb(): ServiceSupabase {
  const sb = getServiceSalesSupabase();
  if (!sb) throw new Error("Supabase service_role not configured");
  return sb;
}

function eligibilityError(company: CompanyRow): string | null {
  const meta = record(company.meta);
  const form = record(meta.form_discovery);
  const lead = record(meta.lead_candidate);
  const score = record(lead.score);
  if (meta.list_only !== true) return "Company is not in the reviewed list-only lane";
  if (form.verification !== "form" || typeof meta.contact_form_url !== "string") return "A deterministically verified form is required";
  if (typeof form.confidence !== "number" || form.confidence < 80) return "Verified form confidence is below 80";
  if (typeof score.opportunityScore !== "number" || score.opportunityScore < 68) return "Opportunity score is below 68";
  if (typeof score.smbScore !== "number" || score.smbScore < 50) return "SMB score is below 50";
  const detected = initialDraftTechnologyNames(company.tech_stack);
  if (detected.length >= 15 || detected.some((name) => /adobe experience manager|sitecore|sap commerce|salesforce commerce cloud|oracle commerce|hybris|workday/i.test(name))) {
    return "Enterprise-like technology stack is excluded from the SMB lane";
  }
  return null;
}

async function existingDraft(sb: ServiceSupabase, companyId: string) {
  const { data, error } = await sb
    .from(DB_TABLES.SALES_INITIAL_FORM_DRAFTS)
    .select("id, company_id, status, message, review, twenty_sync_status")
    .eq("company_id", companyId)
    .eq("generation_version", GENERATION_VERSION)
    .eq("status", "needs_review")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as { id: string; message: string | null; review: JsonRecord; twenty_sync_status: string } | null;
}

export async function generateInitialFormDraft(
  target: TargetRow,
  force = false,
): Promise<InitialFormDraftResult> {
  const sb = getSb();
  const { data, error } = await sb
    .from(DB_TABLES.SALES_COMPANIES)
    .select("id, company_name, domain, industry, target_country, tech_stack, meta")
    .eq("id", target.companyId)
    .single();
  if (error || !data) return { ok: false, companyId: target.companyId, error: error?.message ?? "Company not found" };
  const company = data as CompanyRow;
  const ineligible = eligibilityError(company);
  if (ineligible) return { ok: false, companyId: company.id, companyName: company.company_name, domain: company.domain, error: ineligible };

  if (!force) {
    const existing = await existingDraft(sb, company.id);
    if (existing?.message && existing.twenty_sync_status === "synced") {
      return {
        ok: true,
        companyId: company.id,
        companyName: company.company_name,
        domain: company.domain,
        draftId: existing.id,
        message: existing.message,
        qualityScore: typeof existing.review.score === "number" ? existing.review.score : undefined,
        safetyScore: typeof existing.review.safetyScore === "number" ? existing.review.safetyScore : undefined,
        twentySyncStatus: "synced",
      };
    }
  }

  const idempotencyKey = `${GENERATION_VERSION}:${target.runId ?? "direct"}:${company.id}:${force ? Date.now() : "stable"}`;
  let draftId: string;
  const inserted = await sb.from(DB_TABLES.SALES_INITIAL_FORM_DRAFTS).insert({
      company_id: company.id,
      candidate_id: target.candidateId,
      run_id: target.runId,
      idempotency_key: idempotencyKey,
      generation_version: GENERATION_VERSION,
      status: "generating",
      sent: false,
    }).select("id").single();
  if (inserted.error || !inserted.data) {
    if (!force && inserted.error?.code === "23505") {
      const prior = await sb.from(DB_TABLES.SALES_INITIAL_FORM_DRAFTS)
        .select("id, status")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (prior.error || !prior.data) return { ok: false, companyId: company.id, error: prior.error?.message ?? "Existing draft could not be loaded" };
      if (prior.data.status === "generating") return { ok: false, companyId: company.id, error: "Draft generation is already in progress" };
      draftId = String(prior.data.id);
      const reset = await sb.from(DB_TABLES.SALES_INITIAL_FORM_DRAFTS).update({
        status: "generating",
        message: null,
        evidence: {},
        review: {},
        usage: {},
        twenty_sync_status: "pending",
        error_message: null,
        sent: false,
      }).eq("id", draftId);
      if (reset.error) return { ok: false, companyId: company.id, error: reset.error.message };
    } else {
      return { ok: false, companyId: company.id, error: inserted.error?.message ?? "Draft row could not be created" };
    }
  } else {
    draftId = String(inserted.data.id);
  }

  try {
    const profile = await collectInitialFormDraftEvidence({
      domain: company.domain,
      industry: company.industry,
      techStack: company.tech_stack,
    });
    const companyName = profile.companyName ?? company.company_name;
    const generated = await generatePersonalizedJapanEntryMessage({
      companyName,
      industry: company.industry,
      productContext: profile.productContext,
      targetCountry: company.target_country,
      businessModel: profile.businessModel,
      audit: profile.audit,
      purpose: "initial_interest",
    });
    if (!generated.ok || !generated.message || !generated.review) {
      throw new Error(generated.error ?? "DeepSeek V4 Pro did not produce a reviewable draft");
    }
    const generatedAt = new Date().toISOString();
    const evidence = {
      source_url: profile.sourceUrl,
      title: profile.title,
      description: profile.description,
      headings: profile.headings,
      audit: profile.audit,
      business_model: profile.businessModel,
      observed_fact_ids: generated.review.observedFactIds,
    };
    const usage = generated.usage ?? {};
    const companyUpdate = await sb.from(DB_TABLES.SALES_COMPANIES).update({
      company_name: companyName,
      meta: {
        ...record(company.meta),
        initial_form_draft: {
          id: draftId,
          state: "needs_review",
          message: generated.message,
          product_context: profile.productContext,
          evidence,
          review: generated.review,
          usage,
          model: generated.review.model,
          generated_at: generatedAt,
          sent: false,
          contains_url: false,
        },
      },
    }).eq("id", company.id);
    if (companyUpdate.error) throw new Error(companyUpdate.error.message);
    const draftUpdate = await sb.from(DB_TABLES.SALES_INITIAL_FORM_DRAFTS).update({
      status: "needs_review",
      message: generated.message,
      product_context: profile.productContext,
      evidence,
      review: generated.review,
      model: generated.review.model,
      usage,
      generated_at: generatedAt,
      sent: false,
    }).eq("id", draftId);
    if (draftUpdate.error) throw new Error(draftUpdate.error.message);

    const twenty = await syncListLeadToTwenty(company.id);
    const twentyStatus = twenty.ok ? "synced" : "failed";
    const twentyUpdate = await sb.from(DB_TABLES.SALES_INITIAL_FORM_DRAFTS).update({
      twenty_sync_status: twentyStatus,
      twenty_company_id: twenty.companyId ?? null,
      error_message: twenty.ok ? null : twenty.error ?? "Twenty sync failed",
    }).eq("id", draftId);
    if (twentyUpdate.error) throw new Error(twentyUpdate.error.message);
    if (!twenty.ok) throw new Error(twenty.error ?? "Twenty sync failed");
    return {
      ok: true,
      companyId: company.id,
      companyName,
      domain: company.domain,
      draftId,
      message: generated.message,
      qualityScore: generated.review.score,
      safetyScore: generated.review.safetyScore,
      twentySyncStatus: "synced",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Initial form draft generation failed";
    console.error("[initial-form-draft] generation failed:", { companyId: company.id, error });
    const failed = await sb.from(DB_TABLES.SALES_INITIAL_FORM_DRAFTS).update({
      status: "failed",
      twenty_sync_status: "failed",
      error_message: message,
      sent: false,
    }).eq("id", draftId);
    if (failed.error) console.error("[initial-form-draft] failure persistence failed:", failed.error.message);
    return { ok: false, companyId: company.id, companyName: company.company_name, domain: company.domain, draftId, error: message };
  }
}

async function resolveTargets(input: InitialFormDraftBatchInput): Promise<TargetRow[]> {
  const sb = getSb();
  const limit = Math.min(Math.max(input.limit ?? 40, 1), 100);
  const targets = new Map<string, TargetRow>();
  const runIds = [...new Set((input.runIds ?? []).filter(Boolean))];
  if (runIds.length > 0) {
    const { data, error } = await sb
      .from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS)
      .select("run_id, candidate_id, company_id")
      .in("run_id", runIds)
      .eq("form_verified", true)
      .eq("twenty_synced", true)
      .not("company_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(limit * 2);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      const companyId = String(row.company_id);
      if (!targets.has(companyId)) targets.set(companyId, {
        companyId,
        runId: String(row.run_id),
        candidateId: row.candidate_id ? String(row.candidate_id) : null,
      });
    }
  }
  for (const companyId of input.companyIds ?? []) {
    if (companyId && !targets.has(companyId)) targets.set(companyId, { companyId, runId: null, candidateId: null });
  }
  return [...targets.values()].slice(0, limit);
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const output: R[] = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await fn(items[index] as T);
    }
  });
  await Promise.all(workers);
  return output;
}

export async function generateInitialFormDraftBatch(input: InitialFormDraftBatchInput) {
  const targets = await resolveTargets(input);
  const results = await mapLimit(targets, 3, (target) => generateInitialFormDraft(target, input.force === true));
  return {
    ok: results.every((result) => result.ok),
    requested: targets.length,
    generated: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    sent: 0 as const,
    results,
  };
}

export async function listInitialFormDrafts(runId: string, limit = 100) {
  const { data, error } = await getSb()
    .from(DB_TABLES.SALES_INITIAL_FORM_DRAFTS)
    .select("id, company_id, run_id, status, message, review, model, usage, twenty_sync_status, error_message, sent, generated_at, created_at, sales_companies(company_name, domain)")
    .eq("run_id", runId)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 200));
  if (error) throw new Error(error.message);
  return data ?? [];
}
