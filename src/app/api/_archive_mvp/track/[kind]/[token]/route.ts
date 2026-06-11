/**
 * GET /api/mvp/track/[kind]/[token]
 * Click tracking + opt-out + pixel.
 *
 * kind:
 *   pixel    → 1x1 transparent GIF
 *   cta      → record click + 302 redirect to destination
 *   optout   → record opt-out (mvp_optout_tokens) + add blocklist + redirect to /opt-out page
 *   privacy  → record click + 302 to privacy page
 *   external → record click + 302 to destination (general)
 *
 * Token: HMAC-signed (parseTrackToken で stateless 検証) OR random opt-out token.
 */

import { NextResponse } from "next/server";
import { getMvpSupabase } from "@/lib/mvp/supabase";
import { parseTrackToken, hashIp } from "@/lib/mvp/tracking";
import { postToSlack, buildAlertBlocks } from "@/lib/mvp/slack";
import { DB_TABLES } from "@/lib/sales/db-tables"

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PARADIGMJP_BASE = process.env.PARADIGMJP_PUBLIC_BASE ?? "https://paradigmjp.com";

// 1x1 transparent GIF
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==", "base64");

export async function GET(req: Request, ctx: { params: Promise<{ kind: string; token: string }> }) {
  const sb = getMvpSupabase();
  const { kind, token } = await ctx.params;
  const url = new URL(req.url);
  const ipHash = hashIp(req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "");
  const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? "";
  const referer = req.headers.get("referer")?.slice(0, 500) ?? "";

  if (kind === "optout") {
    // opt-out: random opaque token (mvp_optout_tokens)
    const { data: ot } = await sb.from(DB_TABLES.MVP_OPTOUT_TOKENS).select("entity_id, lead_id, domain").eq("token", token).maybeSingle();
    if (!ot) return NextResponse.redirect(new URL(`/ja/optout?status=invalid`, PARADIGMJP_BASE));
    await sb.from(DB_TABLES.MVP_OPTOUT_TOKENS).update({
      optout_at: new Date().toISOString(), optout_ip_hash: ipHash, optout_user_agent: userAgent,
    }).eq("token", token);
    // blocklist 追加
    await sb.from(DB_TABLES.MVP_BLOCKLIST).insert({
      entity_id: ot.entity_id, domain: ot.domain,
      reason: "opt_out", reason_detail: `optout via token=${token.slice(0, 8)}`,
    });
    await sb.from(DB_TABLES.MVP_CLICK_EVENTS).insert({
      lead_id: ot.lead_id, click_token: token, click_type: "optout",
      ip_hash: ipHash, user_agent: userAgent, referer,
    });
    return NextResponse.redirect(new URL(`/ja/optout?status=success`, PARADIGMJP_BASE));
  }

  // signed token
  const payload = parseTrackToken(token);
  if (!payload) {
    return NextResponse.json({ ok: false, error: "invalid or expired token" }, { status: 400 });
  }
  if (payload.kind !== kind) {
    return NextResponse.json({ ok: false, error: "kind mismatch" }, { status: 400 });
  }

  // Always record click event
  await sb.from(DB_TABLES.MVP_CLICK_EVENTS).insert({
    run_id: payload.run_id, lead_id: payload.lead_id,
    click_token: token, click_type: payload.kind,
    cta_destination: payload.destination ?? null,
    ip_hash: ipHash, user_agent: userAgent, referer,
  });

  // Phase 4: hot lead detection — CTA click → Slack 緊急通知 + lead.meta.cta_clicked_at
  // 同 lead で 24h 以内に同じ click_type の event が記録されていれば dedup (=2 重通知防止)
  if (payload.kind === "cta") {
    const since24h = new Date(Date.now() - 86400_000).toISOString();
    const { count } = await sb
      .from(DB_TABLES.MVP_CLICK_EVENTS)
      .select("id", { count: "exact", head: true })
      .eq("lead_id", payload.lead_id)
      .eq("click_type", "cta")
      .gte("occurred_at", since24h);
    const isFirstCtaIn24h = (count ?? 0) <= 1;
    if (isFirstCtaIn24h) {
      // lead.meta.cta_clicked_at atomic update
      // Note: leads schema = business_name / website_url (NOT company_name / domain)
      const { data: cur } = await sb.from(DB_TABLES.LEADS).select("business_name, website_url, region, meta").eq("id", payload.lead_id).maybeSingle();
      const newMeta = { ...((cur?.meta as Record<string, unknown> | undefined) ?? {}), cta_clicked_at: new Date().toISOString(), cta_clicked_run_id: payload.run_id };
      await sb.from(DB_TABLES.LEADS).update({ meta: newMeta }).eq("id", payload.lead_id);

      const region = (cur as { region?: string } | undefined)?.region ?? "ja";
      const company = (cur as { business_name?: string } | undefined)?.business_name ?? payload.lead_id;
      const domain = (cur as { website_url?: string } | undefined)?.website_url ?? "—";
      await postToSlack({
        text: `🔥 HOT LEAD: ${company} が report CTA をクリックしました`,
        blocks: buildAlertBlocks({
          level: "🟢",
          kind: "hot_lead",
          title: `🔥 HOT LEAD — CTA click 検出`,
          fields: [
            { label: "Company", value: company },
            { label: "Domain", value: domain },
            { label: "Run ID", value: payload.run_id },
            { label: "CTA dest", value: payload.destination ?? "—" },
          ],
          cta: { label: "📋 監視 UI で確認", url: `${PARADIGMJP_BASE}/sales/${region}/mvp/${payload.run_id}` },
        }),
      });
    }
  }

  if (kind === "pixel") {
    return new Response(PIXEL, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  // cta / privacy / external → redirect
  const dest = payload.destination ?? `${PARADIGMJP_BASE}/`;
  if (!isSafeRedirect(dest)) {
    return NextResponse.json({ ok: false, error: "unsafe destination" }, { status: 400 });
  }
  return NextResponse.redirect(dest, 302);
}

function isSafeRedirect(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch { return false; }
}
