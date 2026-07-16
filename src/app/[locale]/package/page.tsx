/**
 * /[locale]/package — detailed Japan Entry deliverables and operating boundaries.
 *
 * International locales intentionally use the maintained English package copy.
 * The Japanese domestic site redirects to /ja/services so the Japan Entry offer
 * does not appear as a domestic package.
 */
import type { Metadata } from "next"
import { permanentRedirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { ArrowRight, Check, Clock3, FileCheck2, ShieldCheck, WalletCards } from "lucide-react"
import { Link } from "@/i18n/routing"
import { assertLocale } from "@/lib/cms/filters"
import { pageAlternates } from "@/lib/page-metadata"
import { INTERNATIONAL_REPORT_LOCALES } from "@/i18n/locales"
import PageHero from "@/components/PageHero"
import FadeIn from "@/components/aesop/FadeIn"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import JapanEntryJourney from "@/components/japan-entry/JapanEntryJourney"
import JapanEntryVisualProof from "@/components/japan-entry/JapanEntryVisualProof"
import { JapanMarketUrgency } from "@/components/japan-entry/JapanMarketUrgency"

const PACKAGE_LOCALES = ["en", ...INTERNATIONAL_REPORT_LOCALES] as const

type SummaryItem = { value: string; label: string }
type Workstream = { number: string; title: string; summary: string; deliverables: string[] }
type TimelineStep = { label: string; title: string; body: string }
type OperationItem = { title: string; body: string }
type CapacityItem = { label: string; value: string }
type AsyncPoint = { title: string; body: string }
type ContractStep = { label: string; title: string; body: string }
type CommercialItem = { label: string; value: string }

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params
  if (rawLocale === "ja") {
    return {
      title: "サービス | Paradigm合同会社",
      alternates: pageAlternates("ja", "/services", ["ja"]),
    }
  }
  const t = await getTranslations({ locale: "en", namespace: "packagePage" })
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: pageAlternates(rawLocale, "/package", PACKAGE_LOCALES),
  }
}

