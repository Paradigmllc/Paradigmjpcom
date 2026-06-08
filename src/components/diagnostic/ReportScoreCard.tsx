"use client"

import { Children, type ReactNode } from "react"
import { motion } from "framer-motion"
import { AlertTriangle, CheckCircle2, TrendingDown, TrendingUp, Info } from "lucide-react"
import { CountUpMetric, PulseHighlight } from "./ReportAnimations"

type Severity = "critical" | "warning" | "good" | "info"

export interface ScoreCardProps {
  score: number
  maxScore?: number
  label: string
  severity?: Severity
  benchmark?: number
  benchmarkLabel?: string
  detail?: string
  className?: string
  animate?: boolean
  icon?: React.ReactNode
}

const SEVERITY_CONFIG: Record<
  Severity,
  { bg: string; border: string; text: string; icon: React.ReactNode; label: string }
> = {
  critical: {
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-700",
    icon: <AlertTriangle size={16} />,
    label: "Critical",
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    icon: <TrendingDown size={16} />,
    label: "Action Needed",
  },
  good: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    icon: <CheckCircle2 size={16} />,
    label: "Good",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    icon: <Info size={16} />,
    label: "Info",
  },
}

function getSeverityFromScore(score: number, benchmark?: number): Severity {
  if (benchmark && score < benchmark * 0.6) return "critical"
  if (benchmark && score < benchmark * 0.85) return "warning"
  if (score >= 80) return "good"
  if (score >= 50) return "warning"
  return "critical"
}

export function ReportScoreCard({
  score,
  maxScore = 100,
  label,
  severity: severityProp,
  benchmark,
  benchmarkLabel = "Industry avg",
  detail,
  className,
  animate = true,
  icon,
}: ScoreCardProps) {
  const severity = severityProp ?? getSeverityFromScore(score, benchmark)
  const config = SEVERITY_CONFIG[severity]
  const pct = Math.min(100, Math.max(0, (score / maxScore) * 100))
  const gap = benchmark != null ? score - benchmark : null
  const circumference = 2 * Math.PI * 40
  const strokeDashoffset = circumference * (1 - pct / 100)

  const strokeColor =
    severity === "critical"
      ? "#ef4444"
      : severity === "warning"
        ? "#f59e0b"
        : severity === "good"
          ? "#10b981"
          : "#3b82f6"

  return (
    <motion.div
      className={className}
      initial={animate ? { opacity: 0, y: 20 } : {}}
      whileInView={animate ? { opacity: 1, y: 0 } : {}}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className={`rounded-xl border ${config.border} ${config.bg} p-5 shadow-sm`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full border ${config.border} px-2.5 py-0.5 text-[11px] font-semibold ${config.text}`}>
                {config.icon}
                {config.label}
              </span>
            </div>
            <h3 className="mt-2 text-sm font-semibold text-zinc-800">{label}</h3>
          </div>
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#e4e4e7"
                strokeWidth="8"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={strokeColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={animate ? { strokeDashoffset: circumference } : {}}
                whileInView={
                  animate ? { strokeDashoffset } : {}
                }
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
              />
            </svg>
            <span className="absolute inset-0 flex flex-col items-center justify-center">
              <CountUpMetric
                value={score}
                className="text-xl font-bold tabular-nums text-zinc-900"
                duration={1.2}
              />
              <span className="text-[10px] text-zinc-400">/ {maxScore}</span>
            </span>
          </div>
        </div>

        {detail && (
          <p className="mt-3 text-xs leading-5 text-zinc-600">{detail}</p>
        )}

        {gap != null && (
          <div className="mt-3 flex items-center gap-2 border-t border-zinc-200 pt-3">
            <span className="text-xs text-zinc-500">{benchmarkLabel}: {benchmark}</span>
            {gap >= 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                <TrendingUp size={12} />+{Math.round(gap)}
              </span>
            ) : (
              <PulseHighlight active={severity === "critical"}>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                  <TrendingDown size={12} />{Math.round(gap)}
                </span>
              </PulseHighlight>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── ScoreCardGrid ──────────────────────────────────────────────

export function ScoreCardGrid({
  children,
  className,
  columns = 3,
  animate = true,
}: {
  children: ReactNode
  className?: string
  columns?: 2 | 3 | 4
  animate?: boolean
}) {
  const cols = { 2: "md:grid-cols-2", 3: "md:grid-cols-2 lg:grid-cols-3", 4: "md:grid-cols-2 lg:grid-cols-4" }

  return (
    <motion.div
      className={`grid gap-4 sm:grid-cols-1 ${cols[columns]} ${className ?? ""}`}
      initial={animate ? "hidden" : {}}
      whileInView={animate ? "visible" : {}}
      viewport={{ once: true, margin: "-40px" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.1 } },
      }}
    >
      {Children.map(children, (child, i) => (
        <motion.div
          key={i}
          variants={{
            hidden: { opacity: 0, y: 16 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
}
