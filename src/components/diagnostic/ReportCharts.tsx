"use client"

import { motion } from "framer-motion"

export interface BenchmarkItem {
  label: string
  yourScore: number
  industryAvg: number
}

export interface LossImpactItem {
  label: string
  amount: number
}

export interface SourceCoverageItem {
  label: string
  value: number
}

export interface TimelinePoint {
  month: string
  loss: number
  competitorGap: number
}

const COLORS = {
  darkBlue: "#1e3a5f",
  gold: "#f59e0b",
  violet: "#7c5cff",
  rose: "#ef4444",
  emerald: "#10b981",
  sky: "#0ea5e9",
  slate: { 50: "#f8fafc", 200: "#e2e8f0", 400: "#94a3b8", 600: "#475569", 800: "#1e293b" },
}

// ─── Performance Gauge (radial) ──────────────────────────────

export function PerformanceGauge({
  score,
  maxScore = 100,
  label,
  industryAvg,
  lang = "ja",
}: {
  score: number
  maxScore?: number
  label: string
  industryAvg?: number
  lang?: string
}) {
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(score / maxScore, 1)
  const color = pct < 0.4 ? COLORS.rose : pct < 0.7 ? COLORS.gold : COLORS.emerald

  return (
    <motion.div
      className="flex flex-col items-center"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
    >
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={radius} fill="none" stroke={COLORS.slate[200]} strokeWidth="10" />
        <motion.circle
          cx="90" cy="90" r={radius} fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - pct) }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          transform="rotate(-90 90 90)"
        />
        <text x="90" y="82" textAnchor="middle" className="fill-slate-800" fontSize="28" fontWeight="bold">
          {score}
        </text>
        <text x="90" y="105" textAnchor="middle" className="fill-slate-400" fontSize="12">
          / {maxScore}
        </text>
      </svg>
      <p className="text-sm font-semibold text-slate-700 mt-1">{label}</p>
      {industryAvg != null && (
        <p className="text-xs text-slate-400">{lang === "ja" ? `業界平均 ${industryAvg} 点` : `Industry avg ${industryAvg}`}</p>
      )}
    </motion.div>
  )
}

// ─── Loss Impact Bar Chart ──────────────────────────────────

export function LossImpactBar({ items, lang = "ja" }: { items: LossImpactItem[]; lang?: string }) {
  const maxVal = Math.max(...items.map((i) => i.amount), 1)
  const barH = 28
  const gap = 8
  const h = items.length * (barH + gap) + 20
  const w = 500
  const fmtAmount = (n: number) => lang === "ja" ? `¥${(n / 10000).toFixed(1)}万` : `$${Math.round(n / 110).toLocaleString()}`

  return (
    <motion.div className="w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
        {items.map((item, i) => {
          const pct = item.amount / maxVal
          const y = i * (barH + gap)
          return (
            <g key={item.label}>
              <motion.rect
                x={140} y={y} width={0} height={barH} rx={4} fill={COLORS.rose}
                initial={{ width: 0 }}
                animate={{ width: pct * 300 }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
              />
              <text x={135} y={y + 18} textAnchor="end" className="fill-slate-600" fontSize="11">{item.label}</text>
              <text x={145 + pct * 300} y={y + 18} className="fill-slate-800" fontSize="11" fontWeight="bold">
                {fmtAmount(item.amount)}
              </text>
            </g>
          )
        })}
      </svg>
    </motion.div>
  )
}

// ─── Competitor Benchmark Chart ─────────────────────────────

export function CompetitorBenchmarkChart({ items, lang = "ja" }: { items: BenchmarkItem[]; lang?: string }) {
  const barH = 22
  const gap = 10
  const labelW = 110
  const chartW = 280
  const h = items.length * (barH + gap) + 10
  const labels = { industryAvg: lang === "ja" ? "業界平均" : "Industry avg", your: lang === "ja" ? "御社" : "You" }

  return (
    <div className="space-y-1">
      {items.map((item, i) => {
        const yourPct = item.yourScore / 100
        const avgPct = item.industryAvg / 100
        return (
          <motion.div
            key={item.label}
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <span className="text-xs text-slate-600 w-28 shrink-0 text-right">{item.label}</span>
            <div className="relative h-5 flex-1 bg-slate-100 rounded">
              <motion.div
                className="absolute inset-y-0 left-0 rounded bg-slate-300"
                initial={{ width: 0 }}
                animate={{ width: `${avgPct * 100}%` }}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }}
              />
              <motion.div
                className="absolute inset-y-0 left-0 rounded"
                style={{ backgroundColor: item.yourScore >= item.industryAvg ? COLORS.emerald : COLORS.rose }}
                initial={{ width: 0 }}
                animate={{ width: `${yourPct * 100}%` }}
                transition={{ duration: 0.8, delay: 0.4 + i * 0.1 }}
              />
            </div>
            <span className="text-xs font-bold w-10 shrink-0" style={{ color: item.yourScore >= item.industryAvg ? COLORS.emerald : COLORS.rose }}>
              {item.yourScore}
            </span>
          </motion.div>
        )
      })}
      <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400">
        <span className="w-28" />
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-300" /> {labels.industryAvg}</span>
        <span className="flex items-center gap-1 ml-2"><span className="w-3 h-3 rounded bg-rose-500" /> {labels.your}</span>
      </div>
    </div>
  )
}

