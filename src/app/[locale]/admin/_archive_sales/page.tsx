/**
 * /[locale]/admin/sales — Sprint 11
 *
 * 役割: 営業 OS 内部ダッシュボード. リード一覧 + MRR + テンプレ覧 + パイプライン KPI.
 * 認証: Cookie `paradigm_admin_token` (=既存 ADMIN_PASSWORD と一致) で gate.
 *       ※既存 /admin の認証パターンを継承 (新規構築せず流用).
 *
 * AE-PHP-3: noindex 必須 (内部管理画面・SEO 対象外).
 */

import type { Metadata } from "next"
import { cookies } from "next/headers"
import { getServiceSupabase } from "@/lib/supabase"
import { calculateMrr } from "@/lib/sales/customers"
import { listRecentlyUpdatedCompanies } from "@/lib/sales/companies"
import { listAllTemplates } from "@/lib/sales/templates"
import { DB_TABLES } from "@/lib/sales/db-tables"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = {
  title: "営業 OS 管理画面 — Paradigm",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
}

async function checkAuth(): Promise<boolean> {
  const c = await cookies()
  const token = c.get("paradigm_admin_token")?.value
  const expected = process.env.ADMIN_PASSWORD ?? ""
  return !!token && !!expected && token === expected
}

async function getKpis() {
  const sb = getServiceSupabase()
  if (!sb) return { totalLeads: 0, hotLeads: 0, pendingScans: 0, readyToSend: 0, sent: 0 }
  const [total, hot, pending, ready, sent] = await Promise.all([
    sb.from(DB_TABLES.SALES_COMPANIES).select("id", { count: "exact", head: true }),
    sb.from(DB_TABLES.SALES_COMPANIES).select("id", { count: "exact", head: true }).eq("is_hot_lead", true),
    sb.from(DB_TABLES.SALES_COMPANIES).select("id", { count: "exact", head: true }).eq("pipeline_status", "pending"),
    sb.from(DB_TABLES.SALES_COMPANIES).select("id", { count: "exact", head: true }).eq("pipeline_status", "report_ready"),
    sb.from(DB_TABLES.SALES_COMPANIES).select("id", { count: "exact", head: true }).eq("pipeline_status", "sent"),
  ])
  return {
    totalLeads: total.count ?? 0,
    hotLeads: hot.count ?? 0,
    pendingScans: pending.count ?? 0,
    readyToSend: ready.count ?? 0,
    sent: sent.count ?? 0,
  }
}

function UnauthorizedView() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="font-display text-2xl font-bold text-slate-900 mb-2">
          認証が必要です
        </h1>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          営業 OS ダッシュボードは内部管理者専用です。
          <br />
          /admin で PayloadCMS にログインしてください.
        </p>
        <a
          href="/admin"
          className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-xl transition-colors"
        >
          /admin へ移動
        </a>
      </div>
    </div>
  )
}

export default async function AdminSalesPage() {
  const ok = await checkAuth()
  // 認証 NG の場合 redirect ではなく inline render
  //   理由: Next.js `force-dynamic` でも `redirect()` は static-gen 時に not-found を返すため status code が安定しない.
  //   inline render なら status=200 で確実にレンダリング・data leak も発生しない (KPI 取得を condition で skip).
  if (!ok) return <UnauthorizedView />


  const [kpis, mrr, companies, templates] = await Promise.all([
    getKpis(),
    calculateMrr(),
    listRecentlyUpdatedCompanies(20),
    listAllTemplates(),
  ])

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-widest text-slate-400 mb-1">Admin · Sales OS</p>
          <h1 className="font-display text-3xl font-bold text-slate-900">
            営業 OS 管理ダッシュボード
          </h1>
        </header>

        {/* KPI 行 */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {[
            { label: "総リード", value: kpis.totalLeads, color: "#6366f1" },
            { label: "HOT", value: kpis.hotLeads, color: "#dc2626" },
            { label: "Pending", value: kpis.pendingScans, color: "#94a3b8" },
            { label: "送信待ち", value: kpis.readyToSend, color: "#f59e0b" },
            { label: "送信済", value: kpis.sent, color: "#10b981" },
          ].map((k) => (
            <div
              key={k.label}
              className="bg-white rounded-2xl border border-slate-200 p-5"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
            >
              <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-2">
                {k.label}
              </div>
              <div className="text-3xl font-bold tabular-nums" style={{ color: k.color }}>
                {k.value.toLocaleString()}
              </div>
            </div>
          ))}
        </section>

        {/* MRR セクション */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4">MRR (Monthly Recurring Revenue)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-slate-500 mb-1">総 MRR</div>
              <div className="text-2xl font-bold text-slate-900">¥{(mrr.total / 10000).toFixed(0)}万</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">アクティブ顧客</div>
              <div className="text-2xl font-bold text-slate-900">{mrr.active_count}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">WL 顧客</div>
              <div className="text-2xl font-bold text-purple-600">{mrr.wl_count}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">WL 収益</div>
              <div className="text-2xl font-bold text-purple-600">¥{(mrr.wl_revenue / 10000).toFixed(0)}万</div>
            </div>
          </div>
        </section>

        {/* リード一覧 (最新 20) */}
        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-8">
          <header className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">最新リード (20件)</h2>
            <span className="text-xs text-slate-400">updated_at desc</span>
          </header>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">企業名</th>
                <th className="text-left px-4 py-3">業種</th>
                <th className="text-left px-4 py-3">パイプライン</th>
                <th className="text-left px-4 py-3">商談ステージ</th>
                <th className="text-right px-4 py-3">スコア</th>
                <th className="text-right px-4 py-3">閲覧</th>
                <th className="text-center px-4 py-3">HOT</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-slate-400 py-12">
                    リードがまだありません
                  </td>
                </tr>
              ) : (
                companies.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <a
                        href={`/ja/diagnostic/${c.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-indigo-600 underline-offset-2 hover:underline"
                      >
                        {c.company_name}
                      </a>
                      <div className="text-[11px] text-slate-400 mt-0.5">{c.domain}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{c.industry ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {c.pipeline_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 text-xs">{c.deal_stage}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {c.pagespeed_mobile ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {c.report_views}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.is_hot_lead ? <span title="HOT">🔥</span> : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {/* テンプレ覧 */}
        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <header className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">業種×課題テンプレ ({templates.length}件)</h2>
            <span className="text-xs text-slate-400">8 業種 × 7 課題 = 最大 56</span>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-6">
            {templates.length === 0 ? (
              <div className="col-span-full text-center text-slate-400 py-12">
                テンプレ未投入
              </div>
            ) : (
              templates.slice(0, 24).map((t) => (
                <div key={t.id} className="border border-slate-200 rounded-xl p-4 text-xs">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400">
                      {t.industry} · {t.issue_code}
                    </span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{
                        background:
                          t.severity === "critical"
                            ? "#fef2f2"
                            : t.severity === "warning"
                              ? "#fffbeb"
                              : "#f0fdf4",
                        color:
                          t.severity === "critical"
                            ? "#dc2626"
                            : t.severity === "warning"
                              ? "#d97706"
                              : "#16a34a",
                      }}
                    >
                      {t.severity}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 mb-1 leading-snug">
                    {t.headline ?? t.template_name}
                  </div>
                  <div className="text-slate-500 leading-relaxed line-clamp-2">{t.pain ?? ""}</div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
