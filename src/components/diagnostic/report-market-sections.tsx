"use client"

import { motion } from "framer-motion"
import { BarChart3, Globe, TrendingUp, Users } from "lucide-react"
import type { DiagnosticReportData } from "@/lib/sales/diagnostic"

// ─── Market presence summary ────────────────────────────────
export function MarketPresenceSummary({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  const meta = data.meta ?? {}
  const radar = meta.cloudflare_radar as Record<string, unknown> | undefined
  const tranco = meta.tranco as Record<string, unknown> | undefined
  const simweb = meta.similarweb_free as Record<string, unknown> | undefined
  const commoncrawl = meta.commoncrawl as Record<string, unknown> | undefined
  const github = meta.github as Record<string, unknown> | undefined
  const builtwith = meta.builtwith as Record<string, unknown> | undefined
  const dns = meta.dns as Record<string, unknown> | undefined
  const wayback = meta.wayback_machine as Record<string, unknown> | undefined

  const hasAnyMarketData = radar || tranco || simweb || commoncrawl || github || builtwith
  if (!hasAnyMarketData) return null

  return (
    <section className="px-5 py-14 bg-white border-t border-zinc-200">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-2 mb-6">
          <Globe className="h-5 w-5 text-violet-600" />
          <h2 className="text-xl font-bold text-zinc-900">
            {lang === "ja" ? "市場における御社の立ち位置" : "Your Market Position"}
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Traffic rank */}
          <MarketCard
            icon={<TrendingUp className="h-4 w-4" />}
            label={lang === "ja" ? "推定トラフィック" : "Est. Traffic"}
            value={
              simweb?.visits
                ? `${(simweb.visits as number).toLocaleString()} PV/月`
                : radar?.rank_bucket
                  ? (radar.rank_bucket as string)
                  : tranco?.rank
                    ? `${lang === "ja" ? "Tranco " : "Rank "}${(tranco.rank as number).toLocaleString()}`
                    : lang === "ja" ? "データ収集中" : "Collecting"
            }
            detail={simweb?.rank ? `${lang === "ja" ? "グローバル " : "Global #"}${(simweb.rank as number).toLocaleString()}` : undefined}
            tone="indigo"
          />

          {/* Site scale */}
          <MarketCard
            icon={<Globe className="h-4 w-4" />}
            label={lang === "ja" ? "サイト規模" : "Site Scale"}
            value={
              commoncrawl?.pages
                ? `${(commoncrawl.pages as number).toLocaleString()} ${lang === "ja" ? "ページ" : "pages"}`
                : wayback?.total_snapshots
                  ? `${(wayback.total_snapshots as number).toLocaleString()} ${lang === "ja" ? "スナップショット" : "snapshots"}`
                  : lang === "ja" ? "データ収集中" : "Collecting"
            }
            detail={wayback?.years_active ? `${lang === "ja" ? "運用" : "Active"} ${wayback.years_active as number}${lang === "ja" ? "年" : "y"}` : undefined}
            tone="blue"
          />

          {/* Tech maturity */}
          <MarketCard
            icon={<BarChart3 className="h-4 w-4" />}
            label={lang === "ja" ? "技術成熟度" : "Tech Maturity"}
            value={
              github?.org
                ? `${(github.repos as number)} ${lang === "ja" ? "リポジトリ" : "repos"}`
                : builtwith?.tech
                  ? `${(builtwith.tech as string[]).length} ${lang === "ja" ? "技術検出" : "tech detected"}`
                  : dns?.subdomains
                    ? `${(dns?.total as number ?? 0)} ${lang === "ja" ? "サブドメイン" : "subdomains"}`
                    : lang === "ja" ? "データ収集中" : "Collecting"
            }
            detail={github?.org ? `GitHub: ${github.org as string}` : builtwith?.traffic ? `BuiltWith: ${builtwith.traffic as string}` : undefined}
            tone="purple"
          />

          {/* Reach */}
          <MarketCard
            icon={<Users className="h-4 w-4" />}
            label={lang === "ja" ? "リーチ" : "Reach"}
            value={
              simweb?.countries
                ? `${(simweb.countries as string[]).length + (lang === "ja" ? "カ国から流入" : " countries")}`
                : radar?.categories
                  ? `${(radar.categories as string[]).slice(0, 2).join("/")}`
                  : lang === "ja" ? "データ収集中" : "Collecting"
            }
            detail={simweb?.countries ? (simweb.countries as string[]).slice(0, 3).join(", ") : undefined}
            tone="emerald"
          />
        </div>

        {/* GitHub detail if available */}
        {github?.org && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🐙</span>
              <span className="text-sm font-bold text-zinc-800">GitHub: {github.org as string}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-zinc-500">{lang === "ja" ? "リポジトリ" : "Repos"}</span>
                <div className="mt-1 font-bold text-zinc-900">{github.repos as number}</div>
              </div>
              <div>
                <span className="text-zinc-500">Stars</span>
                <div className="mt-1 font-bold text-zinc-900">{(github.stars as number).toLocaleString()}</div>
              </div>
              <div>
                <span className="text-zinc-500">{lang === "ja" ? "最近の活動" : "Recent"}</span>
                <div className={`mt-1 font-bold ${github.active ? "text-emerald-600" : "text-zinc-400"}`}>
                  {github.active ? (lang === "ja" ? "アクティブ" : "Active") : (lang === "ja" ? "低調" : "Low")}
                </div>
              </div>
            </div>
            {Array.isArray(github.languages) && (github.languages as string[]).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(github.languages as string[]).slice(0, 5).map((lang) => (
                  <span key={lang} className="rounded bg-white px-2 py-0.5 text-[10px] font-medium text-zinc-600 border border-zinc-200">
                    {lang}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </section>
  )
}

function MarketCard({ icon, label, value, detail, tone }: {
  icon: React.ReactNode
  label: string
  value: string
  detail?: string
  tone: string
}) {
  const tones: Record<string, string> = {
    indigo: "bg-violet-50 text-violet-700 border-violet-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`rounded-xl border p-5 ${tones[tone] ?? tones.indigo}`}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-[10px] font-semibold uppercase opacity-70">{label}</span>
      </div>
      <div className="text-lg font-bold">{value}</div>
      {detail && <div className="mt-1 text-[10px] opacity-70">{detail}</div>}
    </motion.div>
  )
}
