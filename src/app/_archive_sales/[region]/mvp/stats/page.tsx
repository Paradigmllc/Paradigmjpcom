/**
 * /sales/[region]/mvp/stats — Funnel metrics dashboard (Metabase substitute・Phase 5).
 */

"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

interface Stats {
  ok: boolean;
  window_days: number;
  region: string;
  runs_total: number;
  by_region: Record<string, number>;
  by_status: Record<string, number>;
  cta_click_rate: number;
  cta_clicked_leads: number;
  sent_leads: number;
  daily: Array<{ date: string; sent: number; failed: number; skipped: number }>;
  quotas: Array<{ scope: string; scope_key: string; period: string; period_key: string; metric: string; count_used: number; limit_value: number; paused_at: string | null }>;
  active_campaigns: Array<{ id: string; name: string; status: string; sent_count: number; failed_count: number; replied_count: number; leads_count: number }>;
  blocklist_count: number;
}

export default function StatsPage() {
  const params = useParams<{ region: string }>();
  const region = params.region;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["mvp-stats", region],
    queryFn: async () => {
      const r = await fetch(`/api/mvp/stats?region=${region}&days=30`);
      if (!r.ok) throw new Error(`fetch failed: ${r.status}`);
      return (await r.json()) as Stats;
    },
    refetchInterval: 30_000,
  });

  if (isLoading) return <div className="p-8">読み込み中...</div>;
  if (error || !data?.ok) return <div className="p-8 text-red-600">エラー: {String(error ?? "load failed")}</div>;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📊 統計ダッシュボード — {region} (過去 {data.window_days} 日)</h1>
        <div className="flex gap-2">
          <Link href={`/sales/${region}/mvp`} className="px-3 py-1 border rounded hover:bg-gray-50 text-sm">← 監視</Link>
          <Link href={`/sales/${region}/mvp/campaigns`} className="px-3 py-1 border rounded hover:bg-gray-50 text-sm">キャンペーン</Link>
          <button onClick={() => refetch()} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">更新</button>
        </div>
      </header>

      {/* KPI cards */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="送信総数" value={data.runs_total} />
        <KpiCard label="送信完了" value={data.by_status.sent ?? 0} color="green" />
        <KpiCard label="返信あり" value={data.by_status.replied ?? 0} color="blue" />
        <KpiCard label="CTA click率" value={`${(data.cta_click_rate * 100).toFixed(2)}%`} subtitle={`${data.cta_clicked_leads} / ${data.sent_leads}`} color="purple" />
        <KpiCard label="blocklist" value={data.blocklist_count} color="gray" />
      </section>

      {/* by_status */}
      <section className="border rounded p-4">
        <h2 className="font-semibold mb-3">status 別件数</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
          {Object.entries(data.by_status).map(([k, v]) => (
            <div key={k} className="flex justify-between border rounded px-2 py-1">
              <span>{k}</span>
              <span className="font-mono font-bold">{v}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Cost / Quota */}
      <section className="border rounded p-4">
        <h2 className="font-semibold mb-3">💰 Cost guard quota (今日 + 今月)</h2>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">scope</th>
              <th className="p-2 text-left">period</th>
              <th className="p-2 text-left">metric</th>
              <th className="p-2 text-right">used / limit</th>
              <th className="p-2 text-right">使用率</th>
              <th className="p-2 text-left">paused</th>
            </tr>
          </thead>
          <tbody>
            {data.quotas.map((q, i) => {
              const pct = q.limit_value > 0 ? (Number(q.count_used) / Number(q.limit_value)) * 100 : 0;
              const cls = pct >= 90 ? "text-red-600" : pct >= 70 ? "text-orange-600" : "text-green-600";
              return (
                <tr key={i} className="border-t">
                  <td className="p-2 text-xs">{q.scope}: {q.scope_key}</td>
                  <td className="p-2 text-xs">{q.period} {q.period_key}</td>
                  <td className="p-2 text-xs font-mono">{q.metric}</td>
                  <td className="p-2 text-right font-mono">{q.count_used} / {q.limit_value}</td>
                  <td className={`p-2 text-right font-mono ${cls}`}>{pct.toFixed(1)}%</td>
                  <td className="p-2 text-xs">{q.paused_at ? `🔴 ${q.paused_at.slice(0, 16)}` : "—"}</td>
                </tr>
              );
            })}
            {data.quotas.length === 0 && <tr><td colSpan={6} className="p-3 text-center text-gray-500">quota record なし</td></tr>}
          </tbody>
        </table>
      </section>

      {/* Daily throughput */}
      <section className="border rounded p-4">
        <h2 className="font-semibold mb-3">📈 日次 throughput (過去 {data.window_days} 日)</h2>
        <div className="grid grid-cols-7 md:grid-cols-15 gap-1 text-xs">
          {data.daily.slice(-30).map((d) => {
            const total = d.sent + d.failed + d.skipped;
            return (
              <div key={d.date} className="border rounded p-1 text-center bg-gray-50">
                <div className="text-[10px] text-gray-600">{d.date.slice(5)}</div>
                <div className="font-mono">{total}</div>
                <div className="text-[10px] text-green-600">{d.sent}↑</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Active campaigns */}
      <section className="border rounded p-4">
        <h2 className="font-semibold mb-3">🚀 active キャンペーン</h2>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">名前</th>
              <th className="p-2 text-left">status</th>
              <th className="p-2 text-right">leads</th>
              <th className="p-2 text-right">sent</th>
              <th className="p-2 text-right">failed</th>
              <th className="p-2 text-right">replied</th>
            </tr>
          </thead>
          <tbody>
            {data.active_campaigns.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-2">{c.name}</td>
                <td className="p-2 text-xs"><span className={`px-2 py-0.5 rounded ${c.status === "running" ? "bg-blue-100 text-blue-800" : "bg-gray-100"}`}>{c.status}</span></td>
                <td className="p-2 text-right font-mono">{c.leads_count}</td>
                <td className="p-2 text-right font-mono text-green-700">{c.sent_count}</td>
                <td className="p-2 text-right font-mono text-red-700">{c.failed_count}</td>
                <td className="p-2 text-right font-mono text-blue-700">{c.replied_count}</td>
              </tr>
            ))}
            {data.active_campaigns.length === 0 && <tr><td colSpan={6} className="p-3 text-center text-gray-500">active キャンペーンなし</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function KpiCard({ label, value, subtitle, color }: { label: string; value: string | number; subtitle?: string; color?: "blue" | "green" | "red" | "gray" | "purple" }) {
  const cls = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    red: "bg-red-50 text-red-700 border-red-200",
    gray: "bg-gray-50 text-gray-700 border-gray-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  }[color ?? "blue"];
  return (
    <div className={`border rounded p-4 ${cls}`}>
      <div className="text-sm">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && <div className="text-xs text-gray-600 mt-1">{subtitle}</div>}
    </div>
  );
}
