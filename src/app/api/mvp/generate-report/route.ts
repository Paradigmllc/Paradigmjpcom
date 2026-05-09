/**
 * POST /api/mvp/generate-report
 * n8n が叩く. lead_id を受け取り、Dify→cms_content_blocks INSERT→URL検証 まで完走.
 *
 * 永久ルール準拠:
 *   B33 #17 STRICT_LANGUAGE_GUARD 3 層
 *   B28 #11 customer-facing は Dify 必須
 *   B36 #19 cross-domain handoff = 同一プロセス内で完結 (URL 検証 fence あり)
 *   AE-5  Zod boundary
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

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const BodySchema = z.object({
  lead_id: z.string().uuid(),
  run_id: z.string().uuid().optional(),
  override: z
    .object({
      region: z.string().optional(),
      language: z.string().optional(),
      industry_slug: z.string().optional(),
    })
    .optional(),
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

  const { data: lead, error: leadErr } = await sb
    .from("leads")
    .select("id, company_name, domain, region, language, country_code, contact_form_url, meta")
    .eq("id", body.lead_id)
    .maybeSingle();
  if (leadErr || !lead) {
    return NextResponse.json({ ok: false, error: `lead not found: ${body.lead_id}` }, { status: 404 });
  }

  const region = (body.override?.region ?? lead.region ?? regionFromCountry(lead.country_code)) as string;
  const language = (body.override?.language ?? lead.language ?? regionToPrimaryLanguage(region as SalesRegion)) as string;
  const industrySlug = body.override?.industry_slug ?? lead.meta?.industry_slug ?? "default";

  if (!isValidRegion(region) || !isValidLanguage(language)) {
    return NextResponse.json(
      { ok: false, error: `invalid region/language: ${region}/${language}` },
      { status: 400 }
    );
  }

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
      })
      .select("id")
      .single();
    if (insErr || !ins) {
      return NextResponse.json({ ok: false, error: insErr?.message ?? "run insert failed" }, { status: 500 });
    }
    runIdMut = ins.id as string;
  } else {
    await sb
      .from("mvp_outreach_runs")
      .update({ status: "report_generating", step: "init", step_started_at: new Date().toISOString() })
      .eq("id", runIdMut);
  }
  const runId: string = runIdMut!;

  // ── 3. Template selection (deterministic DB SELECT・no LLM・cost saving) ──
  // report_templates schema は (language, country_iso, product_slug, industry_slug, variant_label, design_theme).
  // SalesRegion からは language を派生させて language eq で絞る (s10-5 #5 STRICT_LANGUAGE_GUARD).
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
    if (data?.id) {
      templateId = data.id as string;
      break;
    }
  }
  if (!templateId) {
    await markFailed(runId, "failed_report", "report_generating", `no report_template for language=${language}`);
    return NextResponse.json({ ok: false, run_id: runId, error: "no template" }, { status: 500 });
  }
  await sb.from("mvp_outreach_runs").update({ template_id: templateId, step: "dify_karte_to_report" }).eq("id", runId);

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
        fields: [
          { label: "Lead", value: lead.company_name ?? lead.id },
          { label: "Expected", value: "v1" },
          { label: "Got", value: schemaVersion },
        ],
      }),
    });
    return NextResponse.json({ ok: false, run_id: runId, error: "schema mismatch" }, { status: 500 });
  }

  const slug = `${lead.id}-${Date.now()}`;
  const canonicalUrl = buildReportUrl(region, slug);
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

  const verify = await verifyReportUrl(canonicalUrl, {
    initialWaitMs: VERIFY_INITIAL_WAIT,
    maxAttempts: 4,
  });
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
        fields: [
          { label: "URL", value: canonicalUrl },
          { label: "Status", value: String(verify.status) },
          { label: "Attempts", value: String(verify.attempts) },
        ],
        cta: { label: "監視 UI", url: `${PARADIGMJP_BASE}/sales/${region}/mvp/${runId}` },
      }),
    });
    return NextResponse.json({ ok: false, run_id: runId, error: "verify failed", status: verify.status }, { status: 502 });
  }

  // lead.meta.report_canonical_url permanent persist (shared DB direct update)
  const { data: cur } = await sb.from("leads").select("meta").eq("id", lead.id).maybeSingle();
  const newMeta = { ...(cur?.meta ?? {}), report_canonical_url: canonicalUrl };
  await sb.from("leads").update({ meta: newMeta }).eq("id", lead.id);

  await sb.from("mvp_outreach_runs").update({
    status: "report_ready",
    step: "done",
    step_completed_at: new Date().toISOString(),
  }).eq("id", runId);

  return NextResponse.json({
    ok: true,
    run_id: runId,
    canonical_url: canonicalUrl,
    cms_content_block_id: cmsRow.id,
    template_id: templateId,
  });
}

function buildReportUrl(region: string, slug: string): string {
  const locale = region === "ja" ? "ja" :
    region === "ko" ? "ko" :
    region === "zh" ? "zh" :
    region === "europe" ? "de" :
    region === "es" ? "es" :
    region === "pt" ? "pt" :
    region === "ru" ? "ru" :
    region === "ar" ? "ar" :
    region === "sea" ? "vi" :
    "en";
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

async function markFailed(runId: string, status: string, step: string, errorMessage: string): Promise<void> {
  const sb = getMvpSupabase();
  const { data: cur } = await sb.from("mvp_outreach_runs").select("error_log").eq("id", runId).maybeSingle();
  const errLog = Array.isArray(cur?.error_log) ? cur.error_log : [];
  errLog.push({ step, error: errorMessage, ts: new Date().toISOString() });
  await sb.from("mvp_outreach_runs").update({
    status,
    step,
    error_log: errLog,
    step_completed_at: new Date().toISOString(),
  }).eq("id", runId);
}
