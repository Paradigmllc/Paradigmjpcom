import { motion } from "framer-motion"
import type { ReactNode } from "react"
import type { ReportLang } from "./report-copy"
import { CORRUPTED_TEXT_PATTERN, TONE_CLASS } from "./report-constants"
import { intlLocale } from "./report-constants"

export function cleanText(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback
  return CORRUPTED_TEXT_PATTERN.test(value) ? fallback : value
}

export function numericValue(value: string): number {
  return Number.parseInt(value.replace(/[^0-9]/g, ""), 10) || 0
}

export function formatMoney(amount: number, lang: ReportLang): string {
  return new Intl.NumberFormat(intlLocale(lang), {
    style: "currency",
    currency: lang === "ja" ? "JPY" : "USD",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function reportCurrencySymbol(lang: ReportLang): "¥" | "$" {
  return lang === "ja" ? "¥" : "$"
}

export function formatMetric(value: string, lang: ReportLang): string {
  const numeric = numericValue(value)
  return numeric > 0 ? numeric.toLocaleString(intlLocale(lang)) : value
}

export function reportTitle(companyName: string, label: string, lang: ReportLang): ReactNode {
  if (lang === "ja") {
    return (
      <>
        {companyName}の<span className="text-[#7657ff]">{label}</span>
      </>
    )
  }
  return (
    <>
      <span className="text-[#7657ff]">{label}</span> for {companyName}
    </>
  )
}

export function sourceTone(score: number): keyof typeof TONE_CLASS {
  if (score >= 75) return "good"
  if (score >= 45) return "warning"
  return "critical"
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof TONE_CLASS }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${TONE_CLASS[tone]}`}>
      {children}
    </span>
  )
}

export function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <motion.div
      className="border-t border-zinc-200 py-5 first:border-t-0 md:border-l md:border-t-0 md:px-6 md:first:border-l-0"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <div className="text-xs font-semibold text-zinc-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tabular-nums text-zinc-950">{value}</div>
      <p className="mt-2 text-xs leading-5 text-zinc-500">{detail}</p>
    </motion.div>
  )
}
