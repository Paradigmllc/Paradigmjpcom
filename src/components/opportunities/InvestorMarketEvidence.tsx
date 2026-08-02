"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Calculator, ChartNoAxesCombined, CircleAlert } from "lucide-react"
import type { InvestorBriefPayload } from "@/lib/investor-briefs/repository"

type MarketEvidence = NonNullable<InvestorBriefPayload["marketEvidence"]>

interface Props {
  evidence: MarketEvidence
}

type Metric = "price" | "change"

function formatYen(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
    notation: value >= 1_000_000 ? "compact" : "standard",
  }).format(value)
}

function numericInput(value: string, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

export function InvestorMarketEvidence({ evidence }: Props) {
  const [metric, setMetric] = useState<Metric>("price")
  const [purchasePrice, setPurchasePrice] = useState("600")
  const [annualGrossRent, setAnnualGrossRent] = useState("30")
  const [occupancy, setOccupancy] = useState("94")
  const [opexRatio, setOpexRatio] = useState("28")
  const [debtRatio, setDebtRatio] = useState("55")
  const [interestRate, setInterestRate] = useState("2.5")

  const chartData = evidence.points.map((point) => ({
    market: point.market,
    price: point.averagePriceYenPerSqm,
    change: point.annualChangePct,
  }))

  const underwriting = useMemo(() => {
    const price = numericInput(purchasePrice, 0) * 1_000_000
    const grossRent = numericInput(annualGrossRent, 0) * 1_000_000
    const occupiedRent = grossRent * Math.min(numericInput(occupancy, 0), 100) / 100
    const noi = occupiedRent * (1 - Math.min(numericInput(opexRatio, 0), 100) / 100)
    const debt = price * Math.min(numericInput(debtRatio, 0), 100) / 100
    const interest = debt * numericInput(interestRate, 0) / 100
    const stressedRent = grossRent * Math.max(numericInput(occupancy, 0) - 10, 0) / 100
    const stressedNoi = stressedRent * (1 - Math.min(numericInput(opexRatio, 0) + 5, 100) / 100)
    const stressedInterest = debt * (numericInput(interestRate, 0) + 1.5) / 100
    return {
      noi,
      yieldPct: price > 0 ? noi / price * 100 : 0,
      dscr: interest > 0 ? noi / interest : 0,
      stressedYieldPct: price > 0 ? stressedNoi / price * 100 : 0,
      stressedDscr: stressedInterest > 0 ? stressedNoi / stressedInterest : 0,
    }
  }, [annualGrossRent, debtRatio, interestRate, occupancy, opexRatio, purchasePrice])

  const inputs = [
    ["Purchase price", purchasePrice, setPurchasePrice, "JPY mn"],
    ["Annual gross rent", annualGrossRent, setAnnualGrossRent, "JPY mn"],
    ["Occupancy", occupancy, setOccupancy, "%"],
    ["Operating-cost ratio", opexRatio, setOpexRatio, "%"],
    ["Debt / price", debtRatio, setDebtRatio, "%"],
    ["Interest rate", interestRate, setInterestRate, "%"],
  ] as const

  return (
    <section aria-labelledby="market-evidence" className="border-y border-paradigm-line py-16 md:py-20">
      <div className="flex items-center gap-3 text-paradigm-accent">
        <ChartNoAxesCombined size={22} aria-hidden="true" />
        <p className="paradigm-eyebrow">INTERACTIVE MARKET EVIDENCE</p>
      </div>
      <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <h2 id="market-evidence" className="font-display text-3xl font-semibold tracking-[-0.03em] text-paradigm-ink md:text-4xl">Compare the covered submarkets</h2>
          <p className="mt-3 text-sm leading-7 text-paradigm-ink-soft">{evidence.scope} Benchmarks are evidence anchors, not asset valuations.</p>
        </div>
        <div className="inline-flex rounded-xl border border-paradigm-line bg-paradigm-paper-card p-1" aria-label="Chart metric">
          {(["price", "change"] as const).map((value) => (
            <button key={value} type="button" onClick={() => setMetric(value)} aria-pressed={metric === value} className={`min-h-10 rounded-lg px-4 text-xs font-semibold uppercase tracking-[0.1em] transition ${metric === value ? "bg-paradigm-ink text-paradigm-paper" : "text-paradigm-ink-soft hover:text-paradigm-ink"}`}>
              {value === "price" ? "Price / m²" : "Annual change"}
            </button>
          ))}
        </div>
      </div>

      <motion.div layout className="mt-8 h-[340px] rounded-3xl border border-paradigm-line bg-paradigm-paper-card p-4 shadow-sm md:p-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 16, right: 12, left: 4, bottom: 62 }}>
            <CartesianGrid strokeDasharray="4 4" vertical={false} opacity={0.25} />
            <XAxis dataKey="market" interval={0} angle={-24} textAnchor="end" height={74} tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(value: number) => metric === "price" ? formatYen(value) : `${value}%`} width={74} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value) => metric === "price" ? formatYen(Number(value)) : `${Number(value).toFixed(1)}%`} />
            <Bar dataKey={metric} fill="#ef5a3c" radius={[8, 8, 0, 0]} animationDuration={650} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Market benchmark values">
        {evidence.points.map((point) => (
          <article key={point.market} className="rounded-2xl border border-paradigm-line bg-paradigm-paper-card p-4">
            <h3 className="font-display text-lg font-semibold text-paradigm-ink">{point.market}</h3>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div><dt className="text-paradigm-ink-soft">Residential land</dt><dd className="mt-1 font-semibold tabular-nums text-paradigm-ink">{formatYen(point.averagePriceYenPerSqm)}/m²</dd></div>
              <div><dt className="text-paradigm-ink-soft">Annual change</dt><dd className="mt-1 font-semibold tabular-nums text-paradigm-ink">{point.annualChangePct.toFixed(1)}%</dd></div>
            </dl>
          </article>
        ))}
      </div>

      <div className="mt-10 overflow-hidden rounded-3xl bg-paradigm-ink text-paradigm-paper shadow-xl">
        <div className="grid gap-5 border-b border-white/10 p-7 md:grid-cols-[1fr_auto] md:items-end md:p-10">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 text-paradigm-accent-soft"><Calculator size={20} aria-hidden="true" /><p className="paradigm-eyebrow">UNDERWRITING SANDBOX</p></div>
            <h3 className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em]">Stress the operating assumptions</h3>
            <p className="mt-3 text-sm leading-7 text-paradigm-paper/70">Inputs stay in this browser. The stress case reduces occupancy by 10 points, adds five points to the operating-cost ratio and adds 1.5 points to interest.</p>
          </div>
          <p className="rounded-full border border-white/15 px-4 py-2 text-xs text-paradigm-paper/65">As of {evidence.asOf}</p>
        </div>
        <div className="grid gap-8 p-7 lg:grid-cols-[1.2fr_0.8fr] md:p-10">
          <div className="grid gap-4 sm:grid-cols-2">
            {inputs.map(([label, value, setValue, unit]) => (
              <label key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs font-semibold uppercase tracking-[0.1em] text-paradigm-paper/65">
                {label}
                <span className="mt-2 flex items-center gap-2">
                  <input value={value} onChange={(event) => setValue(event.target.value)} inputMode="decimal" aria-label={label} className="min-h-11 w-full rounded-xl border border-white/15 bg-black/20 px-3 text-base font-semibold text-white outline-none focus:border-paradigm-accent" />
                  <span className="whitespace-nowrap normal-case tracking-normal">{unit}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Base NOI", formatYen(underwriting.noi)],
              ["Base yield", `${underwriting.yieldPct.toFixed(2)}%`],
              ["Interest-only DSCR", `${underwriting.dscr.toFixed(2)}x`],
              ["Stress yield", `${underwriting.stressedYieldPct.toFixed(2)}%`],
              ["Stress DSCR", `${underwriting.stressedDscr.toFixed(2)}x`],
            ].map(([label, value], index) => (
              <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className="rounded-2xl border border-white/10 bg-white/5 p-4 last:col-span-2">
                <p className="text-xs uppercase tracking-[0.1em] text-paradigm-paper/55">{label}</p>
                <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{value}</p>
              </motion.div>
            ))}
          </div>
        </div>
        <p className="flex items-start gap-2 border-t border-white/10 px-7 py-5 text-xs leading-6 text-paradigm-paper/60 md:px-10"><CircleAlert className="mt-1 shrink-0" size={14} aria-hidden="true" />This simplified, interest-only screen excludes acquisition costs, taxes, capital expenditure, amortization, refinancing, FX and exit value. It is not a forecast or valuation.</p>
      </div>
    </section>
  )
}
