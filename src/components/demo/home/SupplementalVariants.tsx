"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import type { DemoTestimonial, DemoTrustedByItem } from "@/lib/sales/demo-site-types"
import type { DemoTemplate } from "@/lib/sales/demo-templates/registry"
import { headingSizeClass } from "@/lib/sales/demo-templates/registry"

/* ──────────── Testimonials ──────────── */

export function TestimonialsSection({
  testimonials,
  isJa,
  accent,
  template,
}: {
  testimonials: DemoTestimonial[]
  isJa: boolean
  accent: string
  template?: DemoTemplate["designTokens"]
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-50px" })
  const size = headingSizeClass(template?.typography.scale ?? "normal")

  return (
    <section id="testimonials" className="bg-gray-50/80 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <motion.div className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
          <h2 className={`font-display ${size.h2} ${template?.typography.headingWeight ?? "font-bold"} text-gray-900`}>
            {isJa ? "お客様の声" : "Testimonials"}
          </h2>
          <p className="mt-3 text-gray-500">{isJa ? "改善後の成果実績" : "Results after improvements"}</p>
        </motion.div>
        <motion.div ref={ref} className="grid gap-8 md:grid-cols-2"
          initial="hidden" animate={inView ? "visible" : "hidden"}>
          {testimonials.map((t, i) => (
            <motion.div key={t.id}
              className="relative rounded-2xl border border-gray-100 bg-white p-8 shadow-sm"
              variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.4, delay: i * 0.15, ease: "easeOut" }}>
              <div className="mb-4 text-5xl font-serif leading-none text-gray-200">"</div>
              <p className="mb-6 text-base leading-relaxed text-gray-600">"{t.quote}"</p>
              <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full font-bold text-white text-sm"
                  style={{ background: accent }}>
                  {t.avatarInitials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.author}</p>
                  <p className="text-xs text-gray-400">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ──────────── Trusted By ──────────── */

export function TrustedBySection({
  trustedBy,
  isJa,
  accent,
}: {
  trustedBy: DemoTrustedByItem[]
  isJa: boolean
  accent: string
}) {
  return (
    <section className="border-b border-gray-100 bg-white px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl text-center">
        <p className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
          {isJa ? "導入企業様" : "Trusted By"}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8">
          {trustedBy.map((item) => (
            <div key={item.id} className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold text-white"
                style={{ background: `${accent}80` }}>
                {item.initials.slice(0, 2)}
              </div>
              <span className="text-sm font-medium text-gray-500">{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
