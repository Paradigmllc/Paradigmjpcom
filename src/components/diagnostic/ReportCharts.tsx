"use client"

import { motion } from "framer-motion"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

// ─── Paradigm Brand Palette ─────────────────────────────────────

const COLORS = {
  darkBlue: "#1e3a5f",
  gold: "#f59e0b",
  violet: "#7c5cff",
  rose: "#ef4444",
  emerald: "#10b981",
  amber: "#f59e0b",
  zinc: { 300: "#d4d4d8", 400: "#a1a1aa", 500: "#71717a" },
}

// ─── Shared tooltip style ───────────────────────────────────────

function renderCustomTooltip(label: string, value: string) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-zinc-800">{label}</p>
      <p className="mt-1 text-zinc-600">{value}</p>
    </div>
  )
}

// ─── 1. PerformanceGauge ────────────────────────────────────────

export interface PerformanceGaugeProps {
  score: number
  benchmark: number
  label: string
  className?: string
  animate?: boolean
}

export function PerformanceGauge({
  score,
  benchmark,
  label,
  className,
  animate = true,
}: PerformanceGaugeProps) {
  const pct = Math.min(100, Math.max(0, score))
  const benchmarkPct = Math.min(100, Math.max(0, benchmark))
  const gap = benchmarkPct - pct

  const data = [
    { name: "Your score", value: pct, fill: COLORS.violet },
    { name: "Industry benchmark", value: benchmarkPct, fill: COLORS.zinc[400] },
    { name: "Gap", value: Math.max(0, 100 - benchmarkPct), fill: "transparent" },
  ]

  const tone = pct >= 85 ? COLORS.emerald : pct >= 55 ? COLORS.amber : COLORS.rose

  return (
    <motion.div
      className={className}
      initial={animate ? { opacity: 0, scale: 0.92 } : {}}
      whileInView={animate ? { opacity: 1, scale: 1 } : {}}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-zinc-500">{label}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums text-zinc-950">
                {pct}
              </span>
              <span className="text-sm text-zinc-400">/100</span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Benchmark: {benchmarkPct} ({gap > 0 ? `-${Math.round(gap)}` : `+${Math.round(Math.abs(gap))}`})
            </p>
          </div>
          <div className="flex h-20 w-20 items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="70%"
                outerRadius="100%"
                barSize={8}
                data={[data[0]]}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar
                  dataKey="value"
                  cornerRadius={8}
                  fill={tone}
                  background={{ fill: "#f4f4f5" }}
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── 2. LossImpactBar ───────────────────────────────────────────

export interface LossImpactItem {
  name: string
  value: number
  fill?: string
}

export interface LossImpactBarProps {
  data: LossImpactItem[]
  title: string
  subtitle?: string
  valueFormatter?: (value: number) => string
  className?: string
  animate?: boolean
}

export function LossImpactBar({
  data,
  title,
  subtitle,
  valueFormatter = (v) => `¥${v.toLocaleString("en-US")}`,
  className,
  animate = true,
}: LossImpactBarProps) {
  const defaultColors = [COLORS.rose, COLORS.amber, COLORS.violet, COLORS.darkBlue, COLORS.zinc[400]]

  const enriched = data.map((item, i) => ({
    ...item,
    fill: item.fill ?? defaultColors[i % defaultColors.length],
  }))

  return (
    <motion.div
      className={className}
      initial={animate ? { opacity: 0, y: 24 } : {}}
      whileInView={animate ? { opacity: 1, y: 0 } : {}}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-950">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>}
        <div className="mt-4" style={{ height: Math.max(180, data.length * 44) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={enriched}
              layout="vertical"
              margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: COLORS.zinc[500] }}
                axisLine={false}
                tickLine={false}
                tickFormatter={valueFormatter}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fontSize: 11, fill: COLORS.zinc[500] }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(val) => [valueFormatter(Number(val)), ""]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e4e4e7",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                {enriched.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  )
}

// ─── 3. SourceCoverageRadar ─────────────────────────────────────

export interface SourceCoverageItem {
  category: string
  score: number
  fullMark?: number
}

export interface SourceCoverageRadarProps {
  data: SourceCoverageItem[]
  title: string
  subtitle?: string
  className?: string
  animate?: boolean
}

export function SourceCoverageRadar({
  data,
  title,
  subtitle,
  className,
  animate = true,
}: SourceCoverageRadarProps) {
  const fullMark = 100

  return (
    <motion.div
      className={className}
      initial={animate ? { opacity: 0, scale: 0.95 } : {}}
      whileInView={animate ? { opacity: 1, scale: 1 } : {}}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-950">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>}
        <div className="mt-4" style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
              <PolarGrid stroke="#e4e4e7" />
              <PolarAngleAxis
                dataKey="category"
                tick={{ fontSize: 10, fill: COLORS.zinc[500] }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, fullMark]}
                tick={{ fontSize: 9, fill: COLORS.zinc[400] }}
                axisLine={false}
              />
              <Radar
                name="Coverage"
                dataKey="score"
                stroke={COLORS.violet}
                fill={COLORS.violet}
                fillOpacity={0.25}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  )
}

// ─── 4. CompetitorBenchmarkChart ────────────────────────────────

export interface BenchmarkItem {
  name: string
  yourScore: number
  industryAvg: number
  topCompetitor: number
}

export interface CompetitorBenchmarkChartProps {
  data: BenchmarkItem[]
  title: string
  subtitle?: string
  className?: string
  animate?: boolean
  showPercent?: boolean
}

export function CompetitorBenchmarkChart({
  data,
  title,
  subtitle,
  className,
  animate = true,
  showPercent = true,
}: CompetitorBenchmarkChartProps) {
  const chartData = data.map((item) => ({
    name: item.name,
    yourSite: item.yourScore,
    industryAvg: item.industryAvg,
    topCompetitor: item.topCompetitor,
  }))

  return (
    <motion.div
      className={className}
      initial={animate ? { opacity: 0, y: 24 } : {}}
      whileInView={animate ? { opacity: 1, y: 0 } : {}}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-950">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>}
        <div className="mt-4" style={{ height: Math.max(200, data.length * 60) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: COLORS.zinc[500] }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (showPercent ? `${v}%` : `${v}`)}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                tick={{ fontSize: 11, fill: COLORS.zinc[500] }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e4e4e7",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="yourSite" name="Your Site" fill={COLORS.rose} radius={[0, 4, 4, 0]} barSize={10} />
              <Bar dataKey="industryAvg" name="Industry Avg" fill={COLORS.zinc[400]} radius={[0, 4, 4, 0]} barSize={10} />
              <Bar dataKey="topCompetitor" name="Top Competitor" fill={COLORS.emerald} radius={[0, 4, 4, 0]} barSize={10} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: COLORS.rose }} />
            Your Site
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: COLORS.zinc[400] }} />
            Industry Avg
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: COLORS.emerald }} />
            Top Competitor
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// ─── 5. TimelineChart ───────────────────────────────────────────

