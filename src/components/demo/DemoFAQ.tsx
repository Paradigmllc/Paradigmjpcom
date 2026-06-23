"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { DemoFAQItem } from "@/lib/sales/demo-site-types"

interface Props {
  faq: DemoFAQItem[]
  isJa: boolean
  accent: string
}

export function DemoFAQ({ faq, isJa, accent }: Props) {
  const [openId, setOpenId] = useState<string | null>(null)

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id))
  }

  if (!faq || faq.length === 0) return null

  return (
    <section className="bg-gray-50/80 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: accent }}
          >
            FAQ
          </span>
          <h2 className="mt-2 font-display text-2xl font-bold text-gray-900 sm:text-3xl">
            {isJa ? "よくある質問" : "Frequently Asked Questions"}
          </h2>
          <p className="mt-3 text-gray-500">
            {isJa
              ? "診断データに基づいてよくある疑問にお答えします"
              : "Answers to common questions based on your diagnostic data"}
          </p>
        </motion.div>

        <div className="space-y-3">
          {faq.map((item, i) => {
            const isOpen = openId === item.id

            return (
              <motion.div
                key={item.id}
                className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.08, ease: "easeOut" }}
              >
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="pr-4 font-display text-base font-semibold text-gray-900">
                    {item.question}
                  </span>
                  <motion.div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: isOpen ? `${accent}15` : `${accent}08` }}
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={accent}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-5">
                        <div className="border-t border-gray-100 pt-4">
                          <p className="text-sm leading-relaxed text-gray-600">
                            {item.answer}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
