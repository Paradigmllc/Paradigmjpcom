import type { ReactNode } from "react"
import { ArrowUpRight, CircleAlert, Scale, Swords, TrendingUp } from "lucide-react"
import { JAPAN_ENTRY_MARKET_EVIDENCE } from "@/lib/japan-entry-market-evidence"
import type { OpportunityBriefData } from "@/lib/sales/opportunity-brief"

export function OpportunityPressureSummary({ data, locale }: { data: OpportunityBriefData; locale: string }) {
  const isJa = locale === "ja"
  const competitor = data.competition.competitors[0]
  const demand = data.demandSignals[0]
  const hasCommerceGap = data.findings.some((finding) => finding.id === "commerce-disclosure" && finding.status === "gap")
  const hasPrivacyGap = data.findings.some((finding) => finding.id === "privacy" && finding.status === "gap")

  return (
    <section className="border-y border-red-900/40 bg-zinc-950 px-5 py-14 text-white sm:py-20" aria-labelledby="opportunity-pressure-title">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-300">Opportunity pressure × regulatory pressure</p>
        <h2 id="opportunity-pressure-title" className="mt-4 max-w-4xl text-3xl font-semibold tracking-tight sm:text-5xl">
          {isJa ? "待つコストと、急いで誤るコストを同時に見る" : "Price the cost of waiting—and the cost of getting Japan wrong."}
        </h2>
        <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-300">
          {isJa
            ? "競合・需要・規制の根拠を同じ画面で確認します。未確認の人気や違反を断定せず、確認できた事実だけで意思決定圧力を組み立てます。"
            : "Competitor, demand and regulatory evidence belong in the same decision. We do not invent popularity or declare a breach; pressure comes only from source-backed facts and clearly labeled gaps."}
        </p>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <PressureCard icon={<Swords size={18} aria-hidden />} eyebrow="Verified competitor" title={competitor?.name ?? (isJa ? "競合企業は未検証" : "Named competitor not verified")}>
            {competitor ? (
              <>
                <p>{competitor.summary}</p>
                <a href={competitor.evidence[0]?.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs text-red-200 underline underline-offset-4">Public source <ArrowUpRight size={12} aria-hidden /></a>
              </>
            ) : <p>{isJa ? "カテゴリ類似から競合名を推測しません。" : "We do not infer a competitor from category similarity alone."}</p>}
          </PressureCard>

          <PressureCard icon={<TrendingUp size={18} aria-hidden />} eyebrow="Japan demand" title={demand?.label ?? JAPAN_ENTRY_MARKET_EVIDENCE.ecommerce.value}>
            <p>{demand?.statement ?? JAPAN_ENTRY_MARKET_EVIDENCE.ecommerce.detail}</p>
            <a href={demand?.sourceUrl ?? JAPAN_ENTRY_MARKET_EVIDENCE.ecommerce.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs text-red-200 underline underline-offset-4">Public source <ArrowUpRight size={12} aria-hidden /></a>
            {!demand && <p className="mt-3 text-xs text-zinc-500">Product-specific popularity remains unverified; the displayed figure is market context only.</p>}
          </PressureCard>

          <PressureCard icon={<CircleAlert size={18} aria-hidden />} eyebrow="Enforcement exposure" title={hasCommerceGap ? "Commercial disclosure gap to scope" : "Commercial applicability to confirm"}>
            <p>{JAPAN_ENTRY_MARKET_EVIDENCE.commerceEnforcement.detail}</p>
            <a href={JAPAN_ENTRY_MARKET_EVIDENCE.commerceEnforcement.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs text-red-200 underline underline-offset-4">Consumer Affairs Agency <ArrowUpRight size={12} aria-hidden /></a>
          </PressureCard>

          <PressureCard icon={<Scale size={18} aria-hidden />} eyebrow="Changing requirements" title={hasPrivacyGap ? "Privacy readiness gap to scope" : "APPI review remains relevant"}>
            <p>{JAPAN_ENTRY_MARKET_EVIDENCE.privacyReview.detail}</p>
            <a href={JAPAN_ENTRY_MARKET_EVIDENCE.privacyReview.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs text-red-200 underline underline-offset-4">Privacy regulator <ArrowUpRight size={12} aria-hidden /></a>
          </PressureCard>
        </div>
        <p className="mt-6 text-xs leading-5 text-zinc-500">This screening does not establish that the company is in breach and is not legal advice. Exact applicability requires scoped professional review.</p>
      </div>
    </section>
  )
}

function PressureCard({ icon, eyebrow, title, children }: { icon: ReactNode; eyebrow: string; title: string; children: ReactNode }) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-red-300">{icon}{eyebrow}</p>
      <h3 className="mt-4 text-xl font-semibold">{title}</h3>
      <div className="mt-3 text-sm leading-7 text-zinc-300">{children}</div>
    </article>
  )
}