// ─── Source Coverage Radar (replaced with compact bar chart) ──

export function SourceCoverageRadar({ items }: { items: SourceCoverageItem[] }) {
  const sorted = [...items].sort((a, b) => b.value - a.value).slice(0, 8)

  return (
    <motion.div className="space-y-1.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
      {sorted.map((item, i) => (
        <motion.div
          key={item.label}
          className="flex items-center gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
        >
          <span className="text-xs text-slate-500 w-20 shrink-0 truncate">{item.label}</span>
          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: COLORS.violet }}
              initial={{ width: 0 }}
              animate={{ width: `${item.value}%` }}
              transition={{ duration: 0.6, delay: 0.1 + i * 0.05 }}
            />
          </div>
          <span className="text-xs font-mono text-slate-700 w-8 text-right">{item.value}%</span>
        </motion.div>
      ))}
    </motion.div>
  )
}

// ─── Timeline Area Chart (replaced with compact line display) ──

export function TimelineChart({ points, lang = "ja" }: { points: TimelinePoint[]; lang?: string }) {
  if (points.length < 2) return null
  const h = 140
  const w = 400
  const pad = { top: 20, right: 20, bottom: 25, left: 50 }
  const chartW = w - pad.left - pad.right
  const chartH = h - pad.top - pad.bottom
  const maxVal = Math.max(...points.map((p) => Math.max(p.loss, p.competitorGap)), 10)
  const legends = { loss: lang === "ja" ? "損失" : "Loss", gap: lang === "ja" ? "競合差" : "Gap" }

  const toX = (i: number) => pad.left + (i / (points.length - 1)) * chartW
  const toY = (v: number) => pad.top + chartH - (v / maxVal) * chartH

  const lossPath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.loss)}`).join(" ")
  const gapPath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.competitorGap)}`).join(" ")

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
          <g key={frac}>
            <line x1={pad.left} x2={w - pad.right} y1={pad.top + frac * chartH} y2={pad.top + frac * chartH}
              stroke={COLORS.slate[200]} strokeWidth={0.5} />
            <text x={pad.left - 6} y={pad.top + frac * chartH + 4} textAnchor="end" fontSize="9" className="fill-slate-400">
              {Math.round(maxVal * (1 - frac))}
            </text>
          </g>
        ))}
        {/* X axis labels */}
        {points.map((p, i) => (
          <text key={i} x={toX(i)} y={h - 4} textAnchor="middle" fontSize="9" className="fill-slate-500">
            {p.month}
          </text>
        ))}
        {/* Loss line */}
        <motion.path d={lossPath} fill="none" stroke={COLORS.rose} strokeWidth={2}
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, delay: 0.3 }} />
        {/* Gap line */}
        <motion.path d={gapPath} fill="none" stroke={COLORS.sky} strokeWidth={2} strokeDasharray="4 2"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, delay: 0.5 }} />
        {/* Legend */}
        <text x={pad.left + 5} y={pad.top - 6} fontSize="9" fill={COLORS.rose}>{legends.loss}</text>
        <text x={pad.left + 35} y={pad.top - 6} fontSize="9" fill={COLORS.sky}>{legends.gap}</text>
      </svg>
    </motion.div>
  )
}
