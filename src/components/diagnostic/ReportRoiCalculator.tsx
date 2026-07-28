"use client"

import { motion } from "framer-motion"
import { LineChart, Receipt } from "lucide-react"
import type { ReportCopy, ReportLang } from "./report-copy"
import { SOLUTION_COSTS } from "./report-constants"
import { formatMoney } from "./report-utils"

export default function ReportRoiCalculator({
  variant,
  monthlyLoss,
  copy,
  lang,
}: {
  variant: string
  monthlyLoss: number
  copy: ReportCopy
  lang: ReportLang
}) {
  const isJapanEntry = variant === "japan_entry"
  if (isJapanEntry) {
    return (
      <motion.div
        className="rounded-xl border border-violet-200 bg-white p-6 shadow-sm"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Receipt size={18} className="text-violet-700" aria-hidden />
          <h3 className="text-lg font-bold text-zinc-950">Fixed Japan Entry terms</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["Setup", "$15,000 fixed"],
            ["Managed operation", "$2,000/month × 6 months = $12,000 value included for selected launch partners"],
            ["Month 7 onward", "$2,000/month under the signed terms"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-zinc-100 bg-zinc-50 p-4">
              <div className="text-xs font-medium text-zinc-500">{label}</div>
              <div className="mt-1 text-lg font-extrabold text-zinc-950">{value}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] leading-5 text-zinc-500">
          The 14-business-day delivery guarantee starts from the recorded Start Date after agreement, cleared payment, required access, complete assets, and an empowered approver. Sales outcomes are not guaranteed; exact scope and exclusions are confirmed before payment.
        </p>
      </motion.div>
    )
  }
  if (monthlyLoss <= 0) return null
  // ROI is only meaningful when the report loss and package cost share a currency.
  // Japan Entry reports use USD; domestic offer reports use JPY.
  if (lang !== "ja") return null
  const lossValue = monthlyLoss
  const cost = SOLUTION_COSTS[variant] ?? 450000
  const recoveredTwelveMonths = lossValue * 12
  const paybackPeriod = Math.max(0.5, Number((cost / lossValue).toFixed(1)))
  const roi = Math.round((recoveredTwelveMonths / cost) * 100)

  return (
    <motion.div
      className="rounded-xl border border-violet-200 bg-white p-6 shadow-sm"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <LineChart size={18} className="text-violet-700" />
        <h3 className="text-lg font-bold text-zinc-950">{copy.roiTitle}</h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-zinc-100 bg-zinc-50 p-4">
          <div className="text-xs font-medium text-zinc-500">{copy.paybackPeriod}</div>
          <div className="mt-1 text-2xl font-extrabold tabular-nums text-zinc-950">
            {paybackPeriod}{" "}
            <span className="text-xs font-normal text-zinc-500">
              {lang === "ja" ? "ヶ月" : "mo"}
            </span>
          </div>
        </div>
        <div className="rounded-md border border-zinc-100 bg-zinc-50 p-4">
          <div className="text-xs font-medium text-zinc-500">{copy.recoveredTwelveMonths}</div>
          <div className="mt-1 text-2xl font-extrabold tabular-nums text-emerald-600">
            {formatMoney(recoveredTwelveMonths, lang)}
          </div>
        </div>
        <div className="rounded-md border border-zinc-100 bg-zinc-50 p-4">
          <div className="text-xs font-medium text-zinc-500">{copy.roiLabel}</div>
          <div className="mt-1 text-2xl font-extrabold tabular-nums text-violet-600">{roi}%</div>
        </div>
      </div>
      <p className="mt-4 text-[11px] leading-5 text-zinc-500">
        {lang === "ja"
          ? `※ 本シミュレーションは、想定パッケージ価格（${formatMoney(cost, lang)}）に対する売上機会回復効果を算出しています。`
          : `* Simulation calculated against estimated package price (${formatMoney(cost, lang)}) and opportunity recovery potential.`}
      </p>
    </motion.div>
  )
}
