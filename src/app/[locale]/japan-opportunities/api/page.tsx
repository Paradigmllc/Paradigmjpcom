import type { Metadata } from "next"
import { ArrowRight, CheckCircle2, Code2, Coins, Database, ExternalLink, Network } from "lucide-react"
import { Link } from "@/i18n/routing"
import { getContentApiCopy } from "@/lib/content-commerce/copy"
import { listPremiumProducts, normalizeContentLocale, type ContentCatalogItem } from "@/lib/content-commerce/catalog"
import { resolveX402Configuration } from "@/lib/content-commerce/x402"
import { pageAlternates } from "@/lib/page-metadata"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale } = await params
  const locale = normalizeContentLocale(rawLocale)
  return {
    title: locale === "ja" ? "Content API・x402 | Paradigm" : "Content API and x402 | Paradigm",
    description: locale === "ja"
      ? "日本市場コンテンツを無料APIとx402従量課金で提供するParadigm Content Commerce。"
      : "Paradigm Content Commerce: public Japan market content APIs and x402 pay-per-request decision packets.",
    alternates: pageAlternates(locale, "/japan-opportunities/api"),
  }
}

const ENDPOINTS = [
  { method: "GET", path: "/api/v1/content?locale=en", note: "Free catalog" },
  { method: "GET", path: "/api/v1/investor-briefs", note: "Investor brief catalog" },
  { method: "GET", path: "/api/v1/investor-briefs/{slug}", note: "Free JSON / Markdown" },
  { method: "GET", path: "/api/v1/investor-briefs/compare?left={slug}&right={slug}", note: "Dynamic A/B comparison" },
  { method: "GET", path: "/api/v1/investor-briefs/factory", note: "pSEO scale and quality manifest" },
  { method: "GET", path: "/api/v1/content/public/{slug}?locale=en", note: "Free JSON / Markdown" },
  { method: "GET", path: "/api/v1/content/premium/{slug}?locale=en", note: "x402 / USDC" },
] as const

function ProductCatalog({ products, error, locale }: { products: ContentCatalogItem[]; error: string | null; locale: "ja" | "en" }) {
  const copy = getContentApiCopy(locale)
  if (error) {
    return <div className="rounded-2xl border border-red-300/60 bg-red-50 p-6 text-sm leading-7 text-red-800">{copy.catalogError}</div>
  }
  if (products.length === 0) {
    return <div className="rounded-2xl border border-dashed border-paradigm-line bg-paradigm-paper-deep/40 p-8 text-sm text-paradigm-ink-soft">{copy.catalogEmpty}</div>
  }
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {products.map((product) => (
        <article key={`${product.locale}-${product.slug}`} className="rounded-3xl border border-paradigm-line bg-paradigm-paper-card/80 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="rounded-full bg-paradigm-ink px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-paradigm-paper">{product.contentType}</span>
            <span className="font-mono text-xs font-semibold text-paradigm-accent">{product.price?.amount ?? "0"} USDC</span>
          </div>
          <h3 className="mt-6 font-display text-2xl font-semibold tracking-[-0.025em] text-paradigm-ink">{product.title}</h3>
          <p className="mt-3 text-sm leading-7 text-paradigm-ink-soft">{product.summary}</p>
          <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-paradigm-line pt-5 text-xs">
            <div><dt className="text-paradigm-ink-soft">Network</dt><dd className="mt-1 font-mono text-paradigm-ink">{product.network}</dd></div>
            <div><dt className="text-paradigm-ink-soft">Version</dt><dd className="mt-1 font-mono text-paradigm-ink">v{product.version}</dd></div>
          </dl>
          <code className="mt-5 block break-all rounded-xl bg-paradigm-ink p-3 text-[11px] leading-5 text-paradigm-paper/80">{product.endpoint}</code>
        </article>
      ))}
    </div>
  )
}

