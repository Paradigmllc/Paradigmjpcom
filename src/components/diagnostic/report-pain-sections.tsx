"use client"

import { motion } from "framer-motion"
import { AlertTriangle, MapPin, Search, Shield, TrendingUp, Zap } from "lucide-react"
import type { DiagnosticReportData } from "@/lib/sales/diagnostic"

// ─── Industry benchmark comparison (data-driven, no fabricated competitors) ──
export function CompetitorComparison({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  const isJa = lang === "ja"
  const speedAct = data.acts.find(a => a.icon === "SPEED")
  const yourSpeed = Number(speedAct?.metric_value)
  const benchNum = Number(String(speedAct?.metric_bench ?? "").replace(/[^0-9.]/g, ""))
  const industryTarget = Number.isFinite(benchNum) && benchNum > 0 ? Math.round(benchNum) : null

  // 実データ（実測スコア + ベンチマーク）が無い場合は数値を捏造せずセクション非表示
  if (!Number.isFinite(yourSpeed) || industryTarget === null) return null

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
            {speedAct?.metric_bench ? `（${speedAct.metric_bench}）` : null}
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
            ? "※業界の目安水準は一般的なベンチマークに基づく参考値です。実測値は御社サイトの計測結果です。"
            : "Industry target is a general benchmark reference; your score is measured from your live site."}
        </p>
      </div>
    </section>
  )
}

// ─── "Your site in 5 seconds" visual breakdown ──────────────
export function FiveSecondAudit({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  const speedVal = Number(data.acts.find(a => a.icon === "SPEED")?.metric_value) || 0
  const hasTrustIssue = data.acts.some(a => a.icon === "TRUST")
  const hasSocialIssue = data.acts.some(a => a.icon === "SNS")
  const issues = [
    { icon: Zap, label: lang === "ja" ? "読み込み速度" : "Load speed", fail: speedVal > 0 && speedVal < 70, detail: lang === "ja" ? "3秒以上かかると53%が離脱" : "53% leave if >3 seconds" },
    { icon: Shield, label: lang === "ja" ? "セキュリティ表示" : "Security display", fail: hasTrustIssue, detail: lang === "ja" ? "「保護なし」警告で信頼低下" : "'Not Secure' warning hurts trust" },
    { icon: Search, label: lang === "ja" ? "SNSプレビュー" : "Social preview", fail: hasSocialIssue, detail: lang === "ja" ? "共有時に文字化け" : "Garbled when shared" },
    { icon: MapPin, label: lang === "ja" ? "モバイル表示" : "Mobile display", fail: speedVal > 0 && speedVal < 60, detail: lang === "ja" ? "スマホで崩れる" : "Broken on mobile" },
  ]

  const failCount = issues.filter(i => i.fail).length

  return (
    <section className="px-5 py-14 bg-zinc-900 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold">
            {lang === "ja" ? "御社のサイト、最初の5秒で起きていること" : "What happens in the first 5 seconds on your site"}
          </h2>
          <p className="mt-3 text-zinc-400 text-sm">
            {lang === "ja"
              ? `訪問者が離脱するまでに${failCount}つの致命的な問題が発生しています。`
              : `${failCount} critical issues occur before visitors leave.`}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {issues.map((issue, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-xl border p-5 ${issue.fail ? "border-rose-500/30 bg-rose-500/5" : "border-emerald-500/30 bg-emerald-500/5"}`}
            >
              <issue.icon className={`h-6 w-6 mb-3 ${issue.fail ? "text-rose-400" : "text-emerald-400"}`} />
              <div className="text-sm font-bold mb-1">{issue.label}</div>
              <div className="text-xs text-zinc-400">{issue.detail}</div>
              <div className={`mt-3 text-[10px] font-bold ${issue.fail ? "text-rose-400" : "text-emerald-400"}`}>
                {issue.fail ? "✗ 問題あり" : "✓ 正常"}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── "We are the solution" section ──────────────────────────
export function SaviorPositioning({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  const issues = data.acts.filter(a => a.type === "pain" || a.type === "fear").slice(0, 4)
  const hasDemo = !!data.demo_url

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
            {lang === "ja" ? "弊社が解決します" : "We fix this"}
          </span>
          <h2 className="text-2xl font-bold text-zinc-900">
            {lang === "ja" ? "これらすべての問題を、弊社が一括で解決します" : "We solve all of these problems — in one package"}
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
            <h3 className="text-sm font-bold text-emerald-600 mb-2">
              {lang === "ja" ? "弊社のソリューション" : "Our solution"}
            </h3>
            {[
              { label: lang === "ja" ? "PageSpeed改善" : "PageSpeed fix", detail: lang === "ja" ? "Astro移行で85点以上を目標に最適化" : "Astro migration targeting 85+", icon: "✓" },
              { label: lang === "ja" ? "SSL/HSTS対応" : "SSL/HSTS", detail: lang === "ja" ? "A+グレードを目標に設定 + HSTS Preload" : "Targeting A+ grade + HSTS Preload", icon: "✓" },
              { label: lang === "ja" ? "OGP/SNS最適化" : "OGP/Social", detail: lang === "ja" ? "全ページにOGP自動設定" : "Auto-OGP on all pages", icon: "✓" },
              { label: hasDemo ? (lang === "ja" ? "改善デモ公開" : "Demo site live") : (lang === "ja" ? "改善デモ作成" : "Demo site creation"), detail: hasDemo ? (lang === "ja" ? "すでに公開済み・URLあり" : "Already live at demo URL") : (lang === "ja" ? "即日作成・公開" : "Same-day creation"), icon: "✓" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-start gap-3 rounded-lg border border-emerald-100 bg-emerald-50/30 p-4"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-emerald-100 text-emerald-600 text-[10px] font-bold">{item.icon}</div>
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
              ? "すべての対応をパッケージで提供。個別に依頼するより早く、安く、確実です。"
              : "Everything in one package — faster, cheaper, and more reliable than piecemeal fixes."}
          </p>
        </motion.div>
      </div>
    </section>
  )
}
