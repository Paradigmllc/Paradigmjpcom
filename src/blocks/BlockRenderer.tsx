/**
 * BlockRenderer.tsx — Pages collection layout の dispatcher (Aesop voice)
 *
 * 役割:
 *   payload.find({ collection: "pages" }) 結果の `layout` (Block array) を
 *   block の slug ごとに該当 React component に dispatch して render する。
 *
 * 永久ルール: 新 Block 追加 = src/blocks/{NewBlock}.ts (config) +
 *            ここに block.slug → render 関数 を 1 行追加 のみで完結
 *
 * P18-D-3 followup rewrite: 全 block を Aesop tokens (paradigm-paper /
 * paper-deep / ink) + font-display + paradigm-eyebrow + hairline borders
 * へ書き換え。violet/indigo gradients を排除して brand 統一。
 *
 * AE-PHP-1: 195 lines.
 */

import { RichText } from "@payloadcms/richtext-lexical/react"
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical"

interface AnyBlock {
  blockType: string
  id?: string
  [key: string]: unknown
}

function HeroRender(b: AnyBlock) {
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

function SectionRender(b: AnyBlock) {
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

function CardGridRender(b: AnyBlock) {
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

function CTARender(b: AnyBlock) {
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

function FAQRender(b: AnyBlock) {
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

function RichTextRender(b: AnyBlock) {
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

function StatsRender(b: AnyBlock) {
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

function TestimonialsRender(b: AnyBlock) {
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

function ProcessRender(b: AnyBlock) {
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

function MarqueeRender(b: AnyBlock) {
  const items = (b.items as Array<{ text?: string }>) ?? []
  const direction = (b.direction as string) ?? "left"
  const speed = (b.speed as string) ?? "normal"
  // CSS animation duration based on speed setting (slower = larger value)
  const duration = speed === "slow" ? "60s" : speed === "fast" ? "20s" : "40s"
  const animDir = direction === "right" ? "reverse" : "normal"
  const repeated = [...items, ...items, ...items] // 3x for seamless loop
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

function PricingRender(b: AnyBlock) {
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

function LogoCloudRender(b: AnyBlock) {
  const logos = (b.logos as Array<{ image?: unknown; alt?: string }>) ?? []
  // media upload の image は PayloadCMS 独自オブジェクト。公開ページでは簡易的に alt を表示
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

function VideoRender(b: AnyBlock) {
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

function SplitContentRender(b: AnyBlock) {
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

function TimelineRender(b: AnyBlock) {
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

const RENDERERS: Record<string, (b: AnyBlock) => React.ReactNode> = {
  hero: HeroRender,
  section: SectionRender,
  "card-grid": CardGridRender,
  cta: CTARender,
  faq: FAQRender,
  "rich-text": RichTextRender,
  stats: StatsRender,
  testimonials: TestimonialsRender,
  process: ProcessRender,
  marquee: MarqueeRender,
  pricing: PricingRender,
  "logo-cloud": LogoCloudRender,
  video: VideoRender,
  "split-content": SplitContentRender,
  timeline: TimelineRender,
}

export default function BlockRenderer({ blocks }: { blocks: AnyBlock[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        const Render = RENDERERS[b.blockType]
        if (!Render) {
          if (process.env.NODE_ENV !== "production") {
            return (
              <div key={i} className="p-4 paradigm-eyebrow text-paradigm-accent bg-paradigm-paper-deep border-b border-paradigm-line">
                Unknown block: {b.blockType}
              </div>
            )
          }
          return null
        }
        return <div key={(b.id as string) ?? i}>{Render(b)}</div>
      })}
    </>
  )
}
