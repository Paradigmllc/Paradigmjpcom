import type { Metadata } from "next"
import Link from "next/link"
import { Calendar, Clock, Mail } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { pageAlternates } from "@/lib/page-metadata"
import { buildPageSchema } from "@/lib/seo/schemas"
import {
  JAPAN_ENTRY_DESCRIPTION,
  JAPAN_ENTRY_TITLE,
  getJapanEntryApplicationJsonLd,
} from "@/lib/jsonld"
import { VIDEO_SERVICE_INTENT } from "@/lib/video-service-content"
import PageHero from "@/components/PageHero"
import { ContactForm } from "./ContactForm"
import { calendarUrlFor, getSiteSettings } from "@/lib/settings"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ intent?: string }>
}

function isVideoServiceIntent(intent?: string): boolean {
  return intent === VIDEO_SERVICE_INTENT
}

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { locale } = await params
  const { intent } = await searchParams
  const isVideoService = isVideoServiceIntent(intent)

  if (isVideoService) {
    const isJa = locale === "ja"
    return {
      title: isJa
        ? "Video as a Service 申込み"
        : "Apply for Video as a Service",
      description: isJa
        ? "希望プラン、月間需要、素材状況、最初に作りたい動画を送信してください。原則1営業日以内に適合可否と次の手順を回答します。"
        : "Submit your preferred plan, monthly demand, asset readiness, and first video need. We normally respond with fit and next steps within one business day.",
      alternates: pageAlternates(locale, "/contact"),
    }
  }

  const isJapanEntry = locale !== "ja"
  if (isJapanEntry) {
    return {
      title: `Apply for the ${JAPAN_ENTRY_TITLE}`,
      description: JAPAN_ENTRY_DESCRIPTION,
      alternates: pageAlternates(locale, "/contact"),
      openGraph: {
        type: "website",
        url: `https://paradigmjp.com/${locale}/contact`,
        title: `Apply for the ${JAPAN_ENTRY_TITLE}`,
        description: JAPAN_ENTRY_DESCRIPTION,
        images: [
          {
            url: `/${locale}/opengraph-image`,
            width: 1200,
            height: 630,
            alt: `${JAPAN_ENTRY_TITLE} — application`,
          },
        ],
      },
    }
  }

  const t = await getTranslations({ locale, namespace: "contactPage" })
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: pageAlternates(locale, "/contact"),
  }
}

