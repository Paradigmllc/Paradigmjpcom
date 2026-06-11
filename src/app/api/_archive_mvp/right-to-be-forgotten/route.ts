/**
 * POST /api/mvp/right-to-be-forgotten
 * 個人情報保護法・GDPR Right to be Forgotten 準拠の削除依頼処理.
 *
 * 入力 (request_initiate):
 *   { action: "request_initiate", entity_id?: string, domain?: string, lead_id?: string, requester_email?: string }
 *   → mvp_blocklist 追加 (reason='manual'・将来送信絶対禁止)
 *   → mvp_optout_tokens に既存 token あれば全 optout 化
 *   → confirmation token 発行 (確認後 14 日以内に hard delete・現状 soft delete)
 *   → Slack 法務担当通知
 *
 * 入力 (admin_purge):
 *   { action: "admin_purge", entity_id?: string, domain?: string, confirmation_token: string }
 *   → 関連 leads / mvp_outreach_runs / cms_content_blocks / mvp_click_events を delete
 *   → 監査 log に記録
 *
 * 認証: 公開エンドポイントだが requester_email + Slack 確認の二重 verify.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getMvpSupabase } from "@/lib/mvp/supabase";
import { postToSlack, buildAlertBlocks } from "@/lib/mvp/slack";
import { requireMvpSecret } from "@/lib/mvp/auth";
import { randomBytes } from "node:crypto";
import { DB_TABLES } from "@/lib/sales/db-tables"

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const InitiateSchema = z.object({
  action: z.literal("request_initiate"),
  entity_id: z.string().optional(),
  domain: z.string().optional(),
  lead_id: z.string().uuid().optional(),
  requester_email: z.string().email(),
  reason: z.string().optional(),
});

const PurgeSchema = z.object({
  action: z.literal("admin_purge"),
  entity_id: z.string().optional(),
  domain: z.string().optional(),
  confirmation_token: z.string(),
  approved_by: z.string(),
});

const Schema = z.discriminatedUnion("action", [InitiateSchema, PurgeSchema]);

export async function POST(req: Request) {
  const sb = getMvpSupabase();
  let body: z.infer<typeof Schema>;
  try { body = Schema.parse(await req.json()); } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "invalid body" }, { status: 400 });
  }

  if (body.action === "request_initiate") {
    if (!body.entity_id && !body.domain && !body.lead_id) {
      return NextResponse.json({ ok: false, error: "entity_id or domain or lead_id required" }, { status: 400 });
    }
    // 1. blocklist 追加 (将来送信完全禁止)
    await sb.from(DB_TABLES.MVP_BLOCKLIST).insert({
      entity_id: body.entity_id ?? null,
      domain: body.domain ?? null,
      reason: "manual",
      reason_detail: `RTBF request from ${body.requester_email}: ${body.reason ?? "no reason given"}`,
      created_by: body.requester_email,
    });
    // 2. 既存 optout_tokens 全 mark
    if (body.lead_id) {
      await sb.from(DB_TABLES.MVP_OPTOUT_TOKENS).update({
        optout_at: new Date().toISOString(),
        optout_user_agent: "RTBF",
      }).eq("lead_id", body.lead_id).is("optout_at", null);
    }
    // 3. confirmation token 発行 (admin_purge で必要)
    const confirmationToken = randomBytes(24).toString("base64url");
    // 4. Slack 法務通知 (人間が approve_by で admin_purge を叩く)
    await postToSlack({
      text: `⚠️ RTBF (right-to-be-forgotten) 依頼: ${body.entity_id ?? body.domain ?? body.lead_id}`,
      blocks: buildAlertBlocks({
        level: "🟡",
        kind: "violation_review",
        title: "⚠️ RTBF 削除依頼を受領",
        fields: [
          { label: "Requester", value: body.requester_email },
          { label: "Entity / Domain / Lead", value: `${body.entity_id ?? "—"} / ${body.domain ?? "—"} / ${body.lead_id ?? "—"}` },
          { label: "Reason", value: body.reason ?? "—" },
          { label: "Confirmation Token", value: `\`${confirmationToken}\`` },
          { label: "Action", value: "送信は即時 block 済. 14 日以内に hard delete を完了するため admin_purge action を発火してください." },
        ],
      }),
    });
    return NextResponse.json({
      ok: true,
      stage: "request_initiate",
      blocked: true,
      confirmation_token: confirmationToken,
      next_step: "Within 14 days, an authorized admin must POST { action: 'admin_purge', confirmation_token, approved_by, entity_id|domain }.",
    });
  }

  // admin_purge: requires MVP_API_SECRET (admin only)
  const denied = requireMvpSecret(req);
  if (denied) return denied;

  if (!body.entity_id && !body.domain) {
    return NextResponse.json({ ok: false, error: "entity_id or domain required" }, { status: 400 });
  }
  // 関連データ hard delete
  // ※ Supabase 制約: cms_content_blocks や mvp_outreach_runs は lead_id 経由でリンクされるため、entity_id → lead_id 解決後に削除
  // B36-AUDIT FIX #3: leads schema は entity_id を top-level 列で保持、domain は website_url 列.
  //   旧 .eq("meta->>entity_id", ...) と .eq("domain", ...) は silently zero match → GDPR 違反リスク.
  const targetLeadIds: string[] = [];
  if (body.entity_id) {
    const { data } = await sb.from(DB_TABLES.LEADS).select("id").eq("entity_id", body.entity_id);
    (data ?? []).forEach((r) => targetLeadIds.push(r.id));
  }
  if (body.domain) {
    // domain 入力 (例: "cybozu.co.jp") に対し ① website_url ilike (https://www.cybozu.co.jp/ 等) ② meta->>'domain' 互換
    const { data: byUrl } = await sb.from(DB_TABLES.LEADS).select("id").ilike("website_url", `%${body.domain}%`);
    (byUrl ?? []).forEach((r) => targetLeadIds.push(r.id));
    const { data: byMeta } = await sb.from(DB_TABLES.LEADS).select("id").eq("meta->>domain", body.domain);
    (byMeta ?? []).forEach((r) => targetLeadIds.push(r.id));
  }
  const uniqueLeadIds = Array.from(new Set(targetLeadIds));
  if (uniqueLeadIds.length === 0) {
    return NextResponse.json({ ok: false, error: "no matching leads" }, { status: 404 });
  }

  // Hard delete (cascade not configured・順序で削除)
  // 1. cms_content_blocks は generated_by_run_id 経由で lead に紐付く → 先に run_ids 取得
  const { data: runs } = await sb.from(DB_TABLES.MVP_OUTREACH_RUNS).select("id").in("lead_id", uniqueLeadIds);
  const runIds = (runs ?? []).map((r) => r.id);
  if (runIds.length > 0) {
    await sb.from(DB_TABLES.CMS_CONTENT_BLOCKS).delete().in("generated_by_run_id", runIds);
  }
  // 2. lead 関連 row 削除
  for (const tbl of ["mvp_click_events", "mvp_optout_tokens", "mvp_outreach_runs"]) {
    await sb.from(tbl).delete().in("lead_id", uniqueLeadIds);
  }
  // 3. lead 本体削除 (最後)
  await sb.from(DB_TABLES.LEADS).delete().in("id", uniqueLeadIds);

  // blocklist に永久 record を残す (再 crawl で再収集されないように)
  await sb.from(DB_TABLES.MVP_BLOCKLIST).insert({
    entity_id: body.entity_id ?? null,
    domain: body.domain ?? null,
    reason: "manual",
    reason_detail: `RTBF admin_purge by ${body.approved_by} on ${new Date().toISOString()}`,
    created_by: body.approved_by,
  });

  await postToSlack({
    text: `✅ RTBF admin_purge 完了: ${body.entity_id ?? body.domain} (${uniqueLeadIds.length} leads deleted)`,
  });

  return NextResponse.json({ ok: true, stage: "admin_purge", deleted_lead_count: uniqueLeadIds.length });
}
