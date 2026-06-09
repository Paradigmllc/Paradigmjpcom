"use client"

import { motion } from "framer-motion"
import { Camera, Clock, Film, Package, Play, Send, Smartphone, Video } from "lucide-react"
import type { DiagnosticReportData } from "@/lib/sales/diagnostic"

// ─── Video: Sample Section ──────────────────────────────────
export function VideoSampleSection({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  return (
    <section className="px-5 py-14" style={{ background: "linear-gradient(135deg, #faf5ff, #ede9fe)" }}>
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-2 mb-6">
          <Film className="h-5 w-5 text-violet-600" />
          <h2 className="text-xl font-bold text-zinc-900">{lang === "ja" ? "動画制作プラン" : "Video Production Plan"}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Camera, title: lang === "ja" ? "撮影" : "Shoot", desc: lang === "ja" ? "最適な機材と構図で撮影" : "Professional equipment & framing" },
            { icon: Play, title: lang === "ja" ? "編集" : "Edit", desc: lang === "ja" ? "ブランドトーンに合わせた編集" : "Brand-tone aligned editing" },
            { icon: Smartphone, title: lang === "ja" ? "配信" : "Distribute", desc: lang === "ja" ? "Instagram/TikTok/YouTube最適化" : "Optimized for all platforms" },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-violet-200 bg-white p-6 text-center">
              <item.icon className="mx-auto h-8 w-8 text-violet-500 mb-3" />
              <div className="text-sm font-bold text-zinc-900">{item.title}</div>
              <div className="mt-1 text-xs text-zinc-500">{item.desc}</div>
            </motion.div>
          ))}
        </div>
        <div className="mt-6 rounded-xl border border-violet-100 bg-violet-50 p-5 text-center">
          <div className="text-sm font-bold text-violet-800">{lang === "ja" ? "週4本のショート動画を完全代行" : "4 short videos/week — fully managed"}</div>
          <div className="mt-1 text-xs text-violet-600">{lang === "ja" ? "撮影から分析まで一貫サポート" : "End-to-end from filming to analytics"}</div>
        </div>
      </div>
    </section>
  )
}

