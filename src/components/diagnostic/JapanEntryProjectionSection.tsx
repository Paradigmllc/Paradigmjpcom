"use client"

import { useMemo } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { DiagnosticReportData } from "@/lib/sales/diagnostic"
import type { JapanEntryProjection, ProjectionScenarioResult } from "@/lib/sales/japan-entry-projection"

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null
}

function readProjection(data: DiagnosticReportData): JapanEntryProjection | null {
  const candidate = asRecord(data.meta?.japan_entry_projection)
  if (!candidate || candidate.modelVersion !== "public-opportunity-v1") return null
  if (!Array.isArray(candidate.markets) || !Array.isArray(candidate.scenarios)) return null
  return candidate as unknown as JapanEntryProjection
}

function usd(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)
}

function compact(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value)
}

function scenarioLabel(value: string, isJa: boolean): string {
  if (!isJa) return value[0].toUpperCase() + value.slice(1)
  return value === "conservative" ? "保守" : value === "upside" ? "上振れ" : "基準"
}

function horizonRows(projection: JapanEntryProjection): Array<Record<string, number>> {
  return [6, 12, 24].map((month) => {
    const row: Record<string, number> = { month }
    for (const scenario of projection.scenarios) {
      const point = scenario.horizons.find((item) => item.horizon === month)
      row[scenario.scenario] = point?.cumulativeNetBenefitUsd ?? 0
    }
    return row
  })
}

function baseScenario(projection: JapanEntryProjection): ProjectionScenarioResult | null {
  return projection.scenarios.find((scenario) => scenario.scenario === "base") ?? null
}

