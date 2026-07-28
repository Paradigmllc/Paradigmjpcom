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
        ? "Astro + 画像最適化とCDN配信を適用し、計測済みの基準値に対して公開時の改善結果を検証します。"
        : "Apply image, delivery, and rendering improvements against the measured baseline, then record launch acceptance checks.",
      timeline: lang === "ja" ? "固定範囲内" : "Fixed scope",
      metric: lang === "ja" ? "公開時に実測" : "Measured at launch",
      icon: Zap,
    },
    {
      problem: trust?.headline ?? (lang === "ja" ? "信頼表示の最適化" : "Trust optimization"),
      solution: lang === "ja"
        ? "公開環境に適したセキュリティヘッダーと信頼表示を設定し、公開前チェックリストで確認します。"
        : "Configure appropriate security headers and buyer-facing trust disclosures, verified with a pre-launch checklist.",
      timeline: lang === "ja" ? "固定範囲内" : "Fixed scope",
      metric: lang === "ja" ? "チェック表で確認" : "Verified checklist",
      icon: CheckCircle2,
    },
    {
      problem: reach?.headline ?? (lang === "ja" ? "集客導線の拡大" : "Reach expansion"),
      solution: lang === "ja"
        ? "合意した対象チャネルの情報設計と問い合わせ導線を整え、計測可能な状態で公開します。"
        : "Localize the agreed Japan buyer journey, inquiry routing, analytics, and operational handoff.",
      timeline: lang === "ja" ? "固定範囲内" : "Fixed scope",
      metric: lang === "ja" ? "導線を公開前確認" : "Buyer journey verified",
      icon: TrendingUp,
    },
  ]

  const hasDemo = !!data.demo_url

  return (
    <section className={`px-5 py-14 ${lang === "ja" ? "bg-gradient-to-b from-white to-violet-50" : "bg-gradient-to-b from-white to-violet-50"}`}>
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700 mb-4">
            <Package className="h-3 w-3" />
            {lang === "ja" ? "Paradigm 解決プラン" : "Paradigm Solution Plan"}
          </span>
          <h2 className="text-2xl font-bold text-zinc-900">
            {lang === "ja"
              ? `御社の${data.company_name}に最適化した改善パッケージ`
              : `Fixed Japan Entry scope for ${data.company_name}`}
          </h2>
          <p className="mt-3 text-sm text-zinc-500 max-w-2xl mx-auto">
            {lang === "ja"
              ? `診断結果をもとに対象範囲・受入条件・追加費用の有無を着手前の書面で確定します。`
              : `One $15,000 setup scope, with dependencies, acceptance checks, exclusions, and third-party costs confirmed in writing before payment.`}
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
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
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
          className="rounded-2xl border border-violet-200 bg-white p-6 shadow-lg"
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 mb-3">
                {lang === "ja" ? "パッケージ内容" : "Package Includes"}
              </h3>
              <div className="space-y-2">
                {[
                  lang === "ja" ? "全課題の一括診断・改善提案" : "Comprehensive audit and improvement plan",
                  lang === "ja" ? "表示速度を基準値から改善し公開時に実測" : "Localized Japan revenue site and conversion path",
                  lang === "ja" ? "信頼表示 + セキュリティ対策" : "Buyer-facing trust and compliance coordination",
                  lang === "ja" ? "合意した集客・問い合わせ導線の最適化" : "Eligible payment or inquiry routing, analytics, and notifications",
                  hasDemo ? (lang === "ja" ? "改善デモサイト公開済み" : "Demo site already live") : (lang === "ja" ? "改善デモサイト作成" : "Demo site creation"),
                  lang === "ja" ? "選定した契約先には月額2,000ドル×3か月＝6,000ドル相当の運用を追加月額なしで提供" : "Selected launch partners receive $2,000/month × 3 months = $6,000 of standard managed-operation value included",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="text-zinc-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={`rounded-xl p-5 ${lang === "ja" ? "bg-violet-50" : "bg-violet-50"}`}>
              <h3 className="text-sm font-bold text-zinc-900 mb-3">
                {lang === "ja" ? "納期と進め方" : "Timeline & Process"}
              </h3>
              <div className="space-y-3">
                {[
                  { step: "1", label: lang === "ja" ? "診断レポート確認" : "Confirm decision authority and fit", time: lang === "ja" ? "今すぐ" : "Fit review" },
                  { step: "2", label: lang === "ja" ? "15分の要件確認" : "Sign, pay $15,000, and provide launch inputs", time: lang === "ja" ? "翌日以降" : "Before kickoff" },
                  { step: "3", label: lang === "ja" ? "合意範囲の実装・検証" : "Implement and verify the fixed scope", time: lang === "ja" ? "書面で確定" : "14-business-day guarantee" },
                  { step: "4", label: lang === "ja" ? "公開・効果測定開始" : "Launch, operate, and hand over", time: lang === "ja" ? "検証後" : "6 managed months" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-200 text-xs font-bold text-violet-700">{item.step}</span>
                    <span className="text-sm text-zinc-700 flex-1">{item.label}</span>
                    <span className="text-[10px] font-bold text-violet-500">{item.time}</span>
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