export interface TimelinePoint {
  month: string
  currentPath: number
  improvedPath: number
  benchmark: number
}

export interface TimelineChartProps {
  data: TimelinePoint[]
  title: string
  subtitle?: string
  valueFormatter?: (value: number) => string
  className?: string
  animate?: boolean
}

export function TimelineChart({
  data,
  title,
  subtitle,
  valueFormatter = (v) => `¥${v.toLocaleString("en-US")}`,
  className,
  animate = true,
}: TimelineChartProps) {
  return (
    <motion.div
      className={className}
      initial={animate ? { opacity: 0, y: 24 } : {}}
      whileInView={animate ? { opacity: 1, y: 0 } : {}}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-950">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>}
        <div className="mt-4" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
              <defs>
                <linearGradient id="currentPathGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.rose} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={COLORS.rose} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="improvedPathGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.emerald} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={COLORS.emerald} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="benchmarkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.zinc[400]} stopOpacity={0.1} />
                  <stop offset="95%" stopColor={COLORS.zinc[400]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: COLORS.zinc[500] }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: COLORS.zinc[500] }}
                axisLine={false}
                tickLine={false}
                tickFormatter={valueFormatter}
              />
              <Tooltip
                formatter={(val) => [valueFormatter(Number(val)), ""]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e4e4e7",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="currentPath"
                name="Status Quo"
                stroke={COLORS.rose}
                strokeWidth={2}
                fill="url(#currentPathGrad)"
                dot={{ r: 3, fill: COLORS.rose }}
              />
              <Area
                type="monotone"
                dataKey="improvedPath"
                name="With Paradigm"
                stroke={COLORS.emerald}
                strokeWidth={2}
                fill="url(#improvedPathGrad)"
                dot={{ r: 3, fill: COLORS.emerald }}
              />
              <Area
                type="monotone"
                dataKey="benchmark"
                name="Industry Avg"
                stroke={COLORS.zinc[400]}
                strokeWidth={1.5}
                strokeDasharray="5 5"
                fill="url(#benchmarkGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: COLORS.rose }} />
            Status Quo
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: COLORS.emerald }} />
            With Paradigm
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm" style={{ border: `1px dashed ${COLORS.zinc[400]}` }} />
            Industry Avg
          </span>
        </div>
      </div>
    </motion.div>
  )
}
