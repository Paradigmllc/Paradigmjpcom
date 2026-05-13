/**
 * RoiCalculator.tsx — 代理店向け WL LP の ROI 計算機 (Sprint 9-C)
 *
 * 役割: Notion 営業MVP壁打ち② の「損失訴求 Aha モーメント設計」を実装。
 *       「断り件数 × 1 件単価 × 12ヶ月 = 年間損失」を可視化する 3-step フォーム.
 *
 * 設計:
 *   - Client component (slider + リアルタイム計算)
 *   - 計算ロジックは pure function で隔離 (test 可能)
 */

"use client"

import { useState } from "react"

interface CalcInputs {
  declinedPerMonth: number // 月あたり断っている件数 (1-10)
  avgValuePerProject: number // 1 件単価 (USD)
}

function calculateAnnualLoss(inputs: CalcInputs): {
  monthlyLoss: number
  annualLoss: number
  paradigmAnnual: number
  netGain: number
} {
  const monthlyLoss = inputs.declinedPerMonth * inputs.avgValuePerProject
  const annualLoss = monthlyLoss * 12
  const paradigmAnnual = 9997 * 12 // White plan $9,997/月
  const netGain = annualLoss - paradigmAnnual
  return { monthlyLoss, annualLoss, paradigmAnnual, netGain }
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

  const result = calculateAnnualLoss({
    declinedPerMonth,
    avgValuePerProject: avgValue,
  })

  const fmtUsd = (n: number) =>
    `$${Math.abs(n).toLocaleString("en-US")}${n < 0 ? " (赤字)" : ""}`

  return (
    <div className="paradigm-glass rounded-3xl p-8 md:p-10 paradigm-glow-lg max-w-3xl mx-auto">
      <p className="paradigm-eyebrow text-paradigm-accent mb-2 text-center">
        Loss Calculator
      </p>
      <h3 className="font-display text-[22px] md:text-[28px] text-paradigm-ink text-center mb-2 tracking-tight">
        御社は今月、いくら損していますか?
      </h3>
      <p className="text-[13px] text-paradigm-ink-soft text-center mb-8 leading-relaxed">
        動画案件を断る / 外注に出すたびに、利益が他社へ流れています。
      </p>

      {/* Q1: 断り件数 */}
      <div className="mb-7">
        <label className="block text-[12px] paradigm-eyebrow text-paradigm-ink-soft mb-3">
          Q1. 月に動画案件を断る or 外注する件数は?
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-7">
        <div className="paradigm-glass rounded-xl p-5 text-center bg-paradigm-paper-card">
          <div className="paradigm-eyebrow text-paradigm-ink-mute mb-2 text-[10px]">
            月間損失
          </div>
          <div className="font-display text-[24px] text-paradigm-ink leading-none">
            {fmtUsd(result.monthlyLoss)}
          </div>
        </div>
        <div
          className="rounded-xl p-5 text-center text-paradigm-paper"
          style={{
            background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
          }}
        >
          <div className="paradigm-eyebrow text-paradigm-paper/70 mb-2 text-[10px]">
            年間損失
          </div>
          <div className="font-display text-[28px] leading-none font-black">
            {fmtUsd(result.annualLoss)}
          </div>
        </div>
        <div className="paradigm-glass rounded-xl p-5 text-center bg-paradigm-paper-card">
          <div className="paradigm-eyebrow text-paradigm-ink-mute mb-2 text-[10px]">
            Paradigm 年間費
          </div>
          <div className="font-display text-[24px] text-paradigm-ink-soft leading-none">
            {fmtUsd(result.paradigmAnnual)}
          </div>
        </div>
      </div>

      <div
        className="rounded-2xl p-6 text-center text-paradigm-paper"
        style={{
          background: "linear-gradient(135deg, #16a34a 0%, #14532d 100%)",
        }}
      >
        <div className="paradigm-eyebrow text-paradigm-paper/70 mb-2 text-[10px]">
          回収可能粗利 (年間)
        </div>
        <div className="font-display text-[40px] md:text-[48px] leading-none font-black mb-2">
          {fmtUsd(result.netGain)}
        </div>
        <p className="text-[12px] text-paradigm-paper/80 leading-relaxed">
          今、御社を素通りしている動画案件を WL で回収できる粗利です。
        </p>
      </div>

      <div className="mt-7 text-center">
        <a
          href="mailto:info@paradigmjp.com?subject=代理店WLパッケージの相談"
          className="inline-flex items-center gap-2 bg-paradigm-ink text-paradigm-paper rounded-xl px-9 py-4 text-[12px] tracking-wider uppercase font-semibold paradigm-glow-md hover:paradigm-glow-lg transition-all"
        >
          この損失を止める方法を 15 分で説明します
        </a>
      </div>
    </div>
  )
}
