"use client"

import { useDeferredValue, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Building2, Map, Search, SlidersHorizontal } from "lucide-react"
import { InvestorBriefCard } from "@/components/opportunities/InvestorBriefCard"
import type { InvestorBriefSummary } from "@/lib/investor-briefs/repository"

interface Props {
  briefs: InvestorBriefSummary[]
}

const ALL = "All" as const

function isGreaterTokyo(region: string): boolean {
  return ["Tokyo", "Greater Tokyo", "Yokohama", "Kawasaki", "Saitama", "Chiba"].some((name) => region.includes(name))
}

export function InvestorBriefExplorer({ briefs }: Props) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<string>(ALL)
  const [geography, setGeography] = useState<string>(ALL)
  const deferredQuery = useDeferredValue(query.trim().toLowerCase())

  const categories = useMemo(() => [ALL, ...new Set(briefs.map((brief) => brief.preview.category))], [briefs])
  const metroCount = briefs.filter((brief) => isGreaterTokyo(brief.preview.region)).length
  const metrics = [
    { value: briefs.length, label: "published decision briefs", Icon: Building2 },
    { value: metroCount, label: "Greater Tokyo briefs", Icon: Map },
    { value: briefs.reduce((sum, brief) => sum + brief.preview.sourceCount, 0), label: "primary-source references", Icon: SlidersHorizontal },
  ]
  const filtered = useMemo(() => briefs.filter((brief) => {
    const haystack = `${brief.title} ${brief.summary} ${brief.preview.region} ${brief.preview.assetClass}`.toLowerCase()
    const matchesQuery = deferredQuery.length === 0 || haystack.includes(deferredQuery)
    const matchesCategory = category === ALL || brief.preview.category === category
    const matchesGeography = geography === ALL
      || (geography === "Greater Tokyo" ? isGreaterTokyo(brief.preview.region) : !isGreaterTokyo(brief.preview.region))
    return matchesQuery && matchesCategory && matchesGeography
  }), [briefs, category, deferredQuery, geography])

  return (
    <div className="mt-10">
      <div className="grid gap-4 sm:grid-cols-3">
        {metrics.map(({ value, label, Icon }) => (
          <motion.div key={label} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-2xl border border-paradigm-line bg-paradigm-paper-card p-5 shadow-sm">
            <Icon size={18} className="text-paradigm-accent" aria-hidden="true" />
            <p className="mt-3 font-display text-3xl font-semibold text-paradigm-ink">{value}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-paradigm-ink-soft">{label}</p>
          </motion.div>
        ))}
      </div>

      <div className="sticky top-16 z-20 mt-8 rounded-2xl border border-paradigm-line bg-paradigm-paper/95 p-4 shadow-lg backdrop-blur-xl">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-paradigm-ink-soft" size={17} aria-hidden="true" />
            <span className="sr-only">Search investor briefs</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search market, asset class or decision…" className="min-h-12 w-full rounded-xl border border-paradigm-line bg-paradigm-paper-card pl-10 pr-4 text-sm text-paradigm-ink outline-none transition focus:border-paradigm-accent focus:ring-2 focus:ring-paradigm-accent/15" />
          </label>
          <select value={geography} onChange={(event) => setGeography(event.target.value)} aria-label="Filter by geography" className="min-h-12 rounded-xl border border-paradigm-line bg-paradigm-paper-card px-4 text-sm font-semibold text-paradigm-ink outline-none focus:border-paradigm-accent">
            <option>{ALL}</option>
            <option>Greater Tokyo</option>
            <option>Rest of Japan</option>
          </select>
          <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category" className="min-h-12 max-w-full rounded-xl border border-paradigm-line bg-paradigm-paper-card px-4 text-sm font-semibold text-paradigm-ink outline-none focus:border-paradigm-accent lg:max-w-64">
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <p aria-live="polite" className="mt-3 text-xs text-paradigm-ink-soft">Showing {filtered.length} of {briefs.length} evidence-gated briefs.</p>
      </div>

      {filtered.length > 0 ? (
        <motion.div layout className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((brief) => (
              <motion.div key={brief.slug} layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.2 }}>
                <InvestorBriefCard brief={brief} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="mt-8 rounded-3xl border border-dashed border-paradigm-line bg-paradigm-paper-card p-10 text-center">
          <h3 className="font-display text-2xl font-semibold text-paradigm-ink">No brief matches this screen</h3>
          <p className="mt-3 text-sm text-paradigm-ink-soft">Clear a filter or search another market, asset class or decision stage.</p>
          <button type="button" onClick={() => { setQuery(""); setCategory(ALL); setGeography(ALL) }} className="mt-5 min-h-11 rounded-xl bg-paradigm-ink px-5 text-xs font-semibold uppercase tracking-[0.1em] text-paradigm-paper">Reset filters</button>
        </div>
      )}
    </div>
  )
}