export default async function ContentApiPage({ params }: Props) {
  const { locale: rawLocale } = await params
  const locale = normalizeContentLocale(rawLocale)
  const copy = getContentApiCopy(locale)
  const x402 = resolveX402Configuration()
  let products: ContentCatalogItem[] = []
  let catalogError: string | null = null
  try {
    products = await listPremiumProducts(locale)
  } catch (error) {
    console.error("[content-api-page] premium catalog failed:", error)
    catalogError = error instanceof Error ? error.message : String(error)
  }

  return (
    <main className="overflow-hidden bg-paradigm-paper">
      <section className="relative px-6 pb-24 pt-36 md:px-10 md:pb-32 md:pt-44">
        <div className="absolute inset-0 paradigm-grid opacity-45" />
        <div className="absolute right-[-8rem] top-20 h-96 w-96 rounded-full bg-paradigm-accent/15 blur-3xl" />
        <div className="relative mx-auto max-w-6xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-paradigm-line bg-paradigm-paper-card/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-paradigm-ink-soft">
            <span className={`h-2 w-2 rounded-full ${x402.ok ? "bg-emerald-500" : "bg-amber-500"}`} />
            {x402.ok ? copy.statusReady : copy.statusPending}
          </div>
          <p className="paradigm-eyebrow mt-8 text-paradigm-accent">{copy.eyebrow}</p>
          <h1 className="mt-6 max-w-5xl font-display text-5xl font-semibold leading-[0.98] tracking-[-0.045em] text-paradigm-ink sm:text-6xl lg:text-8xl">
            {copy.title}<br /><span className="text-paradigm-accent">{copy.highlight}</span>
          </h1>
          <p className="mt-7 max-w-3xl text-sm leading-7 text-paradigm-ink-soft md:text-base">{copy.description}</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a href={`/api/v1/content?locale=${locale}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-paradigm-ink px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-paradigm-paper transition hover:bg-paradigm-accent">
              {copy.catalogCta}<ExternalLink size={15} />
            </a>
            <Link href="/japan-opportunities/enter-and-operate-japan#inquiry" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-paradigm-line bg-paradigm-paper-card px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-paradigm-ink transition hover:border-paradigm-accent">
              {copy.inquiryCta}<ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-paradigm-line bg-paradigm-paper-deep/40 px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <h2 className="font-display text-4xl font-semibold tracking-[-0.03em] text-paradigm-ink md:text-5xl">{copy.modelTitle}</h2>
            <p className="mt-4 text-sm leading-7 text-paradigm-ink-soft">{copy.modelDescription}</p>
          </div>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {copy.tiers.map((tier, index) => {
              const Icon = index === 0 ? Code2 : index === 1 ? Coins : Database
              return (
                <article key={tier.label} className="rounded-3xl border border-paradigm-line bg-paradigm-paper-card/80 p-7">
                  <div className="flex items-center justify-between"><span className="paradigm-eyebrow text-paradigm-accent">{tier.label}</span><Icon size={20} className="text-paradigm-accent" /></div>
                  <h3 className="mt-5 font-display text-2xl font-semibold text-paradigm-ink">{tier.title}</h3>
                  <p className="mt-2 font-mono text-sm font-semibold text-paradigm-accent">{tier.price}</p>
                  <p className="mt-4 text-sm leading-7 text-paradigm-ink-soft">{tier.description}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="paradigm-section px-6 md:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <h2 className="font-display text-4xl font-semibold tracking-[-0.03em] text-paradigm-ink md:text-5xl">{copy.endpointsTitle}</h2>
            <p className="mt-4 text-sm leading-7 text-paradigm-ink-soft">{copy.endpointsDescription}</p>
          </div>
          <div className="mt-10 overflow-hidden rounded-3xl border border-paradigm-line bg-paradigm-ink text-paradigm-paper">
            {ENDPOINTS.map((endpoint) => (
              <div key={endpoint.path} className="grid gap-2 border-b border-white/10 px-6 py-5 last:border-0 md:grid-cols-[4rem_1fr_auto] md:items-center md:px-8">
                <span className="font-mono text-xs font-bold text-paradigm-accent-soft">{endpoint.method}</span>
                <code className="overflow-x-auto text-xs text-white/85">{endpoint.path}</code>
                <span className="text-xs text-white/55">{endpoint.note}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-paradigm-line bg-paradigm-paper-deep/40 px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <h2 className="font-display text-4xl font-semibold tracking-[-0.03em] text-paradigm-ink md:text-5xl">{copy.catalogTitle}</h2>
            <p className="mt-4 text-sm leading-7 text-paradigm-ink-soft">{copy.catalogDescription}</p>
          </div>
          <div className="mt-10"><ProductCatalog products={products} error={catalogError} locale={locale} /></div>
        </div>
      </section>

      <section className="paradigm-section px-6 md:px-10">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <Network className="text-paradigm-accent" size={28} />
            <h2 className="mt-6 font-display text-4xl font-semibold tracking-[-0.03em] text-paradigm-ink md:text-5xl">{copy.flowTitle}</h2>
            <p className="mt-5 text-sm leading-7 text-paradigm-ink-soft">{copy.flowDescription}</p>
            <a href="https://docs.cdp.coinbase.com/x402/welcome" target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-paradigm-accent underline-offset-4 hover:underline">
              {copy.docsLink}<ExternalLink size={15} />
            </a>
          </div>
          <ol className="grid gap-4 sm:grid-cols-2">
            {copy.flow.map((item) => (
              <li key={item.step} className="rounded-3xl border border-paradigm-line bg-paradigm-paper-card/80 p-6">
                <span className="font-mono text-xs font-bold text-paradigm-accent">{item.step}</span>
                <h3 className="mt-4 font-display text-xl font-semibold text-paradigm-ink">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-paradigm-ink-soft">{item.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-paradigm-line px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-6xl rounded-[2rem] bg-paradigm-ink p-8 text-paradigm-paper md:p-12">
          <h2 className="font-display text-3xl font-semibold tracking-[-0.03em] md:text-4xl">{copy.principlesTitle}</h2>
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {copy.principles.map((principle) => <li key={principle} className="flex items-start gap-3 text-sm leading-7 text-white/75"><CheckCircle2 className="mt-1 shrink-0 text-paradigm-accent-soft" size={17} />{principle}</li>)}
          </ul>
        </div>
      </section>
    </main>
  )
}
