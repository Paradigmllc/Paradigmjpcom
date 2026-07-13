"use client"

import { motion } from "framer-motion"
import type { DemoContentPage as DemoContentPageData } from "@/lib/sales/demo-site-types"

export function DemoContentPage({ page }: { page: DemoContentPageData }) {
  return (
    <div style={{ "--content-accent": page.accentColor } as React.CSSProperties}>
      <header className="relative overflow-hidden border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white px-4 py-20 sm:px-6 sm:py-28">
        <div className="absolute inset-x-0 top-0 h-1 bg-[var(--content-accent)]" />
        <motion.div className="mx-auto max-w-4xl" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-sm font-semibold tracking-[0.18em] text-[var(--content-accent)]">{page.eyebrow}</p>
          <h1 className="mt-5 font-display text-4xl font-bold tracking-tight text-gray-950 sm:text-6xl">{page.title}</h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-gray-600 sm:text-lg">{page.subtitle}</p>
        </motion.div>
      </header>
      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-16 sm:px-6 sm:py-24 md:grid-cols-2">
        {page.sections.map((section, index) => (
          <motion.article
            key={section.id}
            className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm sm:p-9"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ delay: Math.min(index * 0.06, 0.24) }}
          >
            <h2 className="font-display text-xl font-semibold text-gray-950 sm:text-2xl">{section.heading}</h2>
            <p className="mt-4 whitespace-pre-line leading-7 text-gray-600">{section.body}</p>
            {section.note && <p className="mt-5 text-xs font-medium text-[var(--content-accent)]">{section.note}</p>}
          </motion.article>
        ))}
      </main>
    </div>
  )
}
