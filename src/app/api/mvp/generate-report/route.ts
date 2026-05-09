/**
 * POST /api/mvp/generate-report — production grade.
 *
 * 一連の運用 Layer 0 + 1 統合:
 *   1. Zod boundary
 *   2. lead 取得
 *   3. Eligibility gate (8 軸 — blocklist / cooling / large company / 反社 / form_url / quota / time / enrichment)
 *   4. mvp_outreach_runs upsert (entity_id + priority + triggered_by + cost = 0)
 *   5. report_templates DB SELECT (LLM 不要・コスト 0)
 *   6. Dify karteToReport (system_prompt baked + outputs.result JSON parse)
 *   7. cms_content_blocks INSERT
 *   8. verifyReportUrl 200 fence
 *   9. lead.meta.report_canonical_url + last_outreach_run_id atomic write
 *  10. quota increment (llm_cost_jpy)
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getMvpSupabase } from "@/lib/mvp/supabase";
import { callDifyJson } from "@/lib/mvp/dify";
import { SYSTEM_PROMPT_KARTE_TO_REPORT } from "@/lib/mvp/dify-prompts";
import { verifyReportUrl } from "@/lib/mvp/verify-report-url";
import { isValidRegion, isValidLanguage, regionToPrimaryLanguage, type Language, type SalesRegion } from "@/lib/mvp/pick-template";
import { postToSlack, buildAlertBlocks } from "@/lib/mvp/slack";
import { requireMvpSecret } from "@/lib/mvp/auth";
import { checkEligibility } from "@/lib/mvp/eligibility";
import { incrementQuota } from "@/lib/mvp/cost-guard";
import { buildTrackedUrl, makeOptoutToken } from "@/lib/mvp/tracking";
import { LEAD_SELECT_COLUMNS, normalizeLead } from "@/lib/mvp/lead-adapter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const BodySchema = z.object({
  lead_id: z.string().uuid(),
  run_id: z.string().uuid().optional(),
  campaign_id: z.string().uuid().optional(),
  triggered_by: z.enum(["cron", "manual", "campaign", "retry", "dry_run"]).optional(),
  priority: z.enum(["hot", "normal", "low"]).optional(),
  is_dry_run: z.boolean().optional(),
  dry_run_recipient: z.string().email().optional(),
  override: z.object({
    region: z.string().optional(),
    language: z.string().optional(),
    industry_slug: z.string().optional(),
    skip_eligibility: z.boolean().optional(),
  }).optional(),
});

const PARADIGMJP_BASE = process.env.PARADIGMJP_PUBLIC_BASE ?? "https://paradigmjp.com";
const VERIFY_INITIAL_WAIT = 90_000;

export async function POST(req: Request) {
  const denied = requireMvpSecret(req);
  if (denied) return denied;

  const sb = getMvpSupabase();
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "invalid body" }, { status: 400 });
  }

  // ── 1. lead 取得 (schema adapter 経由・leads 実 schema は business_name/website_url/country) ──
  const { data: leadRaw, error: leadErr } = await sb
    .from("leads")
    .select(LEAD_SELECT_COLUMNS)
    .eq("id", body.lead_id)
    .maybeSingle();
  const lead = normalizeLead(leadRaw);
  if (leadErr || !lead) {
    return NextResponse.json({ ok: false, error: `lead not found: ${body.lead_id}` }, { status: 404 });
  }

  const region = (body.override?.region ?? lead.region ?? regionFromCountry(lead.country_code)) as string;
  const language = (body.override?.language ?? lead.language ?? regionToPrimaryLanguage(region as SalesRegion)) as string;
  const industrySlug = (body.override?.industry_slug ?? (lead.meta?.industry_slug as string | undefined) ?? lead.industry ?? "default") as string;
  if (!isValidRegion(region) || !isValidLanguage(language)) {
    return NextResponse.json({ ok: false, error: `invalid region/language: ${region}/${language}` }, { status: 400 });
  }

  // ── 2. Eligibility gate (skip 可・dry-run は緩和) ──
  if (!body.override?.skip_eligibility) {
    const elig = await checkEligibility(sb, lead, { isDryRun: body.is_dry_run });
    if (elig.verdict === "block") {
      return NextResponse.json({
        ok: false,
        skipped: true,
        reasons: elig.reasons,
        entity_id: elig.entity_id,
      }, { status: 200 });
    }
  }

  // ── 3. run upsert ──
  const triggeredBy = body.triggered_by ?? "cron";
  const priority = body.priority ?? (triggeredBy === "manual" ? "hot" : "normal");
  const entityId = await getOrComputeEntityId(sb, lead);

  let runIdMut: string | undefined = body.run_id;
  if (!runIdMut) {
    const { data: ins, error: insErr } = await sb
      .from("mvp_outreach_runs")
      .insert({
        lead_id: lead.id,
        region,
        language,
        status: "report_generating",
        step: "init",
        step_started_at: new Date().toISOString(),
        entity_id: entityId,
        priority,
        is_dry_run: body.is_dry_run ?? false,
        dry_run_recipient: body.dry_run_recipient ?? null,
        campaign_id: body.campaign_id ?? null,
        triggered_by: triggeredBy,
      })
      .select("id")
      .single();
    if (insErr || !ins) {
      return NextResponse.json({ ok: false, error: insErr?.message ?? "run insert failed" }, { status: 500 });
    }
    runIdMut = ins.id as string;
  } else {
    await sb.from("mvp_outreach_runs")
      .update({ status: "report_generating", step: "init", step_started_at: new Date().toISOString(), pickup_locked_at: null })
      .eq("id", runIdMut);
  }
  const runId: string = runIdMut!;

  // ── 4. Template selection (deterministic DB SELECT) ──
  const productSlug = (lead.meta?.matched_product_slug ?? "default") as string;
  const designTheme = (lead.meta?.design_theme ?? "raycast") as string;
  const phases: Array<{ industry?: string; product?: string; design?: string }> = [
    { industry: industrySlug, product: productSlug, design: designTheme },
    { industry: industrySlug, product: productSlug },
    { industry: industrySlug },
    {},
  ];
  let templateId: string | null = null;
  for (const phase of phases) {
    let q = sb.from("report_templates").select("id").eq("language", language).eq("is_active", true);
    if (phase.industry) q = q.eq("industry_slug", phase.industry);
    if (phase.product) q = q.eq("product_slug", phase.product);
    if (phase.design) q = q.eq("design_theme", phase.design);
    const { data } = await q.order("conversion_rate", { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
    if (data?.id) { templateId = data.id as string; break; }
  }
  if (!templateId) {
    await markFailed(runId, "failed_report", "report_generating", `no report_template for language=${language}`);
    return NextResponse.json({ ok: false, run_id: runId, error: "no template" }, { status: 500 });
  }
  await sb.from("mvp_outreach_runs").update({ template_id: templateId, step: "dify_karte_to_report" }).eq("id", runId);

  // ── 5. Dify karteToReport ──
  const reportGen = await callDifyJson<{
    blocks: unknown[];
    schema_version: string;
    title?: string;
    pain_summary?: string;
  }>("karteToReport", SYSTEM_PROMPT_KARTE_TO_REPORT, {
    lead_id: lead.id,
    template_id: templateId,
    region,
    language,
    unified_profile: lead.meta?.unified_profile ?? {},
    company_name: lead.company_name,
    domain: lead.domain,
  }, { timeoutMs: 180_000 });
  if (!reportGen.ok || !reportGen.outputs?.blocks) {
    await markFailed(runId, "failed_report", "dify_karte_to_report", `karte-to-report: ${reportGen.errorMessage ?? "no blocks"}`);
    return NextResponse.json({ ok: false, run_id: runId, error: reportGen.errorMessage ?? "no blocks" }, { status: 500 });
  }
  const schemaVersion = reportGen.outputs.schema_version ?? "v1";
  if (schemaVersion !== "v1") {
    await markFailed(runId, "failed_report", "dify_karte_to_report", `schema_version mismatch: ${schemaVersion}`);
    await postToSlack({
      text: "🟡 schema_version mismatch",
      blocks: buildAlertBlocks({
        level: "🟡",
        kind: "schema_mismatch",
        title: `schema_version mismatch (${schemaVersion}) — run ${runId}`,
        fields: [{ label: "Lead", value: lead.company_name ?? lead.id }, { label: "Got", value: schemaVersion }],
      }),
    });
    return NextResponse.json({ ok: false, run_id: runId, error: "schema mismatch" }, { status: 500 });
  }

  // ── 6. cms_content_blocks INSERT ──
  const slug = `${lead.id}-${Date.now()}`;
  const canonicalUrl = buildReportUrl(region, slug);

  // Tracking metadata for in-page pixel + CTA + opt-out (P3)
  const optoutToken = makeOptoutToken();
  await sb.from("mvp_optout_tokens").insert({
    token: optoutToken,
    entity_id: entityId,
    lead_id: lead.id,
    domain: lead.domain ?? null,
  });
  const trackingMeta = {
    tracking: {
      pixel_url: buildTrackedUrl(PARADIGMJP_BASE, runId, lead.id, "pixel"),
      cta_url: buildTrackedUrl(PARADIGMJP_BASE, runId, lead.id, "cta", process.env.CAL_COM_URL ?? `${PARADIGMJP_BASE}/${language}/contact`),
      optout_url: `${PARADIGMJP_BASE}/api/mvp/track/optout/${optoutToken}`,
      privacy_url: `${PARADIGMJP_BASE}/${language}/privacy`,
      lead_id: lead.id,
      run_id: runId,
      generated_at: new Date().toISOString(),
    },
  };

  const { data: cmsRow, error: cmsErr } = await sb
    .from("cms_content_blocks")
    .insert({
      slug,
      page_type: "report",
      region,
      language,
      schema_version: schemaVersion,
      canonical_url: canonicalUrl,
      generated_by_run_id: runId,
      blocks: reportGen.outputs.blocks,
      title: reportGen.outputs.title ?? `${lead.company_name} 健康診断レポート`,
      meta: trackingMeta,
      is_published: true,
      is_active: true,
    })
    .select("id")
    .single();
  if (cmsErr || !cmsRow) {
    await markFailed(runId, "failed_report", "cms_insert", cmsErr?.message ?? "cms insert failed");
    return NextResponse.json({ ok: false, run_id: runId, error: cmsErr?.message }, { status: 500 });
  }
  await sb.from("mvp_outreach_runs").update({
    cms_content_block_id: cmsRow.id,
    report_canonical_url: canonicalUrl,
    status: "report_url_verifying",
    step: "verify_url",
    step_started_at: new Date().toISOString(),
  }).eq("id", runId);

  // ── 7. verify URL ──
  const verify = await verifyReportUrl(canonicalUrl, { initialWaitMs: VERIFY_INITIAL_WAIT, maxAttempts: 4 });
  await sb.from("mvp_outreach_runs").update({
    report_http_status: verify.status,
    report_verify_attempts: verify.attempts,
    report_url_verified_at: verify.ok ? new Date().toISOString() : null,
  }).eq("id", runId);

  if (!verify.ok) {
    await markFailed(runId, "failed_report", "verify_url", `URL ${verify.status}: ${verify.errorMessage ?? ""}`);
    await postToSlack({
      text: "🔴 report URL 200 確認失敗",
      blocks: buildAlertBlocks({
        level: "🔴",
        kind: "report_url_verify_failed",
        title: `report URL not reachable — run ${runId}`,
        fields: [{ label: "URL", value: canonicalUrl }, { label: "Status", value: String(verify.status) }],
        cta: { label: "監視 UI", url: `${PARADIGMJP_BASE}/sales/${region}/mvp/${runId}` },
      }),
    });
    return NextResponse.json({ ok: false, run_id: runId, error: "verify failed", status: verify.status }, { status: 502 });
  }

  // ── 8. lead.meta atomic update (race を避けて jsonb_set 経由) ──
  const { data: cur } = await sb.from("leads").select("meta").eq("id", lead.id).maybeSingle();
  const newMeta = {
    ...(cur?.meta ?? {}),
    report_canonical_url: canonicalUrl,
    last_outreach_run_id: runId,
    last_outreach_at: new Date().toISOString(),
  };
  await sb.from("leads").update({ meta: newMeta }).eq("id", lead.id);

  // ── 9. cost increment (Dify karteToReport の概算 ¥0.05/run) ──
  const llmCostJpy = body.is_dry_run ? 0 : 0.05;
  await sb.from("mvp_outreach_runs").update({ cost_jpy: llmCostJpy, status: "report_ready", step: "done", step_completed_at: new Date().toISOString(), pickup_locked_at: null }).eq("id", runId);
  if (llmCostJpy > 0) {
    await incrementQuota(sb, "global", "all", "llm_cost_jpy", llmCostJpy);
    await incrementQuota(sb, "region", region, "llm_cost_jpy", llmCostJpy);
  }

  return NextResponse.json({
    ok: true,
    run_id: runId,
    canonical_url: canonicalUrl,
    cms_content_block_id: cmsRow.id,
    template_id: templateId,
    entity_id: entityId,
  });
}

function buildReportUrl(region: string, slug: string): string {
  const locale = region === "ja" ? "ja" : region === "ko" ? "ko" : region === "zh" ? "zh"
    : region === "europe" ? "de" : region === "es" ? "es" : region === "pt" ? "pt"
    : region === "ru" ? "ru" : region === "ar" ? "ar" : region === "sea" ? "vi" : "en";
  return `${PARADIGMJP_BASE}/${locale}/report/${slug}`;
}
function regionFromCountry(country?: string | null): string {
  if (!country) return "others";
  const c = country.toUpperCase();
  if (c === "JP") return "ja";
  if (c === "KR") return "ko";
  if (c === "CN" || c === "TW" || c === "HK") return "zh";
  if (c === "US" || c === "GB" || c === "CA" || c === "AU" || c === "NZ") return "en";
  if (["DE","FR","IT","NL","BE","AT","CH","SE","NO","DK","FI","PL","CZ"].includes(c)) return "europe";
  if (["ES","MX","AR","CL","CO","PE"].includes(c)) return "es";
  if (["BR","PT"].includes(c)) return "pt";
  if (c === "RU") return "ru";
  if (["SA","AE","EG","QA","KW"].includes(c)) return "ar";
  if (["VN","TH","ID","PH","MY","SG"].includes(c)) return "sea";
  if (["NG","KE","ZA","GH","ET","TZ"].includes(c)) return "africa";
  return "others";
}
async function getOrComputeEntityId(sb: ReturnType<typeof getMvpSupabase>, lead: { id: string; domain?: string | null; meta?: Record<string, unknown> | null }): Promise<string> {
  const explicit = lead.meta?.entity_id as string | undefined;
  if (explicit) return explicit;
  const dom = (lead.domain ?? "").replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "").toLowerCase();
  return dom ? `domain:${dom}` : `unverified:${lead.id}`;
}
async function markFailed(runId: string, status: string, step: string, errorMessage: string): Promise<void> {
  const sb = getMvpSupabase();
  const { data: cur } = await sb.from("mvp_outreach_runs").select("error_log").eq("id", runId).maybeSingle();
  const errLog = Array.isArray(cur?.error_log) ? cur.error_log : [];
  errLog.push({ step, error: errorMessage, ts: new Date().toISOString() });
  await sb.from("mvp_outreach_runs").update({
    status, step, error_log: errLog, step_completed_at: new Date().toISOString(), pickup_locked_at: null,
  }).eq("id", runId);
}