// ─── Video: Production Flow Section ─────────────────────────
export function VideoFlowSection({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  return (
    <section className="px-5 py-14 bg-white border-t border-zinc-200">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-xl font-bold text-zinc-900 mb-6">{lang === "ja" ? "制作フロー" : "Production Flow"}</h2>
        <div className="relative">
          <div className="absolute left-4 top-0 h-full w-0.5 bg-violet-200" />
          {[
            { step: "1", title: lang === "ja" ? "ヒアリング" : "Discovery", desc: lang === "ja" ? "ターゲット・目的・トンマナを共有" : "Target, goals & tone definition", time: lang === "ja" ? "30分" : "30min" },
            { step: "2", title: lang === "ja" ? "企画・構成" : "Planning", desc: lang === "ja" ? "4本分の動画企画書を作成" : "4-video storyboard creation", time: lang === "ja" ? "1日" : "1 day" },
            { step: "3", title: lang === "ja" ? "撮影・編集" : "Production", desc: lang === "ja" ? "撮影〜編集〜BGM・字幕まで" : "Shoot → edit → BGM → captions", time: lang === "ja" ? "3日" : "3 days" },
            { step: "4", title: lang === "ja" ? "納品・分析" : "Delivery", desc: lang === "ja" ? "各SNSに最適化して納品＋効果測定" : "Platform-optimized delivery + analytics", time: lang === "ja" ? "即日" : "Same day" },
          ].map((item, i) => (
            <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
              <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">{item.step}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-zinc-900">{item.title}</div>
                  <span className="text-[10px] text-violet-500 font-bold">{item.time}</span>
                </div>
                <div className="mt-0.5 text-xs text-zinc-500">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Subsidy: Matching Table Section ────────────────────────
export function SubsidyTableSection({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  const subsidies = [
    { name: lang === "ja" ? "ものづくり補助金" : "Manufacturing Subsidy", max: lang === "ja" ? "最大1,000万円" : "Up to $68K", deadline: lang === "ja" ? "年4回募集" : "4x/year", match: lang === "ja" ? "適合" : "Eligible" },
    { name: lang === "ja" ? "事業再構築補助金" : "Biz Restructuring Grant", max: lang === "ja" ? "最大8,000万円" : "Up to $545K", deadline: lang === "ja" ? "年2回募集" : "2x/year", match: lang === "ja" ? "適合" : "Eligible" },
    { name: lang === "ja" ? "IT導入補助金" : "IT Adoption Subsidy", max: lang === "ja" ? "最大450万円" : "Up to $30K", deadline: lang === "ja" ? "通年" : "Rolling", match: lang === "ja" ? "適合" : "Eligible" },
  ]

  return (
    <section className="px-5 py-14" style={{ background: "linear-gradient(135deg, #f0fdfa, #ccfbf1)" }}>
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-2 mb-6">
          <Package className="h-5 w-5 text-teal-600" />
          <h2 className="text-xl font-bold text-zinc-900">{lang === "ja" ? "活用可能な補助金" : "Available Grants"}</h2>
        </div>
        <div className="overflow-x-auto rounded-xl border border-teal-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-teal-50 text-xs text-teal-700">
              <tr>
                <th className="px-4 py-3 font-medium">{lang === "ja" ? "制度名" : "Program"}</th>
                <th className="px-4 py-3 font-medium">{lang === "ja" ? "上限額" : "Max Amount"}</th>
                <th className="px-4 py-3 font-medium">{lang === "ja" ? "募集時期" : "Deadline"}</th>
                <th className="px-4 py-3 font-medium">{lang === "ja" ? "適合判定" : "Match"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-teal-100">
              {subsidies.map((s, i) => (
                <motion.tr key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="hover:bg-teal-50/50">
                  <td className="px-4 py-3 font-medium text-zinc-900">{s.name}</td>
                  <td className="px-4 py-3 text-zinc-600">{s.max}</td>
                  <td className="px-4 py-3 text-zinc-600">{s.deadline}</td>
                  <td className="px-4 py-3"><span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{s.match}</span></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-center text-xs text-teal-600">
          {lang === "ja" ? "申請代行〜採択後報告まで一貫サポート。採択率68%。" : "End-to-end support from application to reporting. 68% success rate."}
        </div>
      </div>
    </section>
  )
}

// ─── Outreach: Funnel Section ───────────────────────────────
export function OutreachFunnelSection({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  return (
    <section className="px-5 py-14" style={{ background: "linear-gradient(135deg, #fff7ed, #ffedd5)" }}>
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-2 mb-6">
          <Send className="h-5 w-5 text-orange-600" />
          <h2 className="text-xl font-bold text-zinc-900">{lang === "ja" ? "営業ファネル診断" : "Sales Funnel Diagnostic"}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: lang === "ja" ? "問い合わせ" : "Inquiries", value: "58件/月", pct: "100%", tone: "indigo" },
            { label: lang === "ja" ? "自動返信" : "Auto-reply", value: "0件", pct: "0%", tone: "rose" },
            { label: lang === "ja" ? "営業返信" : "Sales reply", value: lang === "ja" ? "47時間後" : "47hrs later", pct: "34%", tone: "amber" },
            { label: lang === "ja" ? "商談化" : "Conversations", value: lang === "ja" ? "推定12件/月" : "Est. 12/mo", pct: "21%", tone: "emerald" },
          ].map((item, i) => {
            const colors: Record<string, string> = {
              indigo: "bg-indigo-50 border-indigo-200 text-indigo-700",
              rose: "bg-rose-50 border-rose-200 text-rose-700",
              amber: "bg-amber-50 border-amber-200 text-amber-700",
              emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
            }
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className={`rounded-xl border p-4 text-center ${colors[item.tone]}`}>
                <div className="text-[10px] font-semibold uppercase opacity-70">{item.label}</div>
                <div className="mt-2 text-xl font-bold">{item.value}</div>
                <div className="mt-1 text-xs opacity-70">{item.pct}</div>
              </motion.div>
            )
          })}
        </div>
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-2 text-sm font-bold text-orange-700">
            <Clock className="h-4 w-4" />
            {lang === "ja" ? "自動化導入で 47時間 → 3分 に短縮可能" : "Automation: 47hrs → 3min response time"}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Outreach: Test Result Section ──────────────────────────
export function OutreachTestSection({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  return (
    <section className="px-5 py-14 bg-white border-t border-zinc-200">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-xl font-bold text-zinc-900 mb-6">{lang === "ja" ? "フォーム送信テスト結果" : "Form Submission Test"}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { check: data.contactFormUrl !== null, label: lang === "ja" ? "フォーム検出" : "Form detected", ok: !!data.contactFormUrl },
            { check: true, label: lang === "ja" ? "フォーム解析" : "Form analysis", ok: true },
            { check: false, label: lang === "ja" ? "CAPTCHA確認" : "CAPTCHA check", ok: false, warn: lang === "ja" ? "手動確認必要" : "Manual check needed" },
            { check: false, label: lang === "ja" ? "送信テスト" : "Send test", ok: false, warn: lang === "ja" ? "承認待ち" : "Pending approval" },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-3 rounded-xl border p-4 ${item.ok ? "border-emerald-200 bg-emerald-50" : "border-zinc-200 bg-zinc-50"}`}>
              <span className={`flex h-6 w-6 items-center justify-center rounded text-xs font-bold ${item.ok ? "bg-emerald-100 text-emerald-600" : "bg-zinc-200 text-zinc-500"}`}>
                {item.ok ? "✓" : "…"}
              </span>
              <div className="flex-1">
                <div className="text-sm font-medium text-zinc-800">{item.label}</div>
                {item.warn && <div className="text-[10px] text-amber-600">{item.warn}</div>}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
