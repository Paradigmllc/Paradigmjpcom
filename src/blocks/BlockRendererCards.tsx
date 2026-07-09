interface AnyBlock {
  blockType: string
  id?: string
  [key: string]: unknown
}

export function CardGridRender(b: AnyBlock) {
  const variant = (b.variant as string) ?? "equal"
  const cols = (b.columns as string) ?? "3"
  const cards =
    (b.cards as Array<{ icon?: string; title?: string; description?: string; href?: string; highlighted?: boolean }>) ?? []
  const colsClass = cols === "2" ? "md:grid-cols-2" : cols === "4" ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-2 lg:grid-cols-3"
  return (
    <section className="bg-paradigm-paper paradigm-section">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        {!!b.title && (
          <h2 className="font-display text-[28px] md:text-[40px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink text-center mb-12">
            {String(b.title)}
          </h2>
        )}
        <div className={`grid grid-cols-1 ${colsClass} gap-px bg-paradigm-line`}>
          {cards.map((c, i) => {
            const inner = (
              <div className={`bg-paradigm-paper p-9 md:p-10 h-full ${variant === "bento" && i === 0 ? "md:col-span-2" : ""} ${c.highlighted ? "bg-paradigm-paper-card" : ""}`}>
                {c.icon && <div className="text-[28px] mb-5 opacity-70">{c.icon}</div>}
                {c.highlighted && <p className="paradigm-eyebrow text-paradigm-accent mb-3">Featured</p>}
                <h3 className="font-display text-[22px] md:text-[26px] leading-[1.2] text-paradigm-ink mb-3">
                  {c.title ?? ""}
                </h3>
                {c.description && (
                  <p className="text-[14px] text-paradigm-ink-soft leading-[1.85]">{c.description}</p>
                )}
              </div>
            )
            return c.href ? (
              <a key={i} href={c.href} className="block hover:bg-paradigm-paper-card transition-colors">
                {inner}
              </a>
            ) : (
              <div key={i}>{inner}</div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function StatsRender(b: AnyBlock) {
  const stats = (b.stats as Array<{ value?: string; label?: string; sublabel?: string }>) ?? []
  const bgKey = (b.background as string) ?? "default"
  const bg =
    bgKey === "dark"
      ? "bg-paradigm-ink text-paradigm-paper"
      : bgKey === "surface"
      ? "bg-paradigm-paper-deep"
      : "bg-paradigm-paper"
  const isDark = bgKey === "dark"
  return (
    <section className={`${bg} paradigm-section`}>
      <div className="max-w-6xl mx-auto px-6 md:px-12 text-center">
        {!!b.kicker && <p className={`paradigm-eyebrow mb-4 ${isDark ? "text-paradigm-glow" : ""}`}>{String(b.kicker)}</p>}
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
            <div key={i} className="text-center">
              <div className={`font-display text-[40px] md:text-[56px] leading-[1] mb-2 ${isDark ? "text-paradigm-paper" : "text-paradigm-ink"}`}>
                {s.value ?? ""}
              </div>
              <div className={`paradigm-eyebrow mb-1 ${isDark ? "text-paradigm-glow" : "text-paradigm-accent"}`}>{s.label ?? ""}</div>
              {s.sublabel && (
                <div className={`text-[12px] ${isDark ? "text-paradigm-paper/55" : "text-paradigm-ink-mute"}`}>{s.sublabel}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function TestimonialsRender(b: AnyBlock) {
  const items = (b.items as Array<{ name?: string; location?: string; text?: string; rating?: number }>) ?? []
  return (
    <section className="bg-paradigm-paper-deep paradigm-section">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        {!!b.kicker && <p className="paradigm-eyebrow text-paradigm-accent mb-4 text-center">{String(b.kicker)}</p>}
        {!!b.title && (
          <h2 className="font-display text-[28px] md:text-[44px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink text-center mb-12">
            {String(b.title)}
          </h2>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((it, i) => (
            <figure key={i} className="paradigm-glass rounded-2xl p-6 paradigm-glow-sm hover:paradigm-glow-md transition-all">
              {typeof it.rating === "number" && (
                <div className="text-paradigm-accent mb-3 text-[14px]" aria-label={`${it.rating} / 5`}>
                  {"★".repeat(Math.max(1, Math.min(5, Math.round(it.rating))))}
                </div>
              )}
              <blockquote className="text-[14px] md:text-[15px] text-paradigm-ink leading-[1.85] mb-5">
                “{it.text ?? ""}”
              </blockquote>
              <figcaption className="paradigm-eyebrow text-paradigm-ink-soft">
                {it.name ?? ""}
                {it.location && <span className="text-paradigm-ink-mute ml-2">· {it.location}</span>}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

export function ProcessRender(b: AnyBlock) {
  const steps = (b.steps as Array<{ title?: string; description?: string }>) ?? []
  return (
    <section className="bg-paradigm-paper paradigm-section">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        {!!b.kicker && <p className="paradigm-eyebrow text-paradigm-accent mb-3">{String(b.kicker)}</p>}
        {!!b.title && (
          <h2 className="font-display text-[28px] md:text-[40px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink mb-4">
            {String(b.title)}
          </h2>
        )}
        {!!b.subtitle && (
          <p className="text-[15px] text-paradigm-ink-soft max-w-2xl mb-12 leading-[1.85]">{String(b.subtitle)}</p>
        )}
        <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-paradigm-line">
          {steps.map((s, i) => (
            <li key={i} className="bg-paradigm-paper p-7">
              <div className="paradigm-eyebrow text-paradigm-accent mb-3">0{i + 1}</div>
              <h3 className="font-display text-[20px] md:text-[22px] leading-[1.2] text-paradigm-ink mb-3 tracking-[-0.015em]">
                {s.title ?? ""}
              </h3>
              <p className="text-[13px] text-paradigm-ink-soft leading-[1.8]">{s.description ?? ""}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export function PricingRender(b: AnyBlock) {
  const tiers = (b.tiers as Array<{ name?: string; price?: string; period?: string; description?: string; features?: string; ctaLabel?: string; ctaHref?: string; highlighted?: boolean }>) ?? []
  return (
    <section className="bg-paradigm-paper paradigm-section py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        {!!b.title && <h2 className="font-display text-[28px] md:text-[44px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink text-center mb-4">{String(b.title)}</h2>}
        {!!b.subtitle && <p className="text-[15px] text-paradigm-ink-soft max-w-2xl mx-auto text-center mb-16 leading-[1.85]">{String(b.subtitle)}</p>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {tiers.map((t, i) => (
            <div key={i} className={`rounded-2xl p-8 paradigm-glass ${t.highlighted ? "ring-2 ring-paradigm-accent relative" : "border border-paradigm-line"}`}>
              {t.highlighted && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-paradigm-accent text-paradigm-paper text-[11px] tracking-[0.14em] uppercase px-3 py-1 rounded-full">人気</span>}
              <h3 className="font-display text-[22px] text-paradigm-ink mb-3">{t.name ?? ""}</h3>
              <div className="mb-4"><span className="font-display text-[40px] text-paradigm-ink">{t.price ?? ""}</span>{t.period && <span className="text-[14px] text-paradigm-ink-mute ml-1">/{t.period}</span>}</div>
              {t.description && <p className="text-[13px] text-paradigm-ink-soft leading-[1.75] mb-6">{t.description}</p>}
              {t.features && <ul className="space-y-3 mb-8">
                {t.features.split("\n").filter(Boolean).map((f, j) => <li key={j} className="flex items-start gap-2 text-[13px] text-paradigm-ink-soft"><span className="text-paradigm-accent shrink-0 mt-0.5">✓</span>{f}</li>)}
              </ul>}
              {t.ctaHref && <a href={t.ctaHref} className={`block text-center py-3 text-[12px] tracking-[0.14em] uppercase transition-colors ${t.highlighted ? "bg-paradigm-ink text-paradigm-paper hover:bg-paradigm-accent" : "border border-paradigm-ink text-paradigm-ink hover:bg-paradigm-ink hover:text-paradigm-paper"}`}>{t.ctaLabel ?? "Get started"}</a>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function TimelineRender(b: AnyBlock) {
  const items = (b.items as Array<{ date?: string; title?: string; description?: string }>) ?? []
  return (
    <section className="bg-paradigm-paper paradigm-section py-24 md:py-32">
      <div className="max-w-4xl mx-auto px-6 md:px-12">
        {!!b.kicker && <p className="paradigm-eyebrow text-paradigm-accent mb-4 text-center">{String(b.kicker)}</p>}
        {!!b.title && <h2 className="font-display text-[28px] md:text-[44px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink text-center mb-16">{String(b.title)}</h2>}
        <div className="relative pl-8 md:pl-0 space-y-0">
          {items.map((it, i) => (
            <div key={i} className="relative pb-12 pl-8 md:pl-0 md:grid md:grid-cols-[120px_1fr] md:gap-8 border-l-2 border-paradigm-line last:border-transparent">
              <div className="hidden md:block paradigm-eyebrow text-paradigm-accent pt-1 text-[11px]">{it.date ?? ""}</div>
              <div>
                <div className="absolute left-0 top-1 w-3 h-3 rounded-full bg-paradigm-accent -translate-x-[7px]" />
                <div className="md:hidden paradigm-eyebrow text-paradigm-accent mb-1 text-[11px]">{it.date ?? ""}</div>
                <h3 className="font-display text-[20px] text-paradigm-ink mb-2">{it.title ?? ""}</h3>
                {it.description && <p className="text-[13px] md:text-[14px] text-paradigm-ink-soft leading-[1.8]">{it.description}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