export default async function PackagePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params
  const locale = assertLocale(rawLocale)
  if (locale === "ja") permanentRedirect("/ja/services")

  const t = await getTranslations({ locale: "en", namespace: "packagePage" })
  const summary = t.raw("summary") as SummaryItem[]
  const workstreams = t.raw("workstreams") as Workstream[]
  const timeline = t.raw("timeline.steps") as TimelineStep[]
  const contractSteps = t.raw("contract.steps") as ContractStep[]
  const operations = t.raw("operations.items") as OperationItem[]
  const capacity = t.raw("operations.capacity") as CapacityItem[]
  const asyncPoints = t.raw("async.points") as AsyncPoint[]
  const commercial = t.raw("commercial.items") as CommercialItem[]
  const notIncluded = t.raw("notIncluded.items") as string[]

  return (
    <>
      <PageHero
        badge={t("heroBadge")}
        title={t("heroTitle")}
        highlight={t("heroHighlight")}
        desc={t("heroDesc")}
        asideText={t("includedDesc")}
        asideCta={{ label: t("ctaButton"), href: "/contact?intent=japan-entry" }}
      />

      <JapanMarketUrgency compact source="package" />

      <section className="border-b border-paradigm-line bg-paradigm-paper-deep px-5 py-8 sm:px-8 lg:px-12" aria-label={t("summaryLabel")}>
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-y divide-paradigm-line border border-paradigm-line bg-paradigm-paper md:grid-cols-4 md:divide-y-0">
          {summary.map((item) => (
            <div key={item.label} className="px-4 py-5 sm:px-6 sm:py-6">
              <p className="font-display text-2xl text-paradigm-ink sm:text-3xl">{item.value}</p>
              <p className="mt-2 text-[11px] leading-5 text-paradigm-ink-soft sm:text-xs">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="deliverables" className="relative overflow-hidden bg-paradigm-paper px-5 py-16 sm:px-8 sm:py-20 lg:px-12" aria-labelledby="deliverables-title">
        <div className="paradigm-mesh opacity-25" />
        <div className="relative z-10 mx-auto max-w-6xl">
          <FadeIn className="max-w-3xl">
            <p className="paradigm-eyebrow mb-3 text-paradigm-accent">{t("includedEyebrow")}</p>
            <h2 id="deliverables-title" className="font-display text-[28px] leading-[1.1] text-paradigm-ink md:text-[48px]">{t("includedTitle")}</h2>
            <p className="mt-5 text-[14px] leading-[1.85] text-paradigm-ink-soft md:text-[16px]">{t("includedDesc")}</p>
          </FadeIn>

          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {workstreams.map((stream, index) => (
              <FadeIn key={stream.number} delay={index * 0.04}>
                <article className="h-full rounded-lg border border-paradigm-line bg-paradigm-paper-deep p-6 transition-shadow hover:shadow-lg md:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-display text-3xl text-paradigm-accent">{stream.number}</span>
                    <span className="rounded-full border border-paradigm-line bg-paradigm-paper px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-paradigm-ink-mute">{t("includedBadge")}</span>
                  </div>
                  <h3 className="mt-5 font-display text-[22px] leading-[1.15] text-paradigm-ink">{stream.title}</h3>
                  <p className="mt-3 text-[13px] leading-[1.75] text-paradigm-ink-soft">{stream.summary}</p>
                  <ul className="mt-5 space-y-3 border-t border-paradigm-line/70 pt-5">
                    {stream.deliverables.map((deliverable) => (
                      <li key={deliverable} className="flex gap-3 text-[12px] leading-[1.7] text-paradigm-ink-soft">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                        <span>{deliverable}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-paradigm-line bg-paradigm-paper-deep px-5 py-16 sm:px-8 sm:py-20 lg:px-12" aria-labelledby="timeline-title">
        <div className="relative z-10 mx-auto max-w-6xl">
          <FadeIn className="max-w-3xl">
            <p className="paradigm-eyebrow mb-3 text-paradigm-accent">{t("timeline.eyebrow")}</p>
            <h2 id="timeline-title" className="font-display text-[28px] leading-[1.1] text-paradigm-ink md:text-[44px]">{t("timeline.title")}</h2>
            <p className="mt-5 text-[14px] leading-[1.85] text-paradigm-ink-soft">{t("timeline.desc")}</p>
          </FadeIn>
          <ol className="mt-10 grid gap-4 lg:grid-cols-5">
            {timeline.map((step, index) => (
              <FadeIn key={step.label} delay={index * 0.04} as="li" className="relative rounded-lg border border-paradigm-line bg-paradigm-paper p-5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-paradigm-ink text-xs font-semibold text-paradigm-paper">{index + 1}</span>
                <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-paradigm-accent">{step.label}</p>
                <h3 className="mt-2 font-display text-[18px] leading-[1.2] text-paradigm-ink">{step.title}</h3>
                <p className="mt-3 text-[12px] leading-[1.75] text-paradigm-ink-soft">{step.body}</p>
              </FadeIn>
            ))}
          </ol>
        </div>
      </section>

      <section className="relative overflow-hidden bg-paradigm-paper px-5 py-16 sm:px-8 sm:py-20 lg:px-12" aria-labelledby="contract-title">
        <div className="relative z-10 mx-auto max-w-6xl">
          <FadeIn className="max-w-3xl">
            <p className="paradigm-eyebrow mb-3 text-paradigm-accent">{t("contract.eyebrow")}</p>
            <h2 id="contract-title" className="font-display text-[28px] leading-[1.1] text-paradigm-ink md:text-[44px]">{t("contract.title")}</h2>
            <p className="mt-5 text-[14px] leading-[1.85] text-paradigm-ink-soft">{t("contract.desc")}</p>
          </FadeIn>
          <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {contractSteps.map((step, index) => (
              <FadeIn key={step.label} delay={index * 0.04} as="li" className="rounded-lg border border-paradigm-line bg-paradigm-paper-deep p-5">
                <span className="font-display text-3xl text-paradigm-accent">{step.label}</span>
                <h3 className="mt-5 font-display text-[18px] leading-[1.2] text-paradigm-ink">{step.title}</h3>
                <p className="mt-3 text-[12px] leading-[1.75] text-paradigm-ink-soft">{step.body}</p>
              </FadeIn>
            ))}
          </ol>
          <FadeIn className="mt-6 rounded-lg border border-paradigm-line bg-paradigm-paper-deep p-5 text-[13px] leading-[1.8] text-paradigm-ink-soft md:p-6">
            {t("contract.handover")}
          </FadeIn>
        </div>
      </section>

      <section className="relative overflow-hidden bg-paradigm-paper px-5 py-16 sm:px-8 sm:py-20 lg:px-12" aria-labelledby="operations-title">
        <div className="relative z-10 mx-auto max-w-6xl">
          <FadeIn className="max-w-3xl">
            <p className="paradigm-eyebrow mb-3 text-paradigm-accent">{t("operations.eyebrow")}</p>
            <h2 id="operations-title" className="font-display text-[28px] leading-[1.1] text-paradigm-ink md:text-[44px]">{t("operations.title")}</h2>
            <p className="mt-5 text-[14px] leading-[1.85] text-paradigm-ink-soft">{t("operations.desc")}</p>
          </FadeIn>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {operations.map((item, index) => {
              const Icon = [ShieldCheck, FileCheck2, WalletCards, Clock3, Check, ArrowRight][index] ?? Check
              return (
                <FadeIn key={item.title} delay={index * 0.04}>
                  <article className="h-full rounded-lg border border-paradigm-line bg-paradigm-paper-deep p-5">
                    <Icon className="h-5 w-5 text-paradigm-accent" aria-hidden />
                    <h3 className="mt-4 font-display text-[18px] text-paradigm-ink">{item.title}</h3>
                    <p className="mt-3 text-[13px] leading-[1.75] text-paradigm-ink-soft">{item.body}</p>
                  </article>
                </FadeIn>
              )
            })}
          </div>
          <FadeIn className="mt-8 rounded-lg border border-paradigm-line bg-paradigm-paper p-5 md:p-7">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="paradigm-eyebrow text-paradigm-accent">{t("operations.capacityEyebrow")}</p>
                <h3 className="mt-2 font-display text-[22px] leading-[1.15] text-paradigm-ink">{t("operations.capacityTitle")}</h3>
              </div>
              <p className="max-w-xl text-[12px] leading-[1.75] text-paradigm-ink-soft">{t("operations.capacityDesc")}</p>
            </div>
            <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {capacity.map((item) => (
                <div key={item.label} className="rounded-md border border-paradigm-line/70 bg-paradigm-paper-deep p-4">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-paradigm-ink-mute">{item.label}</dt>
                  <dd className="mt-2 font-display text-[20px] text-paradigm-ink">{item.value}</dd>
                </div>
              ))}
            </dl>
          </FadeIn>
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-paradigm-line bg-paradigm-paper-deep px-5 py-16 sm:px-8 sm:py-20 lg:px-12" aria-labelledby="async-title">
        <div className="relative z-10 mx-auto max-w-6xl">
          <FadeIn className="max-w-3xl">
            <p className="paradigm-eyebrow mb-3 text-paradigm-accent">{t("async.eyebrow")}</p>
            <h2 id="async-title" className="font-display text-[28px] leading-[1.1] text-paradigm-ink md:text-[44px]">{t("async.title")}</h2>
            <p className="mt-5 text-[14px] leading-[1.85] text-paradigm-ink-soft">{t("async.desc")}</p>
          </FadeIn>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {asyncPoints.map((point, index) => (
              <FadeIn key={point.title} delay={index * 0.04}>
                <article className="h-full rounded-lg border border-paradigm-line bg-paradigm-paper p-5 md:p-6">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paradigm-ink text-[10px] font-semibold text-paradigm-paper">{index + 1}</span>
                    <div>
                      <h3 className="font-display text-[19px] leading-[1.2] text-paradigm-ink">{point.title}</h3>
                      <p className="mt-3 text-[13px] leading-[1.75] text-paradigm-ink-soft">{point.body}</p>
                    </div>
                  </div>
                </article>
              </FadeIn>
            ))}
          </div>
          <FadeIn className="mt-6 rounded-lg border border-paradigm-accent/30 bg-paradigm-ink p-5 text-paradigm-paper md:p-6">
            <p className="text-[13px] leading-[1.8] text-paradigm-paper/80">{t("async.meetingPolicy")}</p>
          </FadeIn>
        </div>
      </section>

      <section className="relative overflow-hidden bg-paradigm-ink px-5 py-16 text-paradigm-paper sm:px-8 sm:py-20 lg:px-12" aria-labelledby="not-included-title">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(37,99,235,0.25),transparent_35%),radial-gradient(circle_at_85%_80%,rgba(16,185,129,0.16),transparent_30%)]" />
        <div className="relative z-10 mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <FadeIn className="max-w-xl">
            <p className="paradigm-eyebrow mb-3 text-emerald-300">{t("notIncluded.eyebrow")}</p>
            <h2 id="not-included-title" className="font-display text-[28px] leading-[1.1] md:text-[44px]">{t("notIncluded.title")}</h2>
            <p className="mt-5 text-[14px] leading-[1.85] text-paradigm-paper/70">{t("notIncluded.desc")}</p>
          </FadeIn>
          <ul className="grid gap-3 sm:grid-cols-2">
            {notIncluded.map((item) => (
              <li key={item} className="flex gap-3 rounded-lg border border-white/15 bg-white/[0.06] p-4 text-[13px] leading-[1.7] text-paradigm-paper/80">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-300" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="relative overflow-hidden bg-paradigm-paper-deep px-5 py-16 sm:px-8 sm:py-20 lg:px-12" aria-labelledby="commercial-title">
        <div className="relative z-10 mx-auto max-w-5xl">
          <FadeIn className="max-w-3xl">
            <p className="paradigm-eyebrow mb-3 text-paradigm-accent">{t("commercial.eyebrow")}</p>
            <h2 id="commercial-title" className="font-display text-[28px] leading-[1.1] text-paradigm-ink md:text-[44px]">{t("commercial.title")}</h2>
          </FadeIn>
          <FadeIn className="mt-10 overflow-hidden rounded-lg border border-paradigm-line bg-paradigm-paper">
            <dl>
              {commercial.map((item, index) => (
                <div key={item.label} className={`grid gap-2 px-5 py-5 md:grid-cols-[180px_1fr] md:px-7 ${index < commercial.length - 1 ? "border-b border-paradigm-line/70" : ""}`}>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-paradigm-accent">{item.label}</dt>
                  <dd className="text-[13px] leading-[1.75] text-paradigm-ink-soft">{item.value}</dd>
                </div>
              ))}
            </dl>
          </FadeIn>
        </div>
      </section>

      <JapanEntryJourney locale="en" />
      <JapanEntryVisualProof locale="en" />

      <RichCtaBand
        eyebrow={t("ctaEyebrow")}
        title={t("ctaTitle")}
        highlight={t("ctaHighlight")}
        desc={t("ctaDesc")}
        buttonLabel={t("ctaButton")}
        buttonHref="/contact?intent=japan-entry"
        analyticsSource="package-detail"
      />
    </>
  )
}