export default async function ContactPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { intent } = await searchParams
  const t = await getTranslations({ locale, namespace: "contactPage" })
  const isJapanese = locale === "ja"
  const isVideoService = isVideoServiceIntent(intent)
  const isJapanEntry = !isVideoService && locale !== "ja"

  const videoCopy = isJapanese
    ? {
        badge: "VIDEO AS A SERVICE · APPLICATION",
        title: "継続的な動画制作を、明確なプランで開始する。",
        highlight: "明確なプラン",
        desc: "希望プラン、月間需要、素材状況、希望開始時期、最初に作りたい動画を送信してください。申請だけでは契約は成立せず、適合確認後にService Orderを発行します。",
        aside:
          "原則1営業日以内に適合可否を回答。契約・初回決済・オンボーディング完了後、Ready依頼へ原則2営業日以内に着手します。",
        formEyebrow: "APPLICATION",
        formTitle: "制作需要と最初の依頼を確認",
        fixedLabel: "標準の取引条件",
        fixedItems: [
          "Essential $1,500 / Unlimited $3,500 / Priority $5,500",
          "月額前払い・月単位の自動更新",
          "Ready後、標準依頼へ原則2営業日以内に着手",
          "解約・ダウングレードは次回更新日から適用",
        ],
        fitLabel: "申請前に準備するもの",
        fitItems: [
          "会社・サービスURL",
          "希望プランと月間本数感",
          "ブランド資料・素材の準備状況",
          "最終承認者と最初に作りたい動画",
        ],
        back: "← Video as a Serviceへ戻る",
      }
    : {
        badge: "VIDEO AS A SERVICE · APPLICATION",
        title: "Start recurring video production with a clear plan.",
        highlight: "clear plan",
        desc: "Submit your preferred plan, monthly demand, asset readiness, desired start, and first video need. An application does not create a contract; we issue a Service Order after fit review.",
        aside:
          "We normally respond within one business day. After agreement, first payment, and onboarding, standard Ready requests normally begin within two business days.",
        formEyebrow: "APPLICATION",
        formTitle: "Confirm your production demand and first request",
        fixedLabel: "Standard commercial terms",
        fixedItems: [
          "Essential $1,500 / Unlimited $3,500 / Priority $5,500",
          "Monthly prepaid billing and automatic renewal",
          "Standard Ready requests normally start within two business days",
          "Cancellation and downgrade take effect on the next renewal date",
        ],
        fitLabel: "Prepare before applying",
        fitItems: [
          "Company or product URL",
          "Preferred plan and monthly demand",
          "Brand guidance and asset readiness",
          "Final approver and first video need",
        ],
        back: "← Back to Video as a Service",
      }

  const entryCopy = {
    badge: "JAPAN COUNTRY PARTNER",
    title: "Apply for a Japan partnership.",
    highlight: "Japan partnership.",
    desc: "$15,000 fixed setup. Wise, bank transfer, USDC, or credit card. If the agreed setup is not delivered within 14 business days from the recorded Start Date, the full setup fee is refunded.",
    aside:
      "Built for companies that can decide this week and launch with one accountable owner.",
    formEyebrow: "APPLICATION",
    formTitle: "Confirm your fit and launch timing",
    fixedLabel: "Fixed commercial terms",
    fixedItems: [
      "$15,000 setup paid before kickoff",
      "Payment: Wise, bank transfer, USDC, or credit card",
      "Full setup-fee refund if agreed setup is not delivered within 14 business days from the Start Date",
      "Selected partners receive the first six months of operation under the signed offer",
    ],
    fitLabel: "Fast-decision qualification",
    fitItems: [
      "Final approval within seven days",
      "One internal launch owner",
      "Required assets within 48 hours",
      "A near-term Japan launch",
    ],
    back: "← Back to Japan Country Partner",
  }

  const heroCopy = isVideoService
    ? videoCopy
    : isJapanEntry
      ? entryCopy
      : {
          badge: t("heroBadge"),
          title: t("heroTitle"),
          highlight: t("heroHighlight"),
          desc: t("heroDesc"),
          aside: undefined,
          formEyebrow: t("formEyebrow"),
          formTitle: t("formTitle"),
          fixedLabel: t("consultLabel"),
          fixedItems: t.raw("consultItems") as string[],
          fitLabel: t("contactLabel"),
          fitItems: t.raw("contactItems") as string[],
          back: "",
        }

  const sidebarBlocks = [
    {
      icon: Calendar,
      gradient: "from-zinc-950 via-zinc-800 to-blue-700",
      label: heroCopy.fixedLabel,
      items: heroCopy.fixedItems,
    },
    {
      icon: Mail,
      gradient: "from-zinc-900 via-blue-800 to-emerald-700",
      label: heroCopy.fitLabel,
      items: heroCopy.fitItems,
    },
  ]

  const settings = await getSiteSettings(locale)
  const bookingUrl = calendarUrlFor(settings, locale)
  const nextSteps = isVideoService
    ? isJapanese
      ? [
          {
            title: "適合確認",
            body: "会社、需要、希望プラン、制作範囲、素材状況を確認し、原則1営業日以内に回答します。",
          },
          {
            title: "Service Orderと初回決済",
            body: "プラン、請求日、対象ブランド、除外事項、承認者を文書化し、初月料金を前払いします。",
          },
          {
            title: "オンボーディングとReady",
            body: "共有ワークスペースへ素材と最初のブリーフを登録し、Ready後に制作キューを開始します。",
          },
        ]
      : [
          {
            title: "Fit review",
            body: "We review the company, demand, preferred plan, scope, and asset readiness, normally within one business day.",
          },
          {
            title: "Service Order and first payment",
            body: "We document the plan, billing date, brands, exclusions, and approver, then collect the first month in advance.",
          },
          {
            title: "Onboarding and Ready",
            body: "Add the assets and first brief to the shared workspace. Production begins through the Ready queue.",
          },
        ]
    : isJapanEntry
      ? [
          {
            title: "Fit review",
            body: "We confirm the company, product, authority, timing, and required public information.",
          },
          {
            title: "Fix the written scope",
            body: "The $15,000 scope, dependencies, third-party costs, and exclusions are documented before payment.",
          },
          {
            title: "Start and deliver",
            body: "The Start Date is recorded after payment, inputs, access, and approver are complete, activating the signed delivery terms.",
          },
        ]
      : []

  const pageTitle = heroCopy.title
  const pageDescription = heroCopy.desc

  return (
    <>
      <PageHero
        badge={heroCopy.badge}
        title={heroCopy.title}
        highlight={heroCopy.highlight}
        desc={heroCopy.desc}
        asideText={heroCopy.aside}
        asideCta={
          isVideoService
            ? {
                label: isJapanese ? "料金・利用条件を確認" : "Review plans and terms",
                href: "/video-as-a-service#pricing",
              }
            : isJapanEntry
              ? {
                  label: "Review Japan Country Partner",
                  href: "/japan-market-partner",
                }
              : undefined
        }
      />

      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8 grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
          <div className="lg:col-span-3 paradigm-glass rounded-lg p-6 md:p-8 paradigm-glow-md">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">
              {heroCopy.formEyebrow}
            </p>
            <h2 className="font-display text-[22px] md:text-[28px] leading-[1.2] text-paradigm-ink mb-7">
              {heroCopy.formTitle}
            </h2>
            {(isVideoService || isJapanEntry) && (
              <Link
                href={
                  isVideoService
                    ? `/${locale}/video-as-a-service`
                    : `/${locale}/japan-market-partner`
                }
                className="mb-6 inline-flex min-h-11 items-center text-sm font-semibold text-paradigm-accent underline decoration-paradigm-accent/40 underline-offset-4 transition-colors hover:text-paradigm-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-paradigm-accent"
              >
                {heroCopy.back}
              </Link>
            )}
            <ContactForm />
          </div>

          <aside className="lg:col-span-2 space-y-4">
            {sidebarBlocks.map((block) => {
              const Icon = block.icon
              return (
                <div
                  key={block.label}
                  className="paradigm-glass rounded-lg p-6 paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500"
                >
                  <div
                    className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${block.gradient} text-paradigm-paper mb-3 paradigm-glow-sm`}
                  >
                    <Icon aria-hidden="true" size={18} strokeWidth={1.5} />
                  </div>
                  <p className="paradigm-eyebrow text-paradigm-accent mb-3">
                    {block.label}
                  </p>
                  <ul className="space-y-2 text-[13px] text-paradigm-ink-soft leading-[1.75]">
                    {block.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )
            })}

            {!isVideoService && !isJapanEntry && bookingUrl && (
              <div className="paradigm-glass rounded-lg p-6 paradigm-glow-md border border-paradigm-accent/30">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-paradigm-glow via-paradigm-accent to-paradigm-accent text-paradigm-paper mb-3 paradigm-glow-sm">
                  <Clock aria-hidden="true" size={18} strokeWidth={1.5} />
                </div>
                <p className="paradigm-eyebrow text-paradigm-accent mb-3">
                  {t("hurryLabel")}
                </p>
                <p className="text-[13px] text-paradigm-ink-soft leading-[1.75] mb-4">
                  {t("hurryDesc")}
                </p>
                <a
                  href={bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full justify-center items-center gap-2 bg-paradigm-ink text-paradigm-paper rounded-lg py-3 text-[12px] tracking-[0.14em] uppercase font-semibold hover:bg-paradigm-accent transition-colors"
                >
                  {t("hurryButton")}
                </a>
              </div>
            )}
          </aside>
        </div>
      </section>

      {nextSteps.length > 0 && (
        <section
          className="relative overflow-hidden bg-paradigm-paper-deep paradigm-section"
          aria-labelledby="application-next-title"
        >
          <div className="relative z-10 mx-auto max-w-5xl px-6 md:px-8">
            <div className="mb-8 max-w-3xl">
              <p className="paradigm-eyebrow mb-3 text-paradigm-accent">
                {isJapanese ? "NEXT STEPS" : "NEXT STEPS"}
              </p>
              <h2
                id="application-next-title"
                className="font-display text-[24px] leading-[1.15] text-paradigm-ink md:text-[36px]"
              >
                {isVideoService
                  ? isJapanese
                    ? "申請後、制作開始まで"
                    : "From application to production"
                  : "From application to Japan execution"}
              </h2>
            </div>
            <ol className="grid gap-4 md:grid-cols-3">
              {nextSteps.map((step, index) => (
                <li
                  key={step.title}
                  className="rounded-lg border border-paradigm-line bg-paradigm-paper p-6 paradigm-glow-sm"
                >
                  <span className="font-display text-[28px] text-paradigm-accent">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-4 font-display text-[18px] text-paradigm-ink">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-[13px] leading-[1.8] text-paradigm-ink-soft">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            isJapanEntry
              ? getJapanEntryApplicationJsonLd()
              : buildPageSchema({
                  type: "ContactPage",
                  title: pageTitle,
                  description: pageDescription,
                  url: `https://paradigmjp.com/${locale}/contact`,
                  locale,
                }),
          ),
        }}
      />
    </>
  )
}
