"use client"

import { motion } from "framer-motion"
import { ArrowRight, ExternalLink } from "lucide-react"
import type { ReportCopy, ReportLang } from "./report-copy"

export default function ReportFinalCta({
  offerCopy,
  copy,
  lang,
  calHref,
  demoUrl,
  videoHref,
}: {
  offerCopy: { finalHeading: string; finalBody: string; primaryCta: string }
  copy: ReportCopy
  lang: ReportLang
  calHref: string
  demoUrl: string | null
  videoHref: string | null
}) {
  return (
    <section className="px-5 pb-16">
      <motion.div
        className="mx-auto max-w-6xl overflow-hidden rounded-lg bg-zinc-950 text-white"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="p-8 sm:p-10">
            <h2 className="max-w-3xl text-4xl font-semibold leading-tight">
              {offerCopy.finalHeading}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-white/70">
              {offerCopy.finalBody}
            </p>
          </div>
          <div className="flex flex-col justify-center gap-3 border-t border-white/10 p-8 lg:border-l lg:border-t-0">
            {demoUrl && (
              <a
                href={demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-zinc-950 transition-transform hover:scale-105"
              >
                {offerCopy.primaryCta}
                <ArrowRight size={16} aria-hidden />
              </a>
            )}
            {videoHref && (
              <a
                href={videoHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 px-5 text-sm font-semibold text-white transition-transform hover:scale-105"
              >
                {copy.secondaryCta}
              </a>
            )}
            <a
              href={calHref}
              {...(calHref.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              data-umami-event="diagnostic-report-apply"
              data-umami-event-source="final-cta"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 px-5 text-sm font-semibold text-white transition-transform hover:scale-105"
            >
              {lang === "ja" ? "15分相談を予約" : "Apply — $15K fixed"}
            </a>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
