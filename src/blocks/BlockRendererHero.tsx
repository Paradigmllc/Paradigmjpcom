interface AnyBlock {
  blockType: string
  id?: string
  [key: string]: unknown
}

export default function BlockRendererHero(b: AnyBlock) {
  const variant = (b.variant as string) ?? "centered"
  const stats = (b.stats as Array<{ value?: string; label?: string }>) ?? []
  const primary = b.primaryCta as { label?: string; href?: string } | undefined
  const secondary = b.secondaryCta as { label?: string; href?: string } | undefined
  return (
    <section className={`relative bg-paradigm-paper paradigm-section pt-36 ${variant === "centered" ? "text-center" : ""}`}>
      <div className="max-w-5xl mx-auto px-6 md:px-12">
        {!!b.badge && <p className="paradigm-eyebrow mb-6">{String(b.badge)}</p>}
        <h1 className="font-display text-[40px] md:text-[72px] leading-[1.08] tracking-[-0.015em] text-paradigm-ink mb-6">
          {String(b.title ?? "")}
        </h1>
        {!!b.subtitle && (
          <p className="text-[15px] md:text-[17px] text-paradigm-ink-soft max-w-2xl mx-auto leading-[1.85] mb-10">
            {String(b.subtitle)}
          </p>
        )}
        <div className={`flex flex-wrap gap-3 ${variant === "centered" ? "justify-center" : ""}`}>
          {primary?.href && (
            <a
              href={primary.href}
              className="inline-flex items-center gap-2 bg-paradigm-ink text-paradigm-paper px-8 py-4 text-[12px] tracking-[0.18em] uppercase hover:bg-paradigm-accent transition-colors"
            >
              {primary.label ?? "Learn more"}
            </a>
          )}
          {secondary?.href && (
            <a
              href={secondary.href}
              className="inline-flex items-center gap-2 border border-paradigm-line text-paradigm-ink-soft hover:border-paradigm-ink hover:text-paradigm-ink px-8 py-4 text-[12px] tracking-[0.18em] uppercase transition-colors"
            >
              {secondary.label ?? "More"}
            </a>
          )}
        </div>
        {stats.length > 0 && (
          <div className={`mt-20 grid grid-cols-2 md:grid-cols-4 border-t border-paradigm-line ${variant === "centered" ? "max-w-3xl mx-auto" : ""}`}>
            {stats.map((s, i) => (
              <div key={i} className={`px-4 py-6 text-center ${i > 0 ? "md:border-l border-paradigm-line" : ""} ${i === 1 || i === 3 ? "border-l border-paradigm-line" : ""} ${i >= 2 ? "border-t md:border-t-0 border-paradigm-line" : ""}`}>
                <div className="font-display text-[28px] md:text-[36px] text-paradigm-ink">{s.value ?? ""}</div>
                <div className="paradigm-eyebrow mt-2">{s.label ?? ""}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
