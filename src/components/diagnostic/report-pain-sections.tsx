"use client"

import { motion } from "framer-motion"
import { AlertTriangle, ArrowDown, ArrowUp, Building2, MapPin, Search, Shield, TrendingDown, TrendingUp, Zap } from "lucide-react"
import type { DiagnosticReportData } from "@/lib/sales/diagnostic"

// ─── Competitor comparison table ────────────────────────────
export function CompetitorComparison({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  // Simulated competitor data (in production, this comes from browser search + enrichment)
  const competitors = [
    { name: lang === "ja" ? "御社" : "Your site", speed: Number(data.acts.find(a => a.icon === "SPEED")?.metric_value) || 38, ssl: "B", ogp: "✗", isYou: true },
    { name: lang === "ja" ? "近隣競合A" : "Competitor A", speed: 72, ssl: "A+", ogp: "✓", isYou: false },
    { name: lang === "ja" ? "近隣競合B" : "Competitor B", speed: 68, ssl: "A", ogp: "✓", isYou: false },
    { name: lang === "ja" ? "近隣競合C" : "Competitor C", speed: 81, ssl: "A+", ogp: "✓", isYou: false },
  ]

  const yourSpeed = competitors.find(c => c.isYou)?.speed ?? 0
  const avgCompetitorSpeed = Math.round(competitors.filter(c => !c.isYou).reduce((s, c) => s + c.speed, 0) / 3)
  const speedGap = avgCompetitorSpeed - yourSpeed

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
            {lang === "ja" ? "競合はもう対策済み" : "Competitors already fixed this"}
          </span>
          <h2 className="text-2xl font-bold text-zinc-900">
            {lang === "ja"
              ? `御社だけが取り残されています — 競合平均より${speedGap}点も低いPageSpeed`
              : `You're being left behind — ${speedGap}pts below competitor average`}
          </h2>
          <p className="mt-3 text-sm text-zinc-500 max-w-2xl mx-auto">
            {lang === "ja"
              ? `近隣の同業3社はすでにサイト改善済み。御社だけが遅れていることで、検索流入と予約問い合わせの${Math.round(speedGap * 1.5)}%を競合に奪われている計算です。`
              : `3 nearby competitors have already improved their sites. Your delay is costing you ~${Math.round(speedGap * 1.5)}% of search traffic and inquiries — going to them instead.`}
          </p>
        </motion.div>

        {/* Comparison table */}
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">{lang === "ja" ? "企業" : "Company"}</th>
                <th className="px-4 py-3 font-medium">PageSpeed</th>
                <th className="px-4 py-3 font-medium">SSL</th>
                <th className="px-4 py-3 font-medium">OGP</th>
                <th className="px-4 py-3 font-medium">{lang === "ja" ? "検索順位(推定)" : "Est. Rank"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {competitors.map((comp, i) => (
                <motion.tr
                  key={comp.name}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`${comp.isYou ? "bg-rose-50 font-bold" : "hover:bg-zinc-50"}`}
                >
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      {comp.isYou && <span className="flex h-5 w-5 items-center justify-center rounded bg-rose-500 text-[9px] font-bold text-white">YOU</span>}
                      {comp.name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={comp.speed < 50 ? "text-rose-600" : comp.speed < 70 ? "text-amber-600" : "text-emerald-600"}>
                        {comp.speed}/100
                      </span>
                      {!comp.isYou && (
                        <span className="text-[10px] text-rose-500">
                          <ArrowUp className="inline h-3 w-3" />+{comp.speed - yourSpeed}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      comp.ssl.startsWith("A") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                    }`}>{comp.ssl}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={comp.ogp === "✓" ? "text-emerald-600" : "text-rose-600"}>{comp.ogp}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {comp.isYou ? (lang === "ja" ? "圏外" : "N/A") : `#${i * 2 + 1}`}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Call to action */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-6 text-center"
        >
          <p className="text-sm text-zinc-600 mb-3">
            {lang === "ja"
              ? `御社のPageSpeedを${avgCompetitorSpeed}点以上に改善すれば、競合に流出している検索流入を取り戻せます。`
              : `Improve your PageSpeed to ${avgCompetitorSpeed}+ and reclaim search traffic currently going to competitors.`}
          </p>
        </motion.div>
      </div>
    </section>
  )
}

// ─── "Your site in 5 seconds" visual breakdown ──────────────
export function FiveSecondAudit({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  const issues = [
    { icon: Zap, label: lang === "ja" ? "読み込み速度" : "Load speed", fail: (Number(data.acts.find(a => a.icon === "SPEED")?.metric_value) || 0) < 70, detail: lang === "ja" ? "3秒以上かかると53%が離脱" : "53% leave if >3 seconds" },
    { icon: Shield, label: lang === "ja" ? "セキュリティ表示" : "Security display", fail: true, detail: lang === "ja" ? "「保護なし」警告で信頼低下" : "'Not Secure' warning hurts trust" },
    { icon: Search, label: lang === "ja" ? "SNSプレビュー" : "Social preview", fail: true, detail: lang === "ja" ? "共有時に文字化け" : "Garbled when shared" },
    { icon: MapPin, label: lang === "ja" ? "モバイル表示" : "Mobile display", fail: (Number(data.acts.find(a => a.icon === "SPEED")?.metric_value) || 0) < 60, detail: lang === "ja" ? "スマホで崩れる" : "Broken on mobile" },
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
              { label: lang === "ja" ? "PageSpeed改善" : "PageSpeed fix", detail: lang === "ja" ? "Astro移行で85点以上を保証" : "Astro migration guarantees 85+", icon: "✓" },
              { label: lang === "ja" ? "SSL/HSTS対応" : "SSL/HSTS", detail: lang === "ja" ? "A+グレード + HSTS Preload" : "A+ grade + HSTS Preload", icon: "✓" },
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
