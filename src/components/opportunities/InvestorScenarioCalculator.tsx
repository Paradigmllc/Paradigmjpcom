"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Calculator, CircleAlert, RotateCcw } from "lucide-react"
import type { InvestorScenarioDefaults } from "@/lib/investor-scenarios/repository"

interface Props {
  defaults: InvestorScenarioDefaults
}

function numberValue(value: string, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function formatYenMillions(value: number): string {
  return `JPY ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value)}m`
}

export function InvestorScenarioCalculator({ defaults }: Props) {
  const initial = useMemo(() => ({
    price: String(defaults.purchasePriceYenMn),
    grossYield: String(defaults.grossYieldPct),
    occupancy: String(defaults.occupancyPct),
    opex: String(defaults.operatingCostPct),
    debt: String(defaults.debtPct),
    interest: String(defaults.interestRatePct),
    holdYears: String(defaults.holdYears),
    exitShift: String(defaults.exitYieldShiftBps),
  }), [defaults])
  const [inputs, setInputs] = useState(initial)

  const model = useMemo(() => {
    const price = numberValue(inputs.price, 0)
    const grossYield = numberValue(inputs.grossYield, 0) / 100
    const occupancy = Math.min(numberValue(inputs.occupancy, 0), 100) / 100
    const opex = Math.min(numberValue(inputs.opex, 0), 100) / 100
    const debtRatio = Math.min(numberValue(inputs.debt, 0), 100) / 100
    const interestRate = numberValue(inputs.interest, 0) / 100
    const exitShift = numberValue(inputs.exitShift, 0) / 10_000
    const grossRent = price * grossYield
    const noi = grossRent * occupancy * (1 - opex)
    const debt = price * debtRatio
    const interest = debt * interestRate
    const equity = price - debt
    const cashFlow = noi - interest
    const stressOccupancy = Math.max(occupancy - 0.1, 0)
    const stressOpex = Math.min(opex + 0.05, 1)
    const stressNoi = grossRent * stressOccupancy * (1 - stressOpex)
    const stressInterest = debt * (interestRate + 0.015)
    const stressCashFlow = stressNoi - stressInterest
    const entryNoiYield = price > 0 ? noi / price : 0
    const exitYield = Math.max(entryNoiYield + exitShift, 0.005)
    const stressExitValue = stressNoi / exitYield
    return {
      noi,
      interest,
      cashFlow,
      stressNoi,
      stressInterest,
      stressCashFlow,
      dscr: interest > 0 ? noi / interest : 0,
      stressDscr: stressInterest > 0 ? stressNoi / stressInterest : 0,
      cashYield: equity > 0 ? cashFlow / equity * 100 : 0,
      stressExitEquity: stressExitValue - debt,
      equity,
    }
  }, [inputs])

  const chartData = [
    { case: "Base", NOI: model.noi, Interest: model.interest, "Cash flow": model.cashFlow },
    { case: "Linked stress", NOI: model.stressNoi, Interest: model.stressInterest, "Cash flow": model.stressCashFlow },
  ]

  const fields = [
    ["Purchase price", "price", "JPY mn"],
    ["Gross yield", "grossYield", "%"],
    ["Occupancy", "occupancy", "%"],
    ["Operating cost", "opex", "% of occupied rent"],
    ["Debt / price", "debt", "%"],
    ["Interest rate", "interest", "%"],
    ["Hold period", "holdYears", "years"],
    ["Exit yield shift", "exitShift", "bps"],
  ] as const

  return (
    <section aria-labelledby="scenario-calculator" className="my-16 overflow-hidden rounded-3xl bg-paradigm-ink text-paradigm-paper shadow-xl md:my-20">
      <div className="grid gap-6 border-b border-white/10 p-7 md:grid-cols-[1fr_auto] md:items-end md:p-10">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 text-paradigm-accent-soft"><Calculator size={20} aria-hidden="true" /><p className="paradigm-eyebrow">SCENARIO UNDERWRITING</p></div>
          <h2 id="scenario-calculator" className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] md:text-4xl">Link income, debt and exit stress</h2>
          <p className="mt-3 text-sm leading-7 text-paradigm-paper/70">Edit every assumption. The linked stress reduces occupancy by 10 points, adds five points to operating cost, adds 1.5 points to interest and applies the selected adverse exit-yield movement.</p>
        </div>
        <button type="button" onClick={() => setInputs(initial)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] hover:bg-white/10" aria-label="Reset scenario underwriting assumptions">
          <RotateCcw size={15} aria-hidden="true" />Reset
        </button>
      </div>

      <div className="grid gap-8 p-7 lg:grid-cols-[0.9fr_1.1fr] md:p-10">
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map(([label, key, unit]) => (
            <label key={key} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs font-semibold uppercase tracking-[0.1em] text-paradigm-paper/65">
              {label}
              <span className="mt-2 flex items-center gap-2">
                <input
                  value={inputs[key]}
                  onChange={(event) => setInputs((current) => ({ ...current, [key]: event.target.value }))}
                  inputMode="decimal"
                  aria-label={label}
                  className="min-h-11 w-full rounded-xl border border-white/15 bg-black/20 px-3 text-base font-semibold text-white outline-none focus:border-paradigm-accent"
                />
                <span className="whitespace-nowrap normal-case tracking-normal">{unit}</span>
              </span>
            </label>
          ))}
        </div>

        <div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              ["Base NOI", formatYenMillions(model.noi)],
              ["Base DSCR", `${model.dscr.toFixed(2)}x`],
              ["Cash yield", `${model.cashYield.toFixed(2)}%`],
              ["Stress NOI", formatYenMillions(model.stressNoi)],
              ["Stress DSCR", `${model.stressDscr.toFixed(2)}x`],
              ["Stress exit equity", formatYenMillions(model.stressExitEquity)],
            ].map(([label, value], index) => (
              <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.1em] text-paradigm-paper/55">{label}</p>
                <p className="mt-2 font-display text-xl font-semibold tabular-nums">{value}</p>
              </motion.div>
            ))}
          </div>
          <div className="mt-4 h-64 rounded-2xl border border-white/10 bg-white/5 p-4" aria-label="Base and stress cash flow chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} opacity={0.2} />
                <XAxis dataKey="case" tick={{ fill: "#f5f2ec", fontSize: 11 }} />
                <YAxis tick={{ fill: "#f5f2ec", fontSize: 11 }} tickFormatter={(value: number) => `${value.toFixed(0)}m`} />
                <Tooltip formatter={(value) => formatYenMillions(Number(value))} />
                <Bar dataKey="NOI" fill="#f16b4f" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Interest" fill="#d6b86c" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Cash flow" fill="#70b7a8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <p className="flex items-start gap-2 border-t border-white/10 px-7 py-5 text-xs leading-6 text-paradigm-paper/60 md:px-10"><CircleAlert className="mt-1 shrink-0" size={14} aria-hidden="true" />This simplified screen omits acquisition taxes and fees, amortization, detailed capex timing, tax, FX hedging and asset-specific exit costs. It is not a valuation or return forecast.</p>
    </section>
  )
}
