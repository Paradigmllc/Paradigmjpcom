"use client"

import { motion } from "framer-motion"
import {
  AlertTriangle,
  BarChart3,
  Gauge,
  LineChart,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react"
import type { PainPoint } from "@/lib/sales/company-intelligence"
import type { ReportLang } from "./report-copy"
import { CountUpMetric, PulseHighlight, StaggeredFadeIn, SlideInSection } from "./ReportAnimations"

function shortText(value: string | undefined, fallback: string): string {
  const text = value?.trim()
  if (!text) return fallback
  return text.length > 150 ? `${text.slice(0, 150)}...` : text
}

export interface KpiMetric {
  label: string
  value: number
  prefix?: string
  suffix?: string
  icon: React.ReactNode
  trend?: "up" | "down" | "neutral"
  trendLabel?: string
  severity?: "good" | "warning" | "critical"
}

export interface ExecutiveSummaryProps {
  lang: ReportLang
  companyName: string
  reportLabel: string
  businessImpact: string
  firstAction: string
  topPain?: PainPoint
  kpis?: KpiMetric[]
  sourceScore?: number
  confidence?: number
  monthlyLoss?: number
  findingsCount?: number
  reportUrl?: string
}

export function ReportExecutiveSummary({
  lang,
  companyName,
  reportLabel,
  businessImpact,
  firstAction,
  topPain,
  kpis,
  sourceScore,
  confidence,
  monthlyLoss,
  findingsCount,
}: ExecutiveSummaryProps) {
  const isJa = lang === "ja"
  const title = isJa ? "診断サマリー" : "Executive Summary"
  const lead = isJa
    ? `${companyName}の公開データを横断解析し、見込み客が離脱する要因と改善余地を定量的にまとめました。`
    : `Cross-referenced public data for ${companyName} to quantify buyer friction and improvement potential.`
  const findingLabel = isJa ? "見込み客に起きていること" : "Buyer-facing friction"
  const impactLabel = isJa ? "事業上の意味" : "Business impact"
  const actionLabel = isJa ? "最初の一手" : "First move"

  const measuredKpis: KpiMetric[] = [
    {
      label: isJa ? "ソースカバレッジ" : "Source Coverage",
      value: sourceScore ?? 0,
      suffix: "%",
      icon: <BarChart3 size={18} />,
      trend: "neutral",
      trendLabel: isJa ? "取得ソースの範囲" : "collected source scope",
      severity: (sourceScore ?? 0) >= 70 ? "good" : (sourceScore ?? 0) >= 45 ? "warning" : "critical",
    },
  ]
  if (confidence != null) {
    measuredKpis.push({
      label: isJa ? "推定信頼度" : "Confidence",
      value: confidence,
      prefix: "",
      suffix: "/100",
      icon: <ShieldCheck size={18} />,
      trend: confidence >= 70 ? "up" : "down",
      trendLabel: isJa ? "シグナル一致度" : "signal match",
      severity: confidence >= 70 ? "good" : confidence >= 45 ? "warning" : "critical",
    })
  }
  if (monthlyLoss != null) {
    measuredKpis.push({
      label: isJa ? "月間損失試算" : "Monthly Loss",
      value: monthlyLoss,
      prefix: isJa ? "¥" : "$",
      suffix: "",
      icon: <TrendingDown size={18} />,
      trend: "down",
      trendLabel: isJa ? "推定値" : "estimated",
      severity: monthlyLoss > (isJa ? 500000 : 5000) ? "critical" : "warning",
    })
  }
  measuredKpis.push({
      label: isJa ? "優先対応項目" : "Priority Findings",
      value: findingsCount ?? 0,
      suffix: "",
      icon: <AlertTriangle size={18} />,
      trend: "neutral",
      trendLabel: isJa ? "改善ポイント" : "action items",
      severity: (findingsCount ?? 0) > 3 ? "critical" : "warning",
  })
  const defaultKpis = kpis ?? measuredKpis

  const severityColors = {
    good: "text-emerald-500",
    warning: "text-amber-500",
    critical: "text-rose-500",
  }

  return (
    <section className="relative overflow-hidden px-5 py-14">
      <div
        className="absolute inset-0 -z-10 opacity-[0.03]"
        style={{
          background:
            "radial-gradient(ellipse at 20% 50%, #1e3a5f 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, #f59e0b 0%, transparent 50%)",
        }}
      />

      <div className="mx-auto max-w-6xl">
        <SlideInSection direction="up" delay={0}>
          <div className="mb-8 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-semibold text-violet-700 shadow-sm">
              <Sparkles size={12} />
              {reportLabel}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
              <Gauge size={12} />
              {isJa ? "公開データに基づく定量分析" : "Quantitative public-data analysis"}
            </span>
          </div>
        </SlideInSection>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <SlideInSection direction="left" delay={0.1}>
            <div>
              <h2 className="text-3xl font-semibold leading-tight text-zinc-950 sm:text-4xl">
                {title}
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600">{lead}</p>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="text-xs font-semibold text-zinc-500">{findingLabel}</div>
                  <p className="mt-2 text-sm leading-6 text-zinc-800">
                    {shortText(topPain?.title, reportLabel)}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="text-xs font-semibold text-zinc-500">{impactLabel}</div>
                  <p className="mt-2 text-sm leading-6 text-zinc-800">
                    {shortText(businessImpact, lead)}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="text-xs font-semibold text-zinc-500">{actionLabel}</div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-zinc-950">
                    {shortText(topPain?.recommendedAction ?? firstAction, firstAction)}
                  </p>
                </div>
              </div>
            </div>
          </SlideInSection>

          <SlideInSection direction="right" delay={0.2}>
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {isJa ? "主要指標" : "Key Metrics"}
              </h3>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {defaultKpis.map((kpi, i) => (
                  <motion.div
                    key={kpi.label}
                    className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-3"
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
                  >
                    <div className="flex items-center gap-2">
                      <span className={severityColors[kpi.severity ?? "warning"]}>
                        {kpi.icon}
                      </span>
                      <span className="text-[11px] font-semibold text-zinc-500">{kpi.label}</span>
                    </div>
                    <div className="mt-2">
                      <p className="text-lg font-bold tabular-nums text-zinc-950">
                        <CountUpMetric
                          value={kpi.value}
                          prefix={kpi.prefix}
                          suffix={kpi.suffix}
                          duration={1}
                        />
                      </p>
                      {kpi.trendLabel && (
                        <div className="mt-0.5 flex items-center gap-1">
                          {kpi.trend === "up" && <TrendingUp size={10} className="text-emerald-500" />}
                          {kpi.trend === "down" && <TrendingDown size={10} className="text-rose-500" />}
                          {(kpi.trend === "up" || kpi.trend === "down") && (
                            <span
                              className={`text-[10px] font-medium ${
                                kpi.trend === "up" ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              {kpi.trendLabel}
                            </span>
                          )}
                          {kpi.trend === "neutral" && (
                            <span className="text-[10px] text-zinc-400">{kpi.trendLabel}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-lg bg-gradient-to-r from-[#1e3a5f]/5 to-[#f59e0b]/5 p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100">
                  <Zap size={14} className="text-violet-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-800">
                    {isJa ? "次のアクション" : "Next action"}
                  </p>
                  <p className="text-[11px] leading-5 text-zinc-600">
                    {shortText(firstAction, "")}
                  </p>
                </div>
              </div>
            </div>
          </SlideInSection>
        </div>

        <StaggeredFadeIn delay={0.4} stagger={0.06} className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { dot: "bg-emerald-500", label: isJa ? "良好" : "Good" },
            { dot: "bg-amber-500", label: isJa ? "注意" : "Warning" },
            { dot: "bg-rose-500", label: isJa ? "要対応" : "Critical" },
            { dot: "bg-violet-500", label: isJa ? "機会" : "Opportunity" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 rounded-md border border-zinc-100 bg-white px-3 py-2">
              <span className={`h-2.5 w-2.5 rounded-full ${item.dot}`} />
              <span className="text-[11px] font-medium text-zinc-600">{item.label}</span>
            </div>
          ))}
        </StaggeredFadeIn>
      </div>
    </section>
  )
}
