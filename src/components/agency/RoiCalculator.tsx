/**
 * RoiCalculator.tsx — 代理店向け WL LP の ROI 計算機 (Sprint 9-C)
 *
 * 役割: Notion 営業MVP壁打ち② の「損失訴求 Aha モーメント設計」を実装。
 *       「断り件数 × 1 件単価 × 12ヶ月 = 年間損失」を可視化する 3-step フォーム.
 *
 * 設計:
 *   - Client component (slider + リアルタイム計算)
 *   - 計算ロジックは pure function で隔離 (test 可能)
 *
 * AE-PHP-5 (2026-05-14): agencyPage namespace 経由の完全 i18n 化.
 */

"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"

interface CalcInputs {
  declinedPerMonth: number
  avgValuePerProject: number
}

function calculateAnnualLoss(inputs: CalcInputs): {
  monthlyLoss: number
  annualLoss: number
  paradigmAnnual: number
  netGain: number
} {
  const monthlyLoss = inputs.declinedPerMonth * inputs.avgValuePerProject
  const annualLoss = monthlyLoss * 12
  const paradigmAnnual = 9997 * 12
  const netGain = annualLoss - paradigmAnnual
  return { monthlyLoss, annualLoss, paradigmAnnual, netGain }
}

const DECLINED_VALUES = [1, 2, 4, 6] as const
const VALUE_OPTIONS = [2000, 5000, 10000] as const

export default function RoiCalculator() {
  const t = useTranslations("agencyPage")
  const [declinedPerMonth, setDeclined] = useState<number>(2)
  const [avgValue, setAvgValue] = useState<number>(5000)

  const result = calculateAnnualLoss({
    declinedPerMonth,
    avgValuePerProject: avgValue,
  })

  const roiQ1Labels = t.raw("roiQ1Options") as string[]
  const roiQ2Labels = t.raw("roiQ2Options") as string[]

  const fmtUsd = (n: number) => {
    const abs = Math.abs(n).toLocaleString("en-US")
    return `$${abs}${n < 0 ? ` ${t("roiNetLossLabel")}` : ""}`
  }

  return (
    <div className="paradigm-glass rounded-3xl p-8 md:p-10 paradigm-glow-lg max-w-3xl mx-auto">
      <p className="paradigm-eyebrow text-paradigm-accent mb-2 text-center">
        {t("roiEyebrow")}
      </p>
      <h3 className="font-display text-[22px] md:text-[28px] text-paradigm-ink text-center mb-2 tracking-tight">
        {t("roiTitle")}
      </h3>
      <p className="text-[13px] text-paradigm-ink-soft text-center mb-8 leading-relaxed">
        {t("roiDesc")}
      </p>

      {/* Q1: 断り件数 */}
      <div className="mb-7">
        <label className="block text-[12px] paradigm-eyebrow text-paradigm-ink-soft mb-3">
          {t("roiQ1")}
        </label>
        <div className="grid grid-cols-4 gap-2">
          {DECLINED_VALUES.map((value, idx) => (
            <button
              key={value}
              type="button"
              onClick={() => setDeclined(value)}
              className={`py-3 rounded-xl text-[13px] font-semibold transition-all ${
                declinedPerMonth === value
                  ? "bg-paradigm-ink text-paradigm-paper paradigm-glow-md"
                  : "border border-paradigm-line text-paradigm-ink-soft hover:border-paradigm-ink"
              }`}
            >
              {roiQ1Labels[idx]}
            </button>
          ))}
        </div>
      </div>

      {/* Q2: 単価 */}
      <div className="mb-9">
        <label className="block text-[12px] paradigm-eyebrow text-paradigm-ink-soft mb-3">
          {t("roiQ2")}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {VALUE_OPTIONS.map((value, idx) => (
            <button
              key={value}
              type="button"
              onClick={() => setAvgValue(value)}
              className={`py-3 rounded-xl text-[13px] font-semibold transition-all ${
                avgValue === value
                  ? "bg-paradigm-ink text-paradigm-paper paradigm-glow-md"
                  : "border border-paradigm-line text-paradigm-ink-soft hover:border-paradigm-ink"
              }`}
            >
              {roiQ2Labels[idx]}
            </button>
          ))}
        </div>
      </div>

      {/* 結果表示 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-7">
        <div className="paradigm-glass rounded-xl p-5 text-center bg-paradigm-paper-card">
          <div className="paradigm-eyebrow text-paradigm-ink-mute mb-2 text-[10px]">
            {t("roiMonthly")}
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
            {t("roiAnnual")}
          </div>
          <div className="font-display text-[28px] leading-none font-black">
            {fmtUsd(result.annualLoss)}
          </div>
        </div>
        <div className="paradigm-glass rounded-xl p-5 text-center bg-paradigm-paper-card">
          <div className="paradigm-eyebrow text-paradigm-ink-mute mb-2 text-[10px]">
            {t("roiParadigm")}
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
          {t("roiNetGain")}
        </div>
        <div className="font-display text-[40px] md:text-[48px] leading-none font-black mb-2">
          {fmtUsd(result.netGain)}
        </div>
        <p className="text-[12px] text-paradigm-paper/80 leading-relaxed">
          {t("roiNetGainDesc")}
        </p>
      </div>

      <div className="mt-7 text-center">
        <a
          href="mailto:info@paradigmjp.com?subject=代理店WLパッケージの相談"
          className="inline-flex items-center gap-2 bg-paradigm-ink text-paradigm-paper rounded-xl px-9 py-4 text-[12px] tracking-wider uppercase font-semibold paradigm-glow-md hover:paradigm-glow-lg transition-all"
        >
          {t("roiCta")}
        </a>
      </div>
    </div>
  )
}
