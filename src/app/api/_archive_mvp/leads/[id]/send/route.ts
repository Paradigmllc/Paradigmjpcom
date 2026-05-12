/**
 * POST /api/mvp/leads/[id]/send
 * 個別営業 trigger — Appexxme カルテ「今すぐ送信」ボタンから呼ばれる proxy.
 *
 * /api/mvp/generate-report (triggered_by="manual" priority="hot") へ転送.
 * dry_run=true なら実 form は叩かず Slack に内容投影のみ.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMvpSecret } from "@/lib/mvp/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BodySchema = z.object({
  dry_run: z.boolean().optional(),
  dry_run_recipient: z.string().email().optional(),
  skip_eligibility: z.boolean().optional(),
  campaign_id: z.string().uuid().optional(),
});

const PARADIGMJP_BASE = process.env.PARADIGMJP_PUBLIC_BASE ?? "https://paradigmjp.com";
const SECRET = process.env.MVP_API_SECRET ?? "";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = requireMvpSecret(req);
  if (denied) return denied;

  const { id: leadId } = await ctx.params;
  let body: z.infer<typeof BodySchema> = {};
  try { body = BodySchema.parse(await req.json().catch(() => ({}))); } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "invalid body" }, { status: 400 });
  }

  // generate-report 呼出 (transitive: report_ready 後に submit-form は cron が拾う)
  const r1 = await fetch(`${PARADIGMJP_BASE}/api/mvp/generate-report`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-MVP-Secret": SECRET },
    body: JSON.stringify({
      lead_id: leadId,
      triggered_by: body.dry_run ? "dry_run" : "manual",
      priority: "hot",
      is_dry_run: body.dry_run ?? false,
      dry_run_recipient: body.dry_run_recipient,
      campaign_id: body.campaign_id,
      override: { skip_eligibility: body.skip_eligibility },
    }),
  });
  const j1 = await r1.json();
  if (!r1.ok || !j1.ok) {
    return NextResponse.json({ ok: false, stage: "generate-report", error: j1.error ?? j1.reasons }, { status: r1.status });
  }

  // 即 submit-form (manual は priority=hot で待機させない・直接送信)
  const r2 = await fetch(`${PARADIGMJP_BASE}/api/mvp/submit-form`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-MVP-Secret": SECRET },
    body: JSON.stringify({ run_id: j1.run_id, skip_eligibility: body.skip_eligibility }),
  });
  const j2 = await r2.json();
  return NextResponse.json({
    ok: r2.ok,
    run_id: j1.run_id,
    canonical_url: j1.canonical_url,
    next: j2.next ?? null,
    confidence: j2.confidence ?? null,
    skipped: j1.skipped || j2.skipped,
    reasons: j1.reasons ?? j2.reasons,
  }, { status: r2.ok ? 200 : 502 });
}
