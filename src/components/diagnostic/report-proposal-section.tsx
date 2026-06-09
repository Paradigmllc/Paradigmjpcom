"use client"

import { motion } from "framer-motion"
import { CheckCircle2, Clock, Package, TrendingUp, Zap } from "lucide-react"
import type { DiagnosticReportData } from "@/lib/sales/diagnostic"

interface ProposalItem {
  problem: string
  solution: string
  timeline: string
  metric: string
  icon: React.ComponentType<{ className?: string }>
}

export function ProposalSection({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  const speed = data.acts.find(a => a.icon === "SPEED")
  const trust = data.acts.find(a => a.icon === "TRUST")
  const reach = data.acts.find(a => a.icon === "SNS" || a.icon === "REACH")

  const proposals: ProposalItem[] = [
    {
      problem: speed?.headline ?? (lang === "ja" ? "表示速度の改善" : "Speed improvement"),
      solution: lang === "ja"
        ? "Astro + 画像最適化でPageSpeed 85点以上を保証。CDN配信で全国どこからでも高速表示。"
        : "Astro + image optimization guarantees PageSpeed 85+. CDN delivery for fast loading nationwide.",
      timeline: lang === "ja" ? "2週間" : "2 weeks",
      metric: `${speed?.metric_value ?? "?"} → 85+`,
      icon: Zap,
    },
    {
      problem: trust?.headline ?? (lang === "ja" ? "信頼表示の最適化" : "Trust optimization"),
      solution: lang === "ja"
        ? "SSL A+グレード + HSTS Preload + セキュリティヘッダー完備。B2B審査も通過する信頼基盤を構築。"
        : "SSL A+ grade + HSTS Preload + security headers. Build trust infrastructure that passes B2B audits.",
      timeline: lang === "ja" ? "1週間" : "1 week",
      metric: lang === "ja" ? "グレードA+保証" : "Grade A+ guaranteed",
      icon: CheckCircle2,
    },
    {
      problem: reach?.headline ?? (lang === "ja" ? "集客導線の拡大" : "Reach expansion"),
      solution: lang === "ja"
        ? "OGP/SNS最適化 + MEO対策 + フォーム改善。検索・SNS・マップの3経路から集客を最大化。"
        : "OGP/SNS optimization + MEO + form improvement. Maximize leads from search, social, and maps.",
      timeline: lang === "ja" ? "1週間" : "1 week",
      metric: lang === "ja" ? "集客導線3経路完備" : "3-channel coverage",
      icon: TrendingUp,
    },
  ]

  // Calculate total timeline and package
  const totalWeeks = proposals.length
  const hasDemo = !!data.demo_url

  return (
    <section className={`px-5 py-14 ${lang === "ja" ? "bg-gradient-to-b from-white to-indigo-50" : "bg-gradient-to-b from-white to-indigo-50"}`}>
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700 mb-4">
            <Package className="h-3 w-3" />
            {lang === "ja" ? "Paradigm 解決プラン" : "Paradigm Solution Plan"}
          </span>
          <h2 className="text-2xl font-bold text-zinc-900">
            {lang === "ja"
              ? `御社の${data.company_name}に最適化した改善パッケージ`
              : `Tailored improvement package for ${data.company_name}`}
          </h2>
          <p className="mt-3 text-sm text-zinc-500 max-w-2xl mx-auto">
            {lang === "ja"
              ? `診断で検出した課題を、すべて一括で解決します。個別に依頼するより早く、安く、確実です。`
              : `All detected issues solved in one package — faster, cheaper, and more reliable than piecemeal fixes.`}
          </p>
        </motion.div>

        {/* Proposal cards */}
        <div className="grid gap-4 lg:grid-cols-3 mb-8">
          {proposals.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-rose-100 text-[10px] font-bold text-rose-600">!</span>
                  <span className="text-xs font-bold text-zinc-500">{lang === "ja" ? "課題" : "Issue"}</span>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="text-sm font-bold text-zinc-800 mb-1">{item.problem}</div>
                <div className="text-[11px] leading-relaxed text-zinc-500">{item.solution}</div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                  <Clock className="h-3 w-3" />
                  {item.timeline}
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  {item.metric}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Package summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-indigo-200 bg-white p-6 shadow-lg"
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 mb-3">
                {lang === "ja" ? "パッケージ内容" : "Package Includes"}
              </h3>
              <div className="space-y-2">
                {[
                  lang === "ja" ? "全課題の一括診断・改善提案" : "Comprehensive audit and improvement plan",
                  lang === "ja" ? "PageSpeed 85点以上を保証" : "PageSpeed 85+ guaranteed",
                  lang === "ja" ? "SSL A+グレード + セキュリティ対策" : "SSL A+ grade + security hardening",
                  lang === "ja" ? "OGP/SNS/MEO 3経路の集客最適化" : "3-channel reach optimization (social/search/maps)",
                  hasDemo ? (lang === "ja" ? "改善デモサイト公開済み" : "Demo site already live") : (lang === "ja" ? "改善デモサイト作成" : "Demo site creation"),
                  lang === "ja" ? "導入後30日間の無料サポート" : "30-day free post-launch support",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="text-zinc-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={`rounded-xl p-5 ${lang === "ja" ? "bg-indigo-50" : "bg-indigo-50"}`}>
              <h3 className="text-sm font-bold text-zinc-900 mb-3">
                {lang === "ja" ? "納期と進め方" : "Timeline & Process"}
              </h3>
              <div className="space-y-3">
                {[
                  { step: "1", label: lang === "ja" ? "無料診断レポート確認（今すぐ）" : "Review free diagnostic (now)", time: "0分" },
                  { step: "2", label: lang === "ja" ? "15分無料相談で優先順位決定" : "15min free consult to prioritize", time: lang === "ja" ? "翌日以降" : "Next day" },
                  { step: "3", label: lang === "ja" ? "改善作業着手〜完了" : "Implementation start → complete", time: `${totalWeeks}${lang === "ja" ? "週間" : "wks"}` },
                  { step: "4", label: lang === "ja" ? "公開・効果測定開始" : "Go live + measurement", time: lang === "ja" ? "即日" : "Same day" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-200 text-xs font-bold text-indigo-700">{item.step}</span>
                    <span className="text-sm text-zinc-700 flex-1">{item.label}</span>
                    <span className="text-[10px] font-bold text-indigo-500">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
