/**
 * RoiCalculator.tsx — 代理店向け WL LP の ROI 計算機 (Sprint 9-C)
 *
 * 役割: 利用者が入力した件数と単価から、未受注案件の売上機会を
 *       単純試算するフォーム。受注・粗利・成果の予測には使用しない。
 *
 * 設計:
 *   - Client component (slider + リアルタイム計算)
 *   - 計算ロジックは pure function で隔離 (test 可能)
 */

"use client"

import { useState } from "react"
import { Link } from "@/i18n/routing"

interface CalcInputs {
  declinedPerMonth: number // 月あたり断っている件数 (1-10)
  avgValuePerProject: number // 1 件単価 (USD)
}

function calculateAnnualOpportunity(inputs: CalcInputs): {
  monthlyOpportunity: number
  annualOpportunity: number
} {
  const monthlyOpportunity = inputs.declinedPerMonth * inputs.avgValuePerProject
  return { monthlyOpportunity, annualOpportunity: monthlyOpportunity * 12 }
}

const DECLINED_OPTIONS = [
  { value: 1, label: "1 件" },
  { value: 2, label: "2 件" },
  { value: 4, label: "4 件" },
  { value: 6, label: "6 件以上" },
] as const

const VALUE_OPTIONS = [
  { value: 2000, label: "$1K-$3K" },
  { value: 5000, label: "$3K-$8K" },
  { value: 10000, label: "$8K+" },
] as const

export default function RoiCalculator() {
  const [declinedPerMonth, setDeclined] = useState<number>(2)
  const [avgValue, setAvgValue] = useState<number>(5000)

  const result = calculateAnnualOpportunity({
    declinedPerMonth,
    avgValuePerProject: avgValue,
  })

  const fmtUsd = (n: number) =>
    `$${Math.abs(n).toLocaleString("en-US")}${n < 0 ? " (赤字)" : ""}`

  return (
    <div className="paradigm-glass rounded-3xl p-8 md:p-10 paradigm-glow-lg max-w-3xl mx-auto">
      <p className="paradigm-eyebrow text-paradigm-accent mb-2 text-center">
        Scenario Calculator
      </p>
      <h3 className="font-display text-[22px] md:text-[28px] text-paradigm-ink text-center mb-2 tracking-tight">
        未受注案件の売上機会を試算
      </h3>
      <p className="text-[13px] text-paradigm-ink-soft text-center mb-8 leading-relaxed">
        入力した件数と単価を掛けた参考値です。受注や利益を保証するものではありません。
      </p>

      {/* Q1: 断り件数 */}
      <div className="mb-7">
        <label className="block text-[12px] paradigm-eyebrow text-paradigm-ink-soft mb-3">
          Q1. 月に未受注・外注となる動画案件数は?
        </label>
        <div className="grid grid-cols-4 gap-2">
          {DECLINED_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDeclined(opt.value)}
              className={`py-3 rounded-xl text-[13px] font-semibold transition-all ${
                declinedPerMonth === opt.value
                  ? "bg-paradigm-ink text-paradigm-paper paradigm-glow-md"
                  : "border border-paradigm-line text-paradigm-ink-soft hover:border-paradigm-ink"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Q2: 単価 */}
      <div className="mb-9">
        <label className="block text-[12px] paradigm-eyebrow text-paradigm-ink-soft mb-3">
          Q2. 1 件あたりの平均受注金額は?
        </label>
        <div className="grid grid-cols-3 gap-2">
          {VALUE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setAvgValue(opt.value)}
              className={`py-3 rounded-xl text-[13px] font-semibold transition-all ${
                avgValue === opt.value
                  ? "bg-paradigm-ink text-paradigm-paper paradigm-glow-md"
                  : "border border-paradigm-line text-paradigm-ink-soft hover:border-paradigm-ink"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 結果表示 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-7">
        <div className="paradigm-glass rounded-xl p-5 text-center bg-paradigm-paper-card">
          <div className="paradigm-eyebrow text-paradigm-ink-mute mb-2 text-[10px]">
            月間売上機会の単純試算
          </div>
          <div className="font-display text-[24px] text-paradigm-ink leading-none">
            {fmtUsd(result.monthlyOpportunity)}
          </div>
        </div>
        <div className="paradigm-glass rounded-xl p-5 text-center bg-paradigm-paper-card">
          <div className="paradigm-eyebrow text-paradigm-ink-mute mb-2 text-[10px]">
            年間売上機会の単純試算
          </div>
          <div className="font-display text-[24px] text-paradigm-ink leading-none">
            {fmtUsd(result.annualOpportunity)}
          </div>
        </div>
      </div>

      <p className="rounded-2xl border border-paradigm-line bg-paradigm-paper-card p-5 text-center text-[12px] leading-relaxed text-paradigm-ink-soft">
        制作原価、実際の受注率、修正、税金、解約、Paradigm利用料を含まない単純試算です。
        利益見込みは個別の契約条件と実績値から判断してください。
      </p>

      <div className="mt-7 text-center">
        <Link
          href="/contact?intent=agency"
          className="inline-flex items-center gap-2 bg-paradigm-ink text-paradigm-paper rounded-xl px-9 py-4 text-[12px] tracking-wider uppercase font-semibold paradigm-glow-md hover:paradigm-glow-lg transition-all"
        >
          提供範囲と原価条件を相談する
        </Link>
      </div>
    </div>
  )
}
