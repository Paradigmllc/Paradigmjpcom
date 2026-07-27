import type { Metadata } from "next"
import {
  CheckCircle2,
  CircleDollarSign,
  Globe2,
  Headphones,
  Languages,
  LayoutTemplate,
  Store,
  Workflow,
} from "lucide-react"
import { notFound } from "next/navigation"
import FadeIn from "@/components/aesop/FadeIn"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import JapanEntryJourney from "@/components/japan-entry/JapanEntryJourney"
import JapanEntryTrustPanel from "@/components/japan-entry/JapanEntryTrustPanel"
import { JapanMarketUrgency } from "@/components/japan-entry/JapanMarketUrgency"
import { pageAlternates } from "@/lib/page-metadata"

export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (locale !== "en") return {}

  return {
    title: "Japan Market Partner | Outsourced Japan Execution Team",
    description:
      "Paradigm becomes your outsourced Japan team for localization, sales channels, Japanese customer support, local operations, and market execution. Start with a fixed $13,000 Japan Market Setup.",
    alternates: pageAlternates("en", "/japan-market-partner"),
    openGraph: {
      type: "website",
      url: "https://paradigmjp.com/en/japan-market-partner",
      title: "Japan Market Partner | Paradigm LLC",
      description:
        "A Japan-based execution partner for localization, launch delivery, sales channels, support, and ongoing market operations.",
    },
  }
}

const WORKSTREAMS = [
  {
    icon: Languages,
    title: "Localization and buyer path",
    body: "Adapt the offer, trust information, calls to action, support expectations, and core pages for a Japanese buyer journey.",
  },
  {
    icon: LayoutTemplate,
    title: "Japan-facing web route",
    body: "Build or localize the agreed LP, website, forms, metadata, analytics baseline, and handover documentation.",
  },
  {
    icon: Store,
    title: "Sales-channel setup",
    body: "Coordinate eligible Shopify, marketplace, inquiry, partner, or payment routes within the written scope and provider constraints.",
  },
  {
    icon: Headphones,
    title: "Japanese support layer",
    body: "Prepare customer-facing responses, FAQs, escalation rules, and the agreed ongoing support workflow.",
  },
  {
    icon: Workflow,
    title: "Local operations",
    body: "Keep owners, approvals, content, vendors, dependencies, launch tasks, and next actions visible in one operating workspace.",
  },
  {
    icon: Globe2,
    title: "Market execution",
    body: "Turn a Japan opportunity into an agreed launch route and a practical operating system instead of stopping at a strategy deck.",
  },
] as const

const SETUP_FEATURES = [
  "14-business-day delivery guarantee from the recorded Start Date",
  "Japan opportunity and public-signal analysis",
  "Localized LP / HP and Japanese buyer path",
  "Initial launch creative and priority channel setup",
  "Trust, disclosure, and regulatory applicability screening",
  "Payment or inquiry routing coordination where eligible",
  "Operating workspace, owners, acceptance criteria, and handover",
] as const

