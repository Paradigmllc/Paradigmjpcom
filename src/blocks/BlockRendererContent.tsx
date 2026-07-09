import { RichText } from "@payloadcms/richtext-lexical/react"
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical"

interface AnyBlock {
  blockType: string
  id?: string
  [key: string]: unknown
}

export function SectionRender(b: AnyBlock) {
  const align = (b.alignment as string) ?? "center"
  const bgKey = (b.background as string) ?? "default"
  const bg =
    bgKey === "surface"
      ? "bg-paradigm-paper-deep"
      : bgKey === "accent-soft"
      ? "bg-paradigm-paper-deep"
      : "bg-paradigm-paper"
  return (
    <section className={`${bg} paradigm-section`}>
      <div className={`max-w-5xl mx-auto px-6 md:px-12 ${align === "center" ? "text-center" : "text-left"}`}>
        {!!b.kicker && <p className="paradigm-eyebrow mb-5">{String(b.kicker)}</p>}
        <h2 className="font-display text-[32px] md:text-[52px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink mb-6">
          {String(b.title ?? "")}
        </h2>
        {!!b.subtitle && (
          <p className="text-[15px] md:text-[17px] text-paradigm-ink-soft max-w-3xl mx-auto leading-[1.85]">
            {String(b.subtitle)}
          </p>
        )}
      </div>
    </section>
  )
}

export function CTARender(b: AnyBlock) {
  const bgKey = (b.background as string) ?? "gradient"
  const isDark = bgKey !== "surface"
  const bg = isDark ? "bg-paradigm-ink text-paradigm-paper" : "bg-paradigm-paper-deep text-paradigm-ink"
  const primary = b.primaryCta as { label?: string; href?: string } | undefined
  const secondary = b.secondaryCta as { label?: string; href?: string } | undefined
  return (
    <section className={`${bg} paradigm-section`}>
      <div className="max-w-3xl mx-auto px-6 md:px-12 text-center">
        <h2 className={`font-display text-[32px] md:text-[52px] leading-[1.1] tracking-[-0.015em] mb-6 ${isDark ? "text-paradigm-paper" : "text-paradigm-ink"}`}>
          {String(b.title ?? "")}
        </h2>
        {!!b.subtitle && (
          <p className={`text-[15px] md:text-[17px] max-w-xl mx-auto mb-10 leading-[1.85] ${isDark ? "text-paradigm-paper/65" : "text-paradigm-ink-soft"}`}>
            {String(b.subtitle)}
          </p>
        )}
        <div className="flex flex-wrap gap-3 justify-center">
          {primary?.href && (
            <a
              href={primary.href}
              className={`inline-flex items-center gap-2 px-10 py-4 text-[12px] tracking-[0.18em] uppercase transition-colors ${
                isDark
                  ? "border border-paradigm-paper text-paradigm-paper hover:bg-paradigm-paper hover:text-paradigm-ink"
                  : "bg-paradigm-ink text-paradigm-paper hover:bg-paradigm-accent"
              }`}
            >
              {primary.label ?? "Get started"}
            </a>
          )}
          {secondary?.href && (
            <a
              href={secondary.href}
              className={`inline-flex items-center gap-2 px-10 py-4 text-[12px] tracking-[0.18em] uppercase transition-colors ${
                isDark
                  ? "text-paradigm-paper/70 hover:text-paradigm-paper"
                  : "border border-paradigm-line text-paradigm-ink-soft hover:border-paradigm-ink hover:text-paradigm-ink"
              }`}
            >
              {secondary.label ?? "Learn more"}
            </a>
          )}
        </div>
      </div>
    </section>
  )
}

