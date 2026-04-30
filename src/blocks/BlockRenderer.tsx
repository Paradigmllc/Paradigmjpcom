/**
 * BlockRenderer.tsx — Pages collection layout の dispatcher
 *
 * 役割:
 *   payload.find({ collection: "pages" }) 結果の `layout` (Block array) を
 *   block の slug ごとに該当 React component に dispatch して render する。
 *
 * 永久ルール: 新 Block 追加 = src/blocks/{NewBlock}.ts (config) +
 *            ここに block.slug → render 関数 を 1 行追加 のみで完結
 */

import { RichText } from "@payloadcms/richtext-lexical/react"
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical"

// ─── 共通型 (緩く any-shape Block を受ける・config 側 type と合わせる) ─
interface AnyBlock {
  blockType: string
  id?: string
  [key: string]: unknown
}

// ─── 型 narrowing helper (unknown → string | undefined) ─────────────
function s(v: unknown): string | undefined {
  if (typeof v === "string" && v.length > 0) return v
  return undefined
}

// ─── 個別 Block レンダラー ─────────────────────────────────────────
function HeroRender(b: AnyBlock) {
  const variant = s(b.variant) ?? "centered"
  const badge = s(b.badge)
  const title = s(b.title) ?? ""
  const subtitle = s(b.subtitle)
  const stats = (Array.isArray(b.stats) ? b.stats : []) as Array<{ value?: string; label?: string }>
  const primary = b.primaryCta as { label?: string; href?: string } | undefined
  const secondary = b.secondaryCta as { label?: string; href?: string } | undefined
  return (
    <section className={`relative px-6 py-24 ${variant === "centered" ? "text-center" : ""} bg-gradient-to-b from-violet-50 via-white to-white`}>
      <div className="max-w-5xl mx-auto">
        {badge ? <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-accent/10 text-accent mb-4">{badge}</span> : null}
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-4">{title}</h1>
        {subtitle ? <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto mb-8">{subtitle}</p> : null}
        <div className="flex flex-wrap gap-3 justify-center">
          {primary?.href ? (
            <a href={primary.href} className="h-11 px-6 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold inline-flex items-center shadow-lg hover:shadow-xl transition-shadow">
              {primary.label ?? "Learn more"}
            </a>
          ) : null}
          {secondary?.href ? (
            <a href={secondary.href} className="h-11 px-6 rounded-xl border-2 border-slate-200 text-slate-700 text-sm font-bold inline-flex items-center hover:bg-slate-50 transition-colors">
              {secondary.label ?? "More"}
            </a>
          ) : null}
        </div>
        {stats.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto mt-12">
            {stats.map((st, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-extrabold text-slate-900">{st.value ?? ""}</div>
                <div className="text-xs text-slate-500 mt-1">{st.label ?? ""}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}

function SectionRender(b: AnyBlock) {
  const align = s(b.alignment) ?? "center"
  const bgKey = s(b.background) ?? "default"
  const bg = bgKey === "surface" ? "bg-slate-50" : bgKey === "accent-soft" ? "bg-accent/5" : "bg-white"
  const kicker = s(b.kicker)
  const title = s(b.title) ?? ""
  const subtitle = s(b.subtitle)
  return (
    <section className={`${bg} py-20 px-6`}>
      <div className={`max-w-5xl mx-auto ${align === "center" ? "text-center" : "text-left"}`}>
        {kicker ? <span className="inline-block text-xs font-bold tracking-widest text-accent uppercase mb-3">{kicker}</span> : null}
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 mb-3">{title}</h2>
        {subtitle ? <p className="text-base text-slate-600 max-w-3xl mx-auto leading-relaxed">{subtitle}</p> : null}
      </div>
    </section>
  )
}

function CardGridRender(b: AnyBlock) {
  const variant = s(b.variant) ?? "equal"
  const cols = s(b.columns) ?? "3"
  const cards = (Array.isArray(b.cards) ? b.cards : []) as Array<{ icon?: string; title?: string; description?: string; href?: string; highlighted?: boolean }>
  const colsClass = cols === "2" ? "md:grid-cols-2" : cols === "4" ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-2 lg:grid-cols-3"
  const sectionTitle = s(b.title)
  return (
    <section className="bg-white py-16 px-6">
      <div className="max-w-6xl mx-auto">
        {sectionTitle ? <h2 className="text-2xl md:text-3xl font-bold text-slate-900 text-center mb-10">{sectionTitle}</h2> : null}
        <div className={`grid grid-cols-1 ${colsClass} gap-5`}>
          {cards.map((c, i) => {
            const isHi = !!c.highlighted
            const inner = (
              <div className={`p-6 rounded-2xl border ${isHi ? "border-accent bg-accent/5 ring-2 ring-accent/20" : "border-slate-200 bg-white"} hover:shadow-lg transition-shadow ${variant === "bento" && i === 0 ? "md:col-span-2" : ""}`}>
                {c.icon ? <div className="text-3xl mb-3">{c.icon}</div> : null}
                <h3 className="text-base font-bold text-slate-900 mb-2">{c.title ?? ""}</h3>
                {c.description ? <p className="text-sm text-slate-600 leading-relaxed">{c.description}</p> : null}
              </div>
            )
            return c.href ? <a key={i} href={c.href} className="block">{inner}</a> : <div key={i}>{inner}</div>
          })}
        </div>
      </div>
    </section>
  )
}

function CTARender(b: AnyBlock) {
  const bgKey = s(b.background) ?? "gradient"
  const bg = bgKey === "gradient"
    ? "bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 text-white"
    : bgKey === "accent" ? "bg-accent text-white" : "bg-slate-50 text-slate-900"
  const title = s(b.title) ?? ""
  const subtitle = s(b.subtitle)
  const primary = b.primaryCta as { label?: string; href?: string } | undefined
  const secondary = b.secondaryCta as { label?: string; href?: string } | undefined
  const isDark = bgKey !== "surface"
  return (
    <section className={`${bg} py-20 px-6`}>
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">{title}</h2>
        {subtitle ? <p className={`text-base ${isDark ? "text-white/80" : "text-slate-600"} mb-8`}>{subtitle}</p> : null}
        <div className="flex flex-wrap gap-3 justify-center">
          {primary?.href ? (
            <a href={primary.href} className={`h-12 px-7 rounded-xl ${isDark ? "bg-white text-violet-700" : "bg-violet-600 text-white"} text-sm font-bold inline-flex items-center shadow-xl hover:scale-[1.03] transition-transform`}>
              {primary.label ?? "Get started"}
            </a>
          ) : null}
          {secondary?.href ? (
            <a href={secondary.href} className={`h-12 px-7 rounded-xl border-2 ${isDark ? "border-white/40 text-white" : "border-slate-300 text-slate-700"} text-sm font-bold inline-flex items-center hover:bg-white/10 transition-colors`}>
              {secondary.label ?? "Learn more"}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function FAQRender(b: AnyBlock) {
  const items = (Array.isArray(b.items) ? b.items : []) as Array<{ question?: string; answer?: SerializedEditorState }>
  const title = s(b.title)
  const subtitle = s(b.subtitle)
  return (
    <section className="bg-white py-20 px-6">
      <div className="max-w-3xl mx-auto">
        {title ? <h2 className="text-3xl md:text-4xl font-bold text-slate-900 text-center mb-3">{title}</h2> : null}
        {subtitle ? <p className="text-base text-slate-600 text-center mb-10">{subtitle}</p> : null}
        <div className="space-y-3">
          {items.map((item, i) => (
            <details key={i} className="group rounded-2xl border border-slate-200 bg-white p-5 open:bg-slate-50">
              <summary className="cursor-pointer text-base font-bold text-slate-900 flex items-center justify-between">
                {item.question ?? ""}
                <span className="text-2xl text-slate-400 group-open:rotate-45 transition-transform">+</span>
              </summary>
              {item.answer ? (
                <div className="mt-4 text-sm text-slate-600 prose prose-sm max-w-none">
                  <RichText data={item.answer} />
                </div>
              ) : null}
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

function RichTextRender(b: AnyBlock) {
  const maxWidth = s(b.maxWidth) ?? "prose"
  const widthClass = maxWidth === "wide" ? "max-w-5xl" : maxWidth === "full" ? "max-w-full" : "max-w-3xl"
  const content = b.content as SerializedEditorState | undefined
  if (!content) return null
  return (
    <section className="bg-white py-16 px-6">
      <div className={`${widthClass} mx-auto prose prose-slate max-w-none`}>
        <RichText data={content} />
      </div>
    </section>
  )
}

// ─── Dispatcher ──────────────────────────────────────────────────────
const RENDERERS: Record<string, (b: AnyBlock) => React.ReactNode> = {
  hero: HeroRender,
  section: SectionRender,
  "card-grid": CardGridRender,
  cta: CTARender,
  faq: FAQRender,
  "rich-text": RichTextRender,
}

export default function BlockRenderer({ blocks }: { blocks: AnyBlock[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        const Render = RENDERERS[b.blockType]
        if (!Render) {
          if (process.env.NODE_ENV !== "production") {
            return <div key={i} className="p-4 text-xs text-red-600 bg-red-50">Unknown block: {b.blockType}</div>
          }
          return null
        }
        return <div key={(b.id as string) ?? i}>{Render(b)}</div>
      })}
    </>
  )
}
