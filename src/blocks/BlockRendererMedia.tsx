interface AnyBlock {
  blockType: string
  id?: string
  [key: string]: unknown
}

export function VideoRender(b: AnyBlock) {
  const embedUrl = b.embedUrl as string | undefined
  if (!embedUrl) return null
  return (
    <section className="bg-paradigm-paper paradigm-section">
      <div className="max-w-4xl mx-auto px-6 md:px-12">
        {!!b.title && <h2 className="font-display text-[28px] md:text-[40px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink mb-4">{String(b.title)}</h2>}
        {!!b.subtitle && <p className="text-[15px] text-paradigm-ink-soft mb-8 leading-[1.85]">{String(b.subtitle)}</p>}
        <div className="aspect-video rounded-2xl overflow-hidden paradigm-glass">
          <iframe src={embedUrl} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full" title={String(b.title ?? "")} />
        </div>
      </div>
    </section>
  )
}

export function MarqueeRender(b: AnyBlock) {
  const items = (b.items as Array<{ text?: string }>) ?? []
  const direction = (b.direction as string) ?? "left"
  const speed = (b.speed as string) ?? "normal"
  const duration = speed === "slow" ? "60s" : speed === "fast" ? "20s" : "40s"
  const animDir = direction === "right" ? "reverse" : "normal"
  const repeated = [...items, ...items, ...items]
  return (
    <section className="bg-paradigm-paper-deep py-8 overflow-hidden border-y border-paradigm-line">
      <div
        className="flex whitespace-nowrap"
        style={{ animation: `gradientShift ${duration} linear infinite ${animDir}` }}
      >
        {repeated.map((it, i) => (
          <span key={i} className="inline-flex items-center px-8 paradigm-eyebrow text-paradigm-ink-soft">
            {it.text ?? ""}
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-paradigm-accent/40 ml-8" />
          </span>
        ))}
      </div>
    </section>
  )
}

export function LogoCloudRender(b: AnyBlock) {
  const logos = (b.logos as Array<{ image?: unknown; alt?: string }>) ?? []
  return (
    <section className="bg-paradigm-paper-deep paradigm-section py-16 border-y border-paradigm-line">
      <div className="max-w-6xl mx-auto px-6 md:px-12 text-center">
        {!!b.title && <p className="paradigm-eyebrow mb-8">{String(b.title)}</p>}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 items-center justify-items-center opacity-30 hover:opacity-50 transition-opacity grayscale">
          {logos.map((l, i) => (
            <div key={i} className="paradigm-eyebrow text-paradigm-ink-mute text-[11px] tracking-[0.14em] uppercase">
              {l.alt ?? `Logo ${i + 1}`}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