export function FAQRender(b: AnyBlock) {
  const items = (b.items as Array<{ question?: string; answer?: SerializedEditorState }>) ?? []
  return (
    <section className="bg-paradigm-paper paradigm-section">
      <div className="max-w-3xl mx-auto px-6 md:px-12">
        {!!b.title && (
          <h2 className="font-display text-[32px] md:text-[44px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink text-center mb-3">
            {String(b.title)}
          </h2>
        )}
        {!!b.subtitle && (
          <p className="text-[15px] text-paradigm-ink-soft text-center mb-12 leading-[1.85]">
            {String(b.subtitle)}
          </p>
        )}
        <ul className="border-t border-paradigm-line">
          {items.map((item, i) => (
            <li key={i} className="border-b border-paradigm-line">
              <details className="group">
                <summary className="cursor-pointer flex items-start gap-5 py-7 list-none [&::-webkit-details-marker]:hidden">
                  <span className="font-display text-[18px] md:text-[22px] leading-[1.4] text-paradigm-ink flex-1 pr-8">
                    {item.question ?? ""}
                  </span>
                  <span aria-hidden className="shrink-0 text-paradigm-ink-mute mt-2 group-open:rotate-45 transition-transform text-[18px] leading-none">
                    +
                  </span>
                </summary>
                {item.answer && (
                  <div className="pl-1 pr-8 pb-7 -mt-2 text-[14px] md:text-[15px] text-paradigm-ink-soft leading-[1.85]">
                    <RichText data={item.answer} />
                  </div>
                )}
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function RichTextRender(b: AnyBlock) {
  const maxWidth = (b.maxWidth as string) ?? "prose"
  const widthClass = maxWidth === "wide" ? "max-w-5xl" : maxWidth === "full" ? "max-w-full" : "max-w-3xl"
  const content = b.content as SerializedEditorState | undefined
  if (!content) return null
  return (
    <section className="bg-paradigm-paper paradigm-section">
      <div className={`${widthClass} mx-auto px-6 md:px-12 prose prose-paradigm max-w-none`}>
        <RichText data={content} />
      </div>
    </section>
  )
}

export function SplitContentRender(b: AnyBlock) {
  const reverse = (b.reverse as boolean) ?? false
  const content = b.content as SerializedEditorState | undefined
  const image = b.image as { url?: string; alt?: string } | undefined
  const bgKey = (b.background as string) ?? "default"
  const bg = bgKey === "surface" ? "bg-paradigm-paper-deep" : "bg-paradigm-paper"
  const ctaLabel = typeof b.ctaLabel === "string" ? b.ctaLabel : undefined
  const ctaHref = typeof b.ctaHref === "string" ? b.ctaHref : undefined
  const ctaIsExternal = ctaHref ? /^https?:\/\//i.test(ctaHref) : false
  const imagePlaceholder =
    typeof b.imagePlaceholder === "string" ? b.imagePlaceholder : "Image"
  return (
    <section className={`${bg} paradigm-section py-24 md:py-32`}>
      <div className={`max-w-6xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center ${reverse ? "" : ""}`}>
        <div className={reverse ? "md:order-2" : ""}>
          {!!b.kicker && <p className="paradigm-eyebrow text-paradigm-accent mb-4">{String(b.kicker)}</p>}
          {!!b.title && <h2 className="font-display text-[28px] md:text-[40px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink mb-5">{String(b.title)}</h2>}
          {content && <div className="text-[14px] md:text-[15px] text-paradigm-ink-soft leading-[1.85] prose prose-paradigm max-w-none"><RichText data={content} /></div>}
          {ctaLabel && ctaHref && <a href={ctaHref} target={ctaIsExternal ? "_blank" : undefined} rel={ctaIsExternal ? "noopener noreferrer" : undefined} className="inline-flex items-center gap-2 mt-8 text-paradigm-ink border-b border-paradigm-ink pb-1 text-[12px] tracking-[0.14em] uppercase hover:text-paradigm-accent hover:border-paradigm-accent transition-colors">{ctaLabel} →</a>}
        </div>
        <div className={reverse ? "md:order-1" : ""}>
          {image?.url ? (
            <img src={image.url} alt={image.alt ?? ""} className="rounded-2xl paradigm-glass w-full" loading="lazy" />
          ) : (
            <div className="bg-paradigm-line/20 rounded-2xl aspect-square flex items-center justify-center paradigm-eyebrow text-paradigm-ink-mute">{imagePlaceholder}</div>
          )}
        </div>
      </div>
    </section>
  )
}
