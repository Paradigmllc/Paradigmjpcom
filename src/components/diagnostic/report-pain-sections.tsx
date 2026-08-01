"use client"

import { motion } from "framer-motion"
import { AlertTriangle, Search, Shield, TrendingUp, Zap } from "lucide-react"
import type { DiagnosticReportData } from "@/lib/sales/diagnostic"
import {
  buildFirstImpressionSignals,
  buildPageSpeedComparison,
  type FirstImpressionSignalKind,
  type FirstImpressionSignalStatus,
} from "./report-evidence"

const SIGNAL_STYLE: Record<FirstImpressionSignalStatus, { card: string; icon: string; text: string }> = {
  pass: {
    card: "border-emerald-500/30 bg-emerald-500/5",
    icon: "text-emerald-400",
    text: "text-emerald-400",
  },
  issue: {
    card: "border-rose-500/30 bg-rose-500/5",
    icon: "text-rose-400",
    text: "text-rose-400",
  },
  unknown: {
    card: "border-zinc-700 bg-zinc-800/40",
    icon: "text-zinc-400",
    text: "text-zinc-400",
  },
}

const SIGNAL_ICON: Record<FirstImpressionSignalKind, typeof Zap> = {
  performance: Zap,
  ssl: Shield,
  social: Search,
}

// ─── Industry benchmark comparison (data-driven, no fabricated competitors) ──
export function CompetitorComparison({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  const isJa = lang === "ja"
  const comparison = buildPageSpeedComparison(data)

  // 実測スコア、目標値、出典が揃わない場合は比較セクションを表示しない。
  if (!comparison) return null
  const yourSpeed = comparison.measuredScore
  const industryTarget = comparison.targetScore

  const gap = Math.max(0, industryTarget - yourSpeed)
  const maxVal = Math.max(100, yourSpeed, industryTarget)
  const rows = [
    { label: isJa ? "御社サイト" : "Your site", value: yourSpeed, isYou: true },
    { label: isJa ? "業界の目安水準" : "Industry target", value: industryTarget, isYou: false },
  ]

  return (
    <section className="px-5 py-14 bg-gradient-to-b from-rose-50 to-white border-t border-rose-100">
      <div className="mx-auto max-w-6xl">
        {/* Pain headline */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700 mb-4">
            <AlertTriangle className="h-3 w-3" />
            {gap > 0
              ? (isJa ? "業界の目安に届いていません" : "Below the industry target")
              : (isJa ? "業界の目安水準を満たしています" : "Meets the industry target")}
          </span>
          <h2 className="text-2xl font-bold text-zinc-900">
            {gap > 0
              ? (isJa
                ? `PageSpeedが業界の目安より${gap}点低い状態です`
                : `Your PageSpeed is ${gap} pts below the industry target`)
              : (isJa
                ? "PageSpeedは業界の目安水準に達しています"
                : "Your PageSpeed meets the industry target")}
          </h2>
          <p className="mt-3 text-sm text-zinc-500 max-w-2xl mx-auto">
            {isJa
              ? "表示速度の遅れは検索評価と離脱率に直結します。"
              : "Slow page speed directly impacts search ranking and bounce rate."}
            {` (${comparison.source})`}
          </p>
        </motion.div>

        {/* Real vs target benchmark bars */}
        <div className="mx-auto max-w-2xl space-y-5 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          {rows.map((row, i) => (
            <motion.div
              key={row.label}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-zinc-700">
                  {row.isYou && <span className="flex h-5 w-5 items-center justify-center rounded bg-rose-500 text-[9px] font-bold text-white">YOU</span>}
                  {row.label}
                </span>
                <span className={`font-bold tabular-nums ${row.isYou ? (row.value < 50 ? "text-rose-600" : row.value < 70 ? "text-amber-600" : "text-emerald-600") : "text-zinc-500"}`}>
                  {row.value}/100
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
                <motion.div
                  className={`h-full rounded-full ${row.isYou ? "bg-rose-500" : "bg-zinc-400"}`}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${Math.min(100, (row.value / maxVal) * 100)}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, delay: 0.2 + i * 0.1 }}
                />
              </div>
            </motion.div>
          ))}
        </div>

        <p className="mt-6 text-center text-[10px] text-zinc-400">
          {isJa
            ? `※目安水準の出典: ${comparison.source}。御社スコアは公開サイトの実測値です。`
            : `Target source: ${comparison.source}. Your score is measured from the public site.`}
        </p>
      </div>
    </section>
  )
}

