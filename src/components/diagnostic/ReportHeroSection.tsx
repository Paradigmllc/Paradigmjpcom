"use client"

import { motion } from "framer-motion"
import { ArrowRight, Check, ExternalLink, Sparkles } from "lucide-react"
import type { ReactNode } from "react"
import type { VisualEvidenceAnnotation } from "@/lib/sales/diagnostic"
import { Pill } from "./report-utils"

export default function ReportHeroSection({
  offerCopy,
  reportTitleEl,
  heroText,
  demoUrl,
  calHref,
  lang,
  industryLabel,
  targetCountry,
  prefecture,
  screenshotUrl,
  annotations = [],
}: {
  offerCopy: {
    badge: string
    reportLabel: string
    primaryCta: string
    screenshotAlt: string
  }
  reportTitleEl: ReactNode
  heroText: string
  demoUrl: string | null
  calHref: string
  lang: "ja" | "en" | string
  industryLabel: string
  targetCountry: string
  prefecture: string | null
  screenshotUrl?: string | null
  annotations?: VisualEvidenceAnnotation[]
}) {
  return (
    <section className="relative overflow-hidden px-5 py-16 sm:py-24">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(24,24,27,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(24,24,27,0.07)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-80 bg-gradient-to-b from-transparent to-[#fbfaf7]" />
      <div className="mx-auto max-w-6xl text-center">
        <motion.div
          className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Sparkles size={15} aria-hidden />
          {offerCopy.badge}
        </motion.div>
        <motion.h1
          className="mx-auto mt-8 max-w-5xl text-5xl font-semibold leading-[1.04] text-zinc-950 sm:text-7xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {reportTitleEl}
        </motion.h1>
        <motion.p
          className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-zinc-600"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {heroText}
        </motion.p>
        <motion.div
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          {demoUrl && (
            <a
              href={demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105"
            >
              {offerCopy.primaryCta}
              <ArrowRight size={16} aria-hidden />
            </a>
          )}
          <a
            href={calHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center gap-2 rounded-full border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-950 shadow-sm transition-transform hover:scale-105"
          >
            {lang === "ja" ? "15分無料相談を予約" : "Book Free 15min Call"}
            <ExternalLink size={15} aria-hidden />
          </a>
        </motion.div>
        <motion.div
          className="mt-10 flex flex-wrap justify-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Pill tone="good">
            <Check size={14} aria-hidden /> {industryLabel}
          </Pill>
          <Pill>{targetCountry}</Pill>
          {prefecture && <Pill>{prefecture}</Pill>}
          <Pill>{offerCopy.reportLabel}</Pill>
        </motion.div>
        {screenshotUrl && (
          <motion.div
            className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-lg border border-zinc-200 bg-white text-left shadow-xl shadow-zinc-200/60"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <div className="flex h-10 items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-4">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="ml-auto text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                {lang === "ja" ? "取得済みサイト証拠" : "Captured Site Evidence"}
              </span>
            </div>
            <div className="relative max-h-[520px] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={screenshotUrl}
                alt={offerCopy.screenshotAlt}
                loading="eager"
                className="w-full object-cover object-top"
                onError={(e) => {
                  const target = e.currentTarget
                  target.style.display = "none"
                  const fallback = target.parentElement
                  if (fallback && !fallback.querySelector(".screenshot-fallback")) {
                    const div = document.createElement("div")
                    div.className = "screenshot-fallback flex items-center justify-center h-64 bg-zinc-100 text-zinc-400 text-sm"
                    div.textContent = lang === "ja" ? "スクリーンショット取得中..." : "Screenshot loading..."
                    fallback.appendChild(div)
                  }
                }}
              />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(244,63,94,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(244,63,94,0.1)_1px,transparent_1px)] bg-[size:56px_56px]" />
              {annotations.slice(0, 2).map((annotation, index) => (
                <div
                  key={annotation.id}
                  className="absolute"
                  style={{ left: `${annotation.x}%`, top: `${annotation.y}%`, transform: "translate(-50%, -50%)" }}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-rose-600 text-xs font-bold text-white shadow-lg shadow-rose-950/30">
                    {index + 1}
                  </span>
                  <span className="mt-2 hidden max-w-52 rounded-lg border border-rose-200 bg-white/95 px-3 py-2 text-xs font-semibold leading-5 text-rose-700 shadow-lg backdrop-blur sm:block">
                    {annotation.label}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  )
}
