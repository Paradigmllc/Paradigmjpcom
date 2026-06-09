"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import type { ReportCopy } from "./report-copy"
import { REPORT_FAQS } from "./report-copy"
import { SlideInSection } from "./ReportAnimations"

interface Props {
  variant: string
  lang: string
  copy: ReportCopy
}

export function ReportFaqSection({ variant, lang, copy }: Props) {
  const faqLang = (lang === "ja" ? "ja" : "en") as "ja" | "en"
  const faqs = REPORT_FAQS[faqLang]?.[variant] || REPORT_FAQS[faqLang]?.website_diagnostic || []
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  if (faqs.length === 0) return null

  const leftFaqs = faqs.filter((_, i) => i % 2 === 0)
  const rightFaqs = faqs.filter((_, i) => i % 2 === 1)

  return (
    <SlideInSection direction="up" className="bg-white px-5 py-14 border-t border-zinc-200">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-10">
          <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700 mb-3">
            {lang === "ja" ? "よくある質問と回答" : "Frequently Asked Questions"}
          </span>
          <h2 className="text-3xl font-bold text-zinc-950">{copy.faqTitle}</h2>
          <p className="mt-3 text-sm text-zinc-500 max-w-xl mx-auto">
            {lang === "ja"
              ? "営業担当に聞かれることの多い質問と、その回答をまとめました。"
              : "Common questions prospects ask, with clear answers."}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            {leftFaqs.map((faq, i) => {
              const idx = i * 2
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className={`rounded-xl border transition-all duration-300 ${
                    openIndex === idx
                      ? "border-violet-300 bg-violet-50/30 shadow-md"
                      : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"
                  }`}
                >
                  <button
                    onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                    className="flex w-full items-start gap-3 px-5 py-4 text-left"
                  >
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold mt-0.5 transition-colors ${
                      openIndex === idx ? "bg-violet-600 text-white" : "bg-zinc-100 text-zinc-500"
                    }`}>Q</span>
                    <span className={`text-sm font-semibold flex-1 ${openIndex === idx ? "text-violet-900" : "text-zinc-800"}`}>{faq.q}</span>
                    <span className={`text-lg transition-transform duration-300 ${openIndex === idx ? "rotate-45 text-violet-500" : "text-zinc-400"}`}>+</span>
                  </button>
                  {openIndex === idx && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-5 pb-4"
                    >
                      <div className="flex gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold mt-0.5">A</span>
                        <p className="text-sm leading-7 text-zinc-600">{faq.a}</p>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )
            })}
          </div>

          <div className="space-y-3">
            {rightFaqs.map((faq, i) => {
              const idx = i * 2 + 1
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 + 0.05 }}
                  className={`rounded-xl border transition-all duration-300 ${
                    openIndex === idx
                      ? "border-violet-300 bg-violet-50/30 shadow-md"
                      : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"
                  }`}
                >
                  <button
                    onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                    className="flex w-full items-start gap-3 px-5 py-4 text-left"
                  >
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold mt-0.5 transition-colors ${
                      openIndex === idx ? "bg-violet-600 text-white" : "bg-zinc-100 text-zinc-500"
                    }`}>Q</span>
                    <span className={`text-sm font-semibold flex-1 ${openIndex === idx ? "text-violet-900" : "text-zinc-800"}`}>{faq.q}</span>
                    <span className={`text-lg transition-transform duration-300 ${openIndex === idx ? "rotate-45 text-violet-500" : "text-zinc-400"}`}>+</span>
                  </button>
                  {openIndex === idx && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-5 pb-4"
                    >
                      <div className="flex gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold mt-0.5">A</span>
                        <p className="text-sm leading-7 text-zinc-600">{faq.a}</p>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </SlideInSection>
  )
}