// ─── "Your site in 5 seconds" visual breakdown ──────────────
export function FiveSecondAudit({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  const signals = buildFirstImpressionSignals(data, lang)
  const issueCount = signals.filter((signal) => signal.status === "issue").length
  const measuredCount = signals.filter((signal) => signal.status !== "unknown").length

  return (
    <section className="px-5 py-14 bg-zinc-900 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold">
            {lang === "ja" ? "実測できた第一印象シグナル" : "Measured first-impression signals"}
          </h2>
          <p className="mt-3 text-zinc-400 text-sm">
            {lang === "ja"
              ? `${measuredCount}項目を測定し、${issueCount}項目で改善シグナルを検出しました。未測定は判定しません。`
              : `${measuredCount} measured; ${issueCount} improvement signal${issueCount === 1 ? "" : "s"} observed. Unmeasured items remain unknown.`}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {signals.map((signal, i) => {
            const style = SIGNAL_STYLE[signal.status]
            const SignalIcon = SIGNAL_ICON[signal.kind]
            return (
            <motion.div
              key={signal.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-xl border p-5 ${style.card}`}
            >
              <SignalIcon className={`h-6 w-6 mb-3 ${style.icon}`} />
              <div className="text-sm font-bold mb-1">{signal.label}</div>
              <div className="text-xs text-zinc-400">{signal.detail}</div>
              <div className={`mt-3 text-[10px] font-bold ${style.text}`}>
                {signal.status === "pass"
                  ? (lang === "ja" ? "✓ 実測で基準内" : "✓ Measured within threshold")
                  : signal.status === "issue"
                    ? (lang === "ja" ? "✗ 改善シグナル" : "✗ Improvement signal")
                    : (lang === "ja" ? "? 判定保留" : "? Unknown")}
              </div>
            </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── "We are the solution" section ──────────────────────────
export function SaviorPositioning({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  const issues = data.acts.filter(a => a.type === "pain" || a.type === "fear").slice(0, 4)
  const hasDemo = !!data.demo_url
  const solutionItems = [
    {
      label: lang === "ja" ? "表示速度の改善" : "Performance remediation",
      detail: lang === "ja"
        ? "実測したボトルネックを基に、対象範囲と合格条件を契約前に確定します。"
        : "Scope and acceptance checks are agreed from measured bottlenecks before work begins.",
    },
    {
      label: lang === "ja" ? "SSL/HSTSの強化" : "SSL/HSTS hardening",
      detail: lang === "ja"
        ? "証明書とヘッダーの実測結果に応じて、必要な変更だけを提案します。"
        : "Changes are proposed only after the current certificate and header state is measured.",
    },
    {
      label: lang === "ja" ? "OGP/SNS表示の整備" : "OGP/social metadata",
      detail: lang === "ja"
        ? "公開ページで不足を確認できた項目を、合意した対象ページで整備します。"
        : "Observed gaps are addressed only on the pages included in the agreed scope.",
    },
    ...(hasDemo
      ? [{
          label: lang === "ja" ? "改善デモを確認可能" : "Demo available for review",
          detail: lang === "ja"
            ? "このレポートに実在するデモURLが記録されています。"
            : "A live demo URL is recorded in this report.",
        }]
      : []),
  ]

  return (
    <section className="px-5 py-14 bg-gradient-to-b from-white to-violet-50">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700 mb-4">
            <TrendingUp className="h-3 w-3" />
            {lang === "ja" ? "改善範囲の候補" : "Potential remediation scope"}
          </span>
          <h2 className="text-2xl font-bold text-zinc-900">
            {lang === "ja" ? "実測結果から、合意する実装範囲を決めます" : "Measured evidence defines the scope we agree to deliver"}
          </h2>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Problems we solve */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-rose-600 mb-2">
              {lang === "ja" ? "御社が抱える問題" : "Problems you have"}
            </h3>
            {issues.map((issue, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-start gap-3 rounded-lg border border-rose-100 bg-rose-50/30 p-4"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-rose-100 text-rose-600 text-[10px] font-bold">✗</div>
                <div>
                  <div className="text-sm font-bold text-zinc-800">{issue.headline}</div>
                  <div className="mt-0.5 text-xs text-zinc-500">{issue.metric_label}: {issue.metric_value}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Our solution */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-violet-700 mb-2">
              {lang === "ja" ? "提案可能な実装範囲" : "Scope options"}
            </h3>
            {solutionItems.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-start gap-3 rounded-lg border border-violet-100 bg-violet-50/30 p-4"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-violet-100 text-violet-700 text-[10px] font-bold">→</div>
                <div>
                  <div className="text-sm font-bold text-zinc-800">{item.label}</div>
                  <div className="mt-0.5 text-xs text-zinc-500">{item.detail}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-zinc-500 mb-3">
            {lang === "ja"
              ? "対象範囲、前提条件、合格基準、除外事項、変更承認を文書で確定してから着手します。"
              : "One fixed scope with written dependencies, acceptance checks, exclusions, and change approval."}
          </p>
        </motion.div>
      </div>
    </section>
  )
}