export function JapanEntryProjectionSection({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  const projection = useMemo(() => readProjection(data), [data])
  const isJa = lang === "ja"
  if (!projection) return null
  const base = baseScenario(projection)
  if (!base) return null
  const chartRows = horizonRows(projection)

  return (
    <section className="bg-white px-5 py-16" aria-labelledby="japan-entry-projection-title">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-700">
            {isJa ? "Japan Entry Opportunity Model" : "Japan Entry Opportunity Model"}
          </p>
          <h2 id="japan-entry-projection-title" className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
            {isJa ? "市場別アクセスと6・12・24か月ROI試算" : "Market access and 6, 12 and 24-month ROI model"}
          </h2>
          <p className="mt-4 text-sm leading-7 text-zinc-600">
            {isJa
              ? "公開Webシグナルを起点にした計画用モデルです。実測アクセス、確定売上、成果保証ではありません。"
              : "A planning model derived from public web signals. It is not first-party analytics, confirmed revenue or a performance guarantee."}
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label={isJa ? "推定月間アクセス" : "Estimated monthly visits"} value={compact(projection.estimatedMonthlyVisits)} />
          <Metric label={isJa ? "推定レンジ" : "Estimated range"} value={`${compact(projection.monthlyVisitRange.low)}–${compact(projection.monthlyVisitRange.high)}`} />
          <Metric label={isJa ? "月間機会ギャップ" : "Monthly opportunity gap"} value={usd(projection.monthlyOpportunityGapUsd)} />
          <Metric label={isJa ? "基準回収月" : "Base payback"} value={projection.paybackMonth ? `${projection.paybackMonth} ${isJa ? "か月" : "months"}` : (isJa ? "24か月超" : ">24 months")} />
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <ChartCard title={isJa ? "市場別 推定月間アクセス" : "Estimated monthly visits by market"}>
            <div className="h-80" role="img" aria-label={isJa ? "市場別推定月間アクセス棒グラフ" : "Bar chart of estimated monthly visits by market"}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projection.markets} layout="vertical" margin={{ left: 18, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={compact} />
                  <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => compact(Number(value))} />
                  <Bar dataKey="estimatedMonthlyVisits" name={isJa ? "推定アクセス" : "Estimated visits"} fill="#b91c1c" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title={isJa ? "累積純便益（費用控除後）" : "Cumulative net benefit after costs"}>
            <div className="h-80" role="img" aria-label={isJa ? "6・12・24か月累積純便益グラフ" : "6, 12 and 24-month cumulative net benefit chart"}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartRows} margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickFormatter={(value) => `${value}m`} />
                  <YAxis tickFormatter={(value) => compact(Number(value))} />
                  <Tooltip formatter={(value, name) => [usd(Number(value)), scenarioLabel(String(name), isJa)]} />
                  <Legend formatter={(value) => scenarioLabel(String(value), isJa)} />
                  <Area type="monotone" dataKey="conservative" stroke="#71717a" fill="#d4d4d8" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="base" stroke="#b91c1c" fill="#fecaca" fillOpacity={0.45} />
                  <Area type="monotone" dataKey="upside" stroke="#047857" fill="#a7f3d0" fillOpacity={0.25} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        <div className="mt-8 overflow-x-auto rounded-xl border border-zinc-200">
          <table className="w-full min-w-[680px] text-left text-sm">
            <caption className="sr-only">{isJa ? "期間別ROI試算" : "ROI model by period"}</caption>
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-4 py-3">{isJa ? "期間" : "Period"}</th>
                <th className="px-4 py-3">{isJa ? "日本アクセス" : "Japan visits"}</th>
                <th className="px-4 py-3">{isJa ? "累積粗利" : "Gross profit"}</th>
                <th className="px-4 py-3">{isJa ? "累積費用" : "Cost"}</th>
                <th className="px-4 py-3">{isJa ? "純便益" : "Net benefit"}</th>
                <th className="px-4 py-3">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-800">
              {base.horizons.map((row) => (
                <tr key={row.horizon}>
                  <td className="px-4 py-3 font-semibold">{row.horizon} {isJa ? "か月" : "months"}</td>
                  <td className="px-4 py-3">{row.japanVisits.toLocaleString("en-US")}</td>
                  <td className="px-4 py-3">{usd(row.cumulativeGrossProfitUsd)}</td>
                  <td className="px-4 py-3">{usd(row.cumulativeCostUsd)}</td>
                  <td className="px-4 py-3">{usd(row.cumulativeNetBenefitUsd)}</td>
                  <td className="px-4 py-3 font-semibold">{row.roiPercent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 grid gap-6 rounded-xl bg-zinc-950 p-6 text-white lg:grid-cols-2">
          <div>
            <h3 className="font-semibold">{isJa ? "固定条件" : "Commercial terms"}</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-300">
              <li>$15,000 {isJa ? "初期費用・一括前払い" : "setup fee, paid upfront"}</li>
              <li>{isJa ? "月額2,000ドル×3か月＝6,000ドル相当を選定先に追加月額なしで提供" : "$2,000/month × 3 months = $6,000 of managed-operation value included for selected launch partners"}</li>
              <li>{isJa ? "期間終了後の継続条件・月額は個別協議のうえ書面合意" : "Standard Managed Japan Desk is $2,000/month from month 4 onward under the signed terms"}</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold">{isJa ? "モデル前提" : "Model assumptions"}</h3>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              {projection.assumptions.businessModel} · AOV {usd(projection.assumptions.averageOrderValueUsd)} · CVR {(projection.assumptions.conversionRate * 100).toFixed(2)}% · {isJa ? "粗利率" : "gross margin"} {(projection.assumptions.grossMargin * 100).toFixed(0)}%
            </p>
          </div>
        </div>

        <details className="mt-6 rounded-xl border border-zinc-200 p-5 text-sm text-zinc-600">
          <summary className="cursor-pointer font-semibold text-zinc-900">{isJa ? "根拠・計算上の制約" : "Evidence and limitations"}</summary>
          <ul className="mt-4 space-y-2">
            {projection.evidence.map((item) => <li key={item.id}>{item.classification.toUpperCase()} — {item.label}: {item.value} ({item.source})</li>)}
            {projection.limitations.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </details>
      </div>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5"><p className="text-xs font-medium text-zinc-500">{label}</p><p className="mt-2 text-2xl font-semibold text-zinc-950">{value}</p></div>
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-xl border border-zinc-200 p-5"><h3 className="text-sm font-semibold text-zinc-900">{title}</h3><div className="mt-4">{children}</div></div>
}
