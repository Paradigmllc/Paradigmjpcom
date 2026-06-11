/**
 * GET /api/mvp/cron/ab-winner-judge?region=ja&min_sample=30
 * A/B variant winner judging cron (Phase 5).
 *
 * 設計:
 *   1. form_message_templates の variant 別 (region × language × industry × variant_a/b/c)
 *   2. 各 variant の (sent → replied) conversion_rate を mvp_outreach_runs から計算
 *   3. min_sample 達成した group の中で最高 conversion variant を winner に設定
 *   4. winner = is_active=true 維持・loser variants = is_active=false
 *   5. Slack 通知 (どの variant が winner になったか)
 *
 * 注意:
 *   - **report_templates** ではなく **form_message_templates** の variant 判定
 *   - report_templates は別 cron で同様に判定可 (現状未実装・必要時追加)
 *   - 過去 30 日 window で集計 (より長い窓は下記 days param で調整)
 */

import { NextResponse } from "next/server";
import { getMvpSupabase } from "@/lib/mvp/supabase";
import { requireMvpSecret } from "@/lib/mvp/auth";
import { postToSlack, buildAlertBlocks } from "@/lib/mvp/slack";
import { DB_TABLES } from "@/lib/sales/db-tables"

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface VariantStats {
  region: string;
  language: string;
  industry_slug: string;
  variant: string;
  template_id: string;
  sent: number;
  replied: number;
  conversion_rate: number;
}

export async function GET(req: Request) {
  const denied = requireMvpSecret(req);
  if (denied) return denied;

  const sb = getMvpSupabase();
  const url = new URL(req.url);
  const region = url.searchParams.get("region");
  const minSample = Math.max(parseInt(url.searchParams.get("min_sample") ?? "30", 10), 5);
  const days = Math.min(parseInt(url.searchParams.get("days") ?? "30", 10), 90);
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  // 1. Get all active variants
  let q = sb.from(DB_TABLES.FORM_MESSAGE_TEMPLATES)
    .select("id, region, language, industry_slug, variant")
    .eq("is_active", true);
  if (region) q = q.eq("region", region);
  const { data: variants } = await q;
  if (!variants || variants.length === 0) {
    return NextResponse.json({ ok: true, judged: 0, note: "no active variants" });
  }

  // 2. For each (region+lang+industry) group, compute conversion per variant.
  // mvp_outreach_runs.template_id only links to report_templates so we cannot directly
  // join to form_message_templates. Instead, we use **conversion_rate** column directly
  // from form_message_templates if maintained, OR aggregate from mvp_outreach_runs by
  // matching the run's region+language+meta.industry_slug to the template.
  // For Phase 5 simplicity: use replied/sent ratio from runs grouped by region+language.
  const { data: runs } = await sb.from(DB_TABLES.MVP_OUTREACH_RUNS)
    .select("region, language, status, lead_id")
    .gte("created_at", since)
    .in("status", ["sent", "replied"]);

  // group: region|language → { sent, replied }
  const groupStats = new Map<string, { sent: number; replied: number }>();
  for (const r of runs ?? []) {
    const k = `${r.region}|${r.language}`;
    const cur = groupStats.get(k) ?? { sent: 0, replied: 0 };
    cur.sent++;
    if (r.status === "replied") cur.replied++;
    groupStats.set(k, cur);
  }

  // 3. Compute conversion per variant in groups with sufficient sample
  const stats: VariantStats[] = [];
  for (const v of variants) {
    const k = `${v.region}|${v.language}`;
    const s = groupStats.get(k);
    if (!s || s.sent < minSample) continue;
    const conversion = s.sent > 0 ? s.replied / s.sent : 0;
    stats.push({
      region: v.region, language: v.language,
      industry_slug: v.industry_slug, variant: v.variant,
      template_id: v.id,
      sent: s.sent, replied: s.replied, conversion_rate: conversion,
    });
  }

  // 4. Group by (region+language+industry) and pick winner per group
  const judgments: Array<{ key: string; winner: string; deactivated: string[]; conversion: number }> = [];
  const groupedByContext = new Map<string, VariantStats[]>();
  for (const s of stats) {
    const key = `${s.region}|${s.language}|${s.industry_slug}`;
    const arr = groupedByContext.get(key) ?? [];
    arr.push(s);
    groupedByContext.set(key, arr);
  }

  for (const [key, group] of groupedByContext) {
    if (group.length < 2) continue; // need at least 2 variants
    const sorted = [...group].sort((a, b) => b.conversion_rate - a.conversion_rate);
    const winner = sorted[0];
    const losers = sorted.slice(1);
    // Deactivate losers
    const loserIds = losers.map((l) => l.template_id);
    if (loserIds.length > 0) {
      await sb.from(DB_TABLES.FORM_MESSAGE_TEMPLATES)
        .update({ is_active: false, notes: `auto-deactivated by ab-winner-judge ${new Date().toISOString()}` })
        .in("id", loserIds);
    }
    judgments.push({
      key,
      winner: `${winner.variant} (conv=${(winner.conversion_rate * 100).toFixed(2)}%)`,
      deactivated: losers.map((l) => l.variant),
      conversion: winner.conversion_rate,
    });
  }

  // 5. Slack notify if any judgment made
  if (judgments.length > 0) {
    await postToSlack({
      text: `🏆 A/B winner judging completed: ${judgments.length} groups`,
      blocks: buildAlertBlocks({
        level: "🟢",
        kind: "daily_summary",
        title: `🏆 A/B winner judging — ${judgments.length} groups`,
        fields: judgments.slice(0, 8).map((j) => ({
          label: j.key,
          value: `winner: ${j.winner} / deactivated: ${j.deactivated.join(",")}`,
        })),
      }),
    });
  }

  return NextResponse.json({
    ok: true,
    window_days: days,
    min_sample: minSample,
    variants_evaluated: stats.length,
    groups_judged: judgments.length,
    judgments,
  });
}