export default async function JapanMarketPartnerPage({ params }: Props) {
  const { locale } = await params
  if (locale !== "en") notFound()

  return (
    <>
      <PageHero
        badge="JAPAN MARKET PARTNER"
        title="Your outsourced Japan team, from setup to operation."
        highlight="outsourced Japan team"
        desc="Paradigm takes responsibility for the agreed Japan execution layer: localization, sales channels, Japanese customer support, local operations, launch assets, and market delivery. The initial paid engagement is Japan Market Setup."
        asideText="Built for overseas e-commerce, SaaS, Web3, and online businesses that can make decisions quickly and provide launch inputs without a long procurement cycle."
        asideCta={{
          label: "Apply for a Japan Partnership — $13K",
          href: "/contact?intent=japan-entry",
        }}
      />

      <JapanMarketUrgency source="japan-market-partner" />

      <section className="bg-paradigm-paper paradigm-section" aria-labelledby="workstreams-heading">
        <div className="mx-auto max-w-[1180px] px-5 md:px-8 lg:px-10">
          <FadeIn className="mb-10 max-w-3xl">
            <p className="paradigm-eyebrow mb-3 text-paradigm-accent">THE COUNTRY PARTNER MODEL</p>
            <h2 id="workstreams-heading" className="font-display text-[28px] leading-[1.12] text-paradigm-ink md:text-[44px]">
              One accountable Japan-based execution layer.
            </h2>
            <p className="mt-5 text-[14px] leading-[1.9] text-paradigm-ink-soft md:text-[16px]">
              Japan Market Partner is not a list of disconnected consulting deliverables. Paradigm owns the agreed workstreams, dependencies, and handover needed to create a usable Japan-facing route.
            </p>
          </FadeIn>

          <div className="grid gap-px overflow-hidden border border-paradigm-line bg-paradigm-line md:grid-cols-2 lg:grid-cols-3">
            {WORKSTREAMS.map((item, index) => {
              const Icon = item.icon
              return (
                <FadeIn key={item.title} delay={index * 0.04} className="bg-paradigm-paper-deep p-6 md:p-7">
                  <Icon size={23} aria-hidden className="text-paradigm-accent" />
                  <h3 className="mt-5 font-display text-[20px] leading-[1.2] text-paradigm-ink">{item.title}</h3>
                  <p className="mt-4 text-[13px] leading-[1.8] text-paradigm-ink-soft">{item.body}</p>
                </FadeIn>
              )
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-paradigm-line bg-paradigm-paper-deep paradigm-section" aria-labelledby="setup-heading">
        <div className="mx-auto grid max-w-[1180px] gap-8 px-5 md:grid-cols-[0.8fr_1.2fr] md:px-8 lg:px-10">
          <FadeIn className="border border-paradigm-accent bg-paradigm-ink p-7 text-paradigm-paper paradigm-glow-md md:p-9">
            <div className="flex items-center justify-between gap-4">
              <p className="paradigm-eyebrow text-paradigm-paper/60">INITIAL ENGAGEMENT</p>
              <CircleDollarSign size={25} aria-hidden className="text-paradigm-glow" />
            </div>
            <h2 id="setup-heading" className="mt-8 font-display text-[30px] leading-[1.08] md:text-[42px]">Japan Market Setup</h2>
            <p className="mt-5 font-display text-[42px] leading-none text-paradigm-glow md:text-[58px]">$13,000</p>
            <p className="mt-4 text-[13px] leading-[1.8] text-paradigm-paper/72">
              One-time fixed setup. Final inclusions, exclusions, dependencies, required inputs, payment rail, acceptance criteria, and the recorded Start Date are confirmed in writing before kickoff.
            </p>
          </FadeIn>

          <FadeIn delay={0.08} className="border border-paradigm-line bg-paradigm-paper p-7 md:p-9">
            <p className="paradigm-eyebrow mb-5 text-paradigm-accent">SETUP SCOPE</p>
            <ul className="grid gap-4 sm:grid-cols-2">
              {SETUP_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-[13px] leading-[1.75] text-paradigm-ink-soft">
                  <CheckCircle2 size={17} aria-hidden className="mt-0.5 shrink-0 text-paradigm-accent" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 border-t border-paradigm-line pt-6">
              <h3 className="font-display text-[20px] text-paradigm-ink">Selected launch-partner operating period</h3>
              <p className="mt-3 text-[13px] leading-[1.85] text-paradigm-ink-soft">
                The standard managed-operation layer is $2,000/month. For selected launch partners, $2,000/month × 6 months = $12,000 of managed-operation value is included at no additional monthly fee. Month 7 onward is $2,000/month under the signed terms.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      <JapanEntryJourney locale="en" />
      <JapanEntryTrustPanel locale="en" />

      <section className="bg-paradigm-paper paradigm-section" aria-labelledby="boundaries-heading">
        <div className="mx-auto max-w-[920px] px-5 md:px-8">
          <FadeIn>
            <p className="paradigm-eyebrow mb-3 text-paradigm-accent">COMMERCIAL BOUNDARIES</p>
            <h2 id="boundaries-heading" className="font-display text-[28px] leading-[1.12] text-paradigm-ink md:text-[42px]">
              Clear scope protects both the launch and the relationship.
            </h2>
            <p className="mt-5 text-[14px] leading-[1.9] text-paradigm-ink-soft md:text-[16px]">
              Paradigm does not silently bundle formal legal, tax, banking, licensing, incorporation, logistics, warehousing, full customer-support staffing, paid media budget, guaranteed sales, or unbounded development. Specialist, third-party, and out-of-scope work requires separate written approval.
            </p>
          </FadeIn>
        </div>
      </section>

      <RichCtaBand
        eyebrow="FIT REVIEW"
        title="Apply when your company can decide and launch."
        highlight="decide and launch"
        desc="Share your company, offer, decision authority, target timing, current Japan context, and known dependencies. We will confirm whether the fixed Japan Market Setup is a fit before any contract or payment instruction is issued."
        buttonLabel="Apply for a Japan Partnership — $13K"
        buttonHref="/contact?intent=japan-entry"
        bullets={[
          "$13,000 fixed initial setup",
          "14-business-day delivery guarantee from the recorded Start Date",
          "Application submission does not itself create a contract",
        ]}
        analyticsSource="japan-market-partner"
      />
    </>
  )
}
