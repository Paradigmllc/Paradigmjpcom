"use client"

import { useRef } from "react"
import { motion } from "framer-motion"
import { Sparkles } from "@/components/magicui/sparkles"
import { Meteors } from "@/components/magicui/meteors"
import { BorderBeam } from "@/components/magicui/border-beam"
import { AnimatedBeam } from "@/components/magicui/animated-beam"
import { NumberTicker } from "@/components/magicui/number-ticker"

const EASE = [0.22, 1, 0.36, 1] as const

interface AnyBlock {
  blockType: string
  id?: string
  [key: string]: unknown
}

function isNumeric(v: string | undefined): boolean {
  return !!v && /^-?[\d,.]+%?$/.test(v)
}

export function CardGridRender(b: AnyBlock) {
  const variant = (b.variant as string) ?? "equal"
  const cols = (b.columns as string) ?? "3"
  const cards = (b.cards as Array<{ icon?: string; title?: string; description?: string; href?: string; highlighted?: boolean }>) ?? []
  const isBento = variant === "bento"
  const colsClass = cols === "2" ? "md:grid-cols-2" : cols === "4" ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-2 lg:grid-cols-3"
  return (
    <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
      <div className="paradigm-mesh opacity-30" />
      <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
        {!!b.title && (
          <h2 className="font-display text-[28px] md:text-[40px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink text-center mb-4">
            {String(b.title)}
          </h2>
        )}
        <div className={`grid grid-cols-1 ${colsClass} gap-4 md:gap-5`}>
          {cards.map((c, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: EASE }}
              className={`relative paradigm-glass rounded-2xl p-6 md:p-8 paradigm-glow-sm hover:paradigm-glow-md hover:-translate-y-1.5 transition-all duration-500 overflow-hidden group ${isBento && i === 0 ? "md:col-span-2 md:row-span-2" : ""} ${c.highlighted ? "ring-1 ring-paradigm-accent/30" : ""}`}>
              {c.highlighted && <BorderBeam size={120} duration={6} colorFrom="rgb(236 72 153)" colorTo="rgb(245 158 11)" />}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-paradigm-accent/3 via-transparent to-paradigm-glow/3 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                {c.highlighted && <p className="paradigm-eyebrow text-paradigm-accent mb-3">Featured</p>}
                {c.icon && <div className="text-[28px] mb-5 opacity-70">{c.icon}</div>}
                <h3 className="font-display text-[20px] md:text-[24px] leading-[1.2] text-paradigm-ink mb-3 tracking-[-0.02em]">{c.title ?? ""}</h3>
                {c.description && <p className="text-[13px] md:text-[14px] text-paradigm-ink-soft leading-[1.8]">{c.description}</p>}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function StatsRender(b: AnyBlock) {
  const stats = (b.stats as Array<{ value?: string; label?: string; sublabel?: string }>) ?? []
  const bgKey = (b.background as string) ?? "default"
  const isDark = bgKey === "dark"
  const isSurface = bgKey === "surface"
  return (
    <section className={`relative paradigm-section overflow-hidden ${isDark ? "bg-paradigm-ink" : isSurface ? "bg-paradigm-paper-deep" : "bg-paradigm-paper"}`}>
      {isDark && (
        <>
          <div className="absolute inset-0 paradigm-mesh-vivid opacity-60" />
          <Meteors number={8} color="rgba(167, 139, 250, 0.3)" />
          <Sparkles count={12} color="rgba(244, 114, 182, 0.35)" duration={4} />
        </>
      )}
      {isSurface && <div className="absolute inset-0 paradigm-mesh opacity-35" />}
      <div className="max-w-6xl mx-auto px-6 md:px-12 text-center relative z-10">
        {!!b.kicker && <p className={`paradigm-eyebrow mb-4 ${isDark ? "text-paradigm-glow" : "text-paradigm-accent"}`}>{String(b.kicker)}</p>}
        {!!b.title && (
          <h2 className={`font-display text-[28px] md:text-[44px] leading-[1.15] tracking-[-0.01em] mb-4 ${isDark ? "text-paradigm-paper" : "text-paradigm-ink"}`}>
            {String(b.title)}
          </h2>
        )}
        {!!b.subtitle && (
          <p className={`text-[15px] max-w-2xl mx-auto mb-12 leading-[1.85] ${isDark ? "text-paradigm-paper/65" : "text-paradigm-ink-soft"}`}>
            {String(b.subtitle)}
          </p>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
          {stats.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: EASE }}
              whileHover={{ y: -4, scale: 1.03 }}
              className={`text-center rounded-xl p-4 transition-all ${isDark ? "paradigm-glass" : ""}`}>
              <div className={`font-display text-[40px] md:text-[56px] leading-[1] mb-2 ${isDark ? "bg-gradient-to-br from-paradigm-glow via-paradigm-tech to-paradigm-accent bg-clip-text text-transparent" : "text-paradigm-ink"}`}>
                {isNumeric(s.value) ? <NumberTicker value={parseFloat(s.value!.replace(/[,%]/g, ""))} /> : (s.value ?? "")}
              </div>
              <div className={`paradigm-eyebrow mb-1 ${isDark ? "text-paradigm-glow" : "text-paradigm-accent"}`}>{s.label ?? ""}</div>
              {s.sublabel && <div className={`text-[12px] ${isDark ? "text-paradigm-paper/55" : "text-paradigm-ink-mute"}`}>{s.sublabel}</div>}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function TestimonialsRender(b: AnyBlock) {
  const items = (b.items as Array<{ name?: string; location?: string; text?: string; rating?: number }>) ?? []
  return (
    <section className="bg-paradigm-paper-deep paradigm-section relative overflow-hidden">
      <div className="paradigm-mesh opacity-35" />
      <div className="section-dots absolute inset-0 opacity-40" />
      <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
        {!!b.kicker && <p className="paradigm-eyebrow text-paradigm-accent mb-3 text-center">{String(b.kicker)}</p>}
        {!!b.title && <h2 className="font-display text-[28px] md:text-[44px] leading-[1.15] tracking-[-0.01em] bg-gradient-to-br from-paradigm-ink via-paradigm-accent to-paradigm-glow bg-clip-text text-transparent text-center mb-12">{String(b.title)}</h2>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((it, i) => (
            <motion.figure key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: EASE }}
              whileHover={{ y: -4 }}
              className="paradigm-glass rounded-2xl p-6 md:p-7 paradigm-glow-sm hover:paradigm-glow-md transition-all">
              {typeof it.rating === "number" && <div className="text-amber-500 mb-3 text-[14px]" aria-label={`${it.rating} / 5`}>{"★".repeat(Math.max(1, Math.min(5, Math.round(it.rating))))}</div>}
              <blockquote className="text-[14px] md:text-[15px] text-paradigm-ink leading-[1.85] mb-5">"{it.text ?? ""}"</blockquote>
              <figcaption className="paradigm-eyebrow text-paradigm-ink-soft">
                {it.name ?? ""}
                {it.location && <span className="text-paradigm-ink-mute ml-2">· {it.location}</span>}
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  )
}

export function ProcessRender(b: AnyBlock) {
  const steps = (b.steps as Array<{ title?: string; description?: string; icon?: string }>) ?? []
  const containerRef = useRef<HTMLDivElement>(null)
  const refs = steps.map(() => useRef<HTMLDivElement>(null))

  const ICON_MAP: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
    Headphones: require("lucide-react").Headphones,
    PenTool: require("lucide-react").PenTool,
    Code2: require("lucide-react").Code2,
    TrendingUp: require("lucide-react").TrendingUp,
    MessageCircle: require("lucide-react").MessageCircle,
    Pen: require("lucide-react").Pen,
    Code: require("lucide-react").Code,
    CheckCircle: require("lucide-react").CheckCircle,
    RefreshCw: require("lucide-react").RefreshCw,
    Globe: require("lucide-react").Globe,
    Bot: require("lucide-react").Bot,
    Search: require("lucide-react").Search,
    Video: require("lucide-react").Video,
    MapPin: require("lucide-react").MapPin,
    Shield: require("lucide-react").Shield,
    CreditCard: require("lucide-react").CreditCard,
  }

  const GRADIENTS = ["from-fuchsia-400 to-paradigm-accent", "from-paradigm-accent to-paradigm-tech", "from-paradigm-tech to-paradigm-glow", "from-paradigm-glow to-fuchsia-400", "from-paradigm-accent to-paradigm-glow", "from-violet-400 to-fuchsia-400"]

  return (
    <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
      <div className="paradigm-mesh opacity-40" />
      <div className="section-dots absolute inset-0 opacity-40" />
      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
        {!!b.kicker && <p className="paradigm-eyebrow text-paradigm-accent mb-3 text-center">{String(b.kicker)}</p>}
        {!!b.title && <h2 className="font-display text-[28px] md:text-[44px] leading-[1.15] tracking-[-0.01em] bg-gradient-to-br from-paradigm-ink via-paradigm-accent to-paradigm-glow bg-clip-text text-transparent text-center mb-4">{String(b.title)}</h2>}
        {!!b.subtitle && <p className="text-[15px] text-paradigm-ink-soft max-w-2xl mx-auto text-center mb-12 leading-[1.85]">{String(b.subtitle)}</p>}
        <div ref={containerRef} className="relative grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
          {steps.map((s, idx) => {
            const Icon = (s.icon && ICON_MAP[s.icon]) ? ICON_MAP[s.icon] : ICON_MAP.Code2
            const grad = GRADIENTS[idx % GRADIENTS.length]
            return (
              <motion.div key={idx} ref={refs[idx]} initial={{ opacity: 0, y: 28, scale: 0.95 }} whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6, delay: idx * 0.12, ease: EASE }}
                className="relative paradigm-glass rounded-2xl p-6 md:p-7 paradigm-glow-sm hover:paradigm-glow-md hover:-translate-y-1.5 transition-all duration-500">
                <span className="absolute top-4 right-5 font-display text-[28px] md:text-[40px] leading-none text-paradigm-ink/8">0{idx + 1}</span>
                <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br ${grad} text-white mb-4 paradigm-glow-sm`}>
                  <Icon size={20} strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-[19px] md:text-[22px] leading-[1.2] text-paradigm-ink mb-2 tracking-[-0.02em]">{s.title ?? ""}</h3>
                <p className="text-[13px] md:text-[14px] text-paradigm-ink-soft leading-[1.7]">{s.description ?? ""}</p>
              </motion.div>
            )
          })}
          {steps.length >= 3 && (
            <div className="hidden md:block absolute inset-0 pointer-events-none">
              {steps.slice(0, -1).map((_, idx) => (
                <AnimatedBeam key={idx} containerRef={containerRef} fromRef={refs[idx]} toRef={refs[idx + 1]}
                  duration={4} delay={idx * 0.5} curvature={-22}
                  gradientStartColor="#ec4899" gradientStopColor="#8b5cf6" />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export function PricingRender(b: AnyBlock) {
  const tiers = (b.tiers as Array<{ name?: string; price?: string; period?: string; description?: string; features?: string; ctaLabel?: string; ctaHref?: string; highlighted?: boolean }>) ?? []
  return (
    <section className="bg-paradigm-paper-deep paradigm-section relative overflow-hidden">
      <div className="paradigm-mesh opacity-30" />
      <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
        {!!b.title && <h2 className="font-display text-[28px] md:text-[44px] leading-[1.15] tracking-[-0.01em] bg-gradient-to-br from-paradigm-ink via-paradigm-accent to-paradigm-glow bg-clip-text text-transparent text-center mb-4">{String(b.title)}</h2>}
        {!!b.subtitle && <p className="text-[15px] text-paradigm-ink-soft max-w-2xl mx-auto text-center mb-16 leading-[1.85]">{String(b.subtitle)}</p>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {tiers.map((t, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: EASE }}
              whileHover={{ y: -4 }}
              className={`rounded-2xl p-8 paradigm-glass paradigm-glow-sm hover:paradigm-glow-md transition-all relative overflow-hidden ${t.highlighted ? "ring-2 ring-paradigm-accent" : "border border-paradigm-line"}`}>
              {t.highlighted && (
                <>
                  <BorderBeam size={120} duration={6} colorFrom="rgb(236 72 153)" colorTo="rgb(245 158 11)" />
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-paradigm-accent text-paradigm-paper text-[11px] tracking-[0.14em] uppercase px-3 py-1 rounded-full">Popular</span>
                </>
              )}
              <h3 className="font-display text-[22px] text-paradigm-ink mb-3">{t.name ?? ""}</h3>
              <div className="mb-4"><span className="font-display text-[40px] text-paradigm-ink">{t.price ?? ""}</span>{t.period && <span className="text-[14px] text-paradigm-ink-mute ml-1">/{t.period}</span>}</div>
              {t.description && <p className="text-[13px] text-paradigm-ink-soft leading-[1.75] mb-6">{t.description}</p>}
              {t.features && <ul className="space-y-3 mb-8">{t.features.split("\n").filter(Boolean).map((f, j) => <li key={j} className="flex items-start gap-2 text-[13px] text-paradigm-ink-soft"><span className="text-paradigm-accent shrink-0 mt-0.5">✓</span>{f}</li>)}</ul>}
              {t.ctaHref && <a href={t.ctaHref} className={`block text-center py-3 rounded-xl text-[12px] tracking-[0.14em] uppercase transition-all ${t.highlighted ? "bg-paradigm-ink text-paradigm-paper hover:bg-paradigm-accent paradigm-glow-sm" : "border border-paradigm-ink text-paradigm-ink hover:bg-paradigm-ink hover:text-paradigm-paper"}`}>{t.ctaLabel ?? "Get started"}</a>}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function ComparisonRender(b: AnyBlock) {
  const rows = (b.rows as Array<{ item?: string; leftValue?: string; rightValue?: string }>) ?? []
  const leftLabel = (b.leftLabel as string) ?? "Paradigm"
  const rightLabel = (b.rightLabel as string) ?? "Traditional"
  return (
    <section className="bg-paradigm-paper paradigm-section relative overflow-hidden">
      <div className="paradigm-mesh opacity-25" />
      <div className="max-w-5xl mx-auto px-6 md:px-12 relative z-10">
        {!!b.kicker && <p className="paradigm-eyebrow text-paradigm-accent mb-4 text-center">{String(b.kicker)}</p>}
        {!!b.title && <h2 className="font-display text-[28px] md:text-[44px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink text-center mb-4">{String(b.title)}</h2>}
        {!!b.subtitle && <p className="text-[15px] text-paradigm-ink-soft max-w-2xl mx-auto text-center mb-12 leading-[1.85]">{String(b.subtitle)}</p>}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-paradigm-ink">
                <th className="text-left py-4 px-4 text-[12px] tracking-[0.14em] uppercase text-paradigm-ink-soft font-medium" />
                <th className="text-left py-4 px-4 text-[12px] tracking-[0.14em] uppercase text-paradigm-ink font-display font-semibold">{leftLabel}</th>
                <th className="text-left py-4 px-4 text-[12px] tracking-[0.14em] uppercase text-paradigm-ink-soft font-medium">{rightLabel}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <motion.tr key={i} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="border-b border-paradigm-line last:border-0 hover:bg-paradigm-paper-deep/50 transition-colors">
                  <td className="py-4 px-4 text-[13px] md:text-[14px] text-paradigm-ink-soft font-medium">{r.item ?? ""}</td>
                  <td className="py-4 px-4 text-[13px] md:text-[14px] text-paradigm-ink font-display font-semibold">{r.leftValue ?? ""}</td>
                  <td className="py-4 px-4 text-[13px] md:text-[14px] text-paradigm-ink-soft">{r.rightValue ?? ""}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

export function TimelineRender(b: AnyBlock) {
  const items = (b.items as Array<{ date?: string; title?: string; description?: string }>) ?? []
  return (
    <section className="bg-paradigm-paper paradigm-section relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-6 md:px-12">
        {!!b.kicker && <p className="paradigm-eyebrow text-paradigm-accent mb-4 text-center">{String(b.kicker)}</p>}
        {!!b.title && <h2 className="font-display text-[28px] md:text-[44px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink text-center mb-16">{String(b.title)}</h2>}
        <div className="relative pl-8 md:pl-0 space-y-0">
          {items.map((it, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.1 }}
              className="relative pb-12 pl-8 md:pl-0 md:grid md:grid-cols-[120px_1fr] md:gap-8 border-l-2 border-paradigm-line last:border-transparent">
              <div className="hidden md:block paradigm-eyebrow text-paradigm-accent pt-1 text-[11px]">{it.date ?? ""}</div>
              <div>
                <div className="absolute left-0 top-1 w-3 h-3 rounded-full bg-paradigm-accent -translate-x-[7px]" />
                <div className="md:hidden paradigm-eyebrow text-paradigm-accent mb-1 text-[11px]">{it.date ?? ""}</div>
                <h3 className="font-display text-[20px] text-paradigm-ink mb-2">{it.title ?? ""}</h3>
                {it.description && <p className="text-[13px] md:text-[14px] text-paradigm-ink-soft leading-[1.8]">{it.description}</p>}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
