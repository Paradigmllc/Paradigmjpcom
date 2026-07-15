/**
 * /[locale]/about — 会社概要・チーム・思想 (locale 別 metadata + section composition)
 *
 * 役割:   会社概要・チーム・思想 (locale 別 metadata + section composition)
 * 入力:   params.locale
 * 出力:   PageHero + content sections + RichCtaBand
 *
 * AE-PHP-2 (P18-D 2026-05-08): 全 visible text を messages/{locale}.json:aboutPage 経由に統一.
 *   旧 isJa ? "JP" : "EN" の二択 hardcode → 12 locale 対応 (next-intl getTranslations).
 * AE-PHP-4 準拠 (各 page.tsx に役割/入力/出力 を明示)。
 */
import type { Metadata } from "next"
import { Rocket, Handshake, Lightbulb, Users } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { pageAlternates } from "@/lib/page-metadata"
import { buildPageSchema } from "@/lib/seo/schemas"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import FadeIn from "@/components/aesop/FadeIn"
import RepresentativeMessage from "@/components/japan-entry/RepresentativeMessage"
import JapanEntryVisualProof from "@/components/japan-entry/JapanEntryVisualProof"
import JapanEntryVisualContext, { type VisualContextCopy } from "@/components/japan-entry/JapanEntryVisualContext"
import { getSiteSettings } from "@/lib/settings"

export const dynamic = "force-dynamic"

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "aboutPage" })
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: pageAlternates(locale, "/about"),
  }
}

const VALUE_ICONS = [Rocket, Handshake, Lightbulb] as const
const VALUE_GRADIENTS = [
  "from-zinc-950 via-zinc-800 to-blue-700",
  "from-zinc-900 via-blue-800 to-emerald-700",
  "from-zinc-900 via-emerald-800 to-blue-700",
] as const

interface ValueRow { title: string; desc: string }
interface OperatingStep { title: string; desc: string }

function buildEnglishCompanyInfo(
  settings: Awaited<ReturnType<typeof getSiteSettings>>,
): Array<[string, string]> {
  const rows: Array<[string, string]> = [
    ["Registered name", settings.company.legalName ?? settings.siteName],
  ]
  if (settings.company.registrationNumber) rows.push(["Registration number", settings.company.registrationNumber])
  if (settings.company.foundedYear) rows.push(["Founded", settings.company.foundedYear])
  const configuredAddress = settings.company.address ?? settings.contact.address
  if (configuredAddress) {
    rows.push(["Registered address", [settings.company.postalCode, configuredAddress].filter(Boolean).join(" ")])
  }
  rows.push(
    ["Email", settings.contact.email ?? "info@paradigmjp.com"],
    ["Website", "https://paradigmjp.com"],
    ["Public offer", "$12,000 Japan Entry setup · first six months included for selected launch partners · then continuation pricing is agreed separately"],
  )
  return rows
}

function buildJapaneseCompanyInfo(
  settings: Awaited<ReturnType<typeof getSiteSettings>>,
): Array<[string, string]> {
  const rows: Array<[string, string]> = [
    ["会社名", settings.company.legalName ?? settings.siteName],
  ]
  if (settings.company.registrationNumber) rows.push(["法人番号", settings.company.registrationNumber])
  if (settings.company.foundedYear) rows.push(["設立", `${settings.company.foundedYear}年`])
  const configuredAddress = settings.company.address ?? settings.contact.address
  if (configuredAddress) {
    rows.push(["所在地", [settings.company.postalCode, configuredAddress].filter(Boolean).join(" ")])
  }
  rows.push(
    ["事業内容", "Web制作 / MEO / SEO・GEO / AI導入支援"],
    ["メール", settings.contact.email ?? "info@paradigmjp.com"],
    ["Webサイト", "https://paradigmjp.com"],
  )
  return rows
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params
  const [t, settings] = await Promise.all([
    getTranslations({ locale, namespace: "aboutPage" }),
    getSiteSettings(locale),
  ])
  const visualContextLocale = locale === "ja" ? "ja" : "en"
  const visualContextT = await getTranslations({ locale: visualContextLocale, namespace: "home" })
  const VALUES = (t.raw("values") as ValueRow[]).map((v, i) => ({
    icon: VALUE_ICONS[i] ?? Rocket,
    gradient: VALUE_GRADIENTS[i] ?? VALUE_GRADIENTS[0],
    title: v.title,
    desc: v.desc,
  }))
  const COMPANY_INFO = locale === "en"
    ? buildEnglishCompanyInfo(settings)
    : locale === "ja"
      ? buildJapaneseCompanyInfo(settings)
      : t.raw("companyInfo") as Array<[string, string]>

  // Public bios stay hidden until named members and publication consent have
  // been verified. Generic seeded roles are not evidence of a real team.
  const teamMembers: Array<{ id: string | number; name?: string; role?: string; bio?: string }> = []
  const isJapanEntryLocale = locale !== "ja"
  const representativePrinciples = isJapanEntryLocale ? (t.raw("representativePrinciples") as string[]) ?? [] : []
  const operatingSteps = isJapanEntryLocale ? (t.raw("operatingSteps") as OperatingStep[]) ?? [] : []
  const representativeName = locale === "ja" ? "Paradigm合同会社 運営チーム" : "Paradigm LLC operator team"

  return (
    <>
      <PageHero
        badge={t("heroBadge")}
        title={t("heroTitle")}
        highlight={t("heroHighlight")}
        desc={t("heroDesc")}
      />

      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-40" />
        <FadeIn className="relative z-10 max-w-3xl mx-auto px-6 md:px-8 text-center">
          <p className="paradigm-eyebrow mb-3 text-paradigm-accent">{t("missionEyebrow")}</p>
          <h2 className="font-display text-[28px] md:text-[44px] leading-[1.1]  text-paradigm-ink mb-6">
            <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-ink to-paradigm-accent bg-clip-text text-transparent">
              {t("missionTitle")}
            </span>
          </h2>
          <p className="text-[14px] md:text-[16px] text-paradigm-ink-soft leading-[1.85] max-w-2xl mx-auto">
            {t("missionDesc")}
          </p>
        </FadeIn>
      </section>

      {isJapanEntryLocale && (
        <RepresentativeMessage
          eyebrow={t("representativeEyebrow")}
          title={t("representativeTitle")}
          message={t("representativeMessage")}
          principles={representativePrinciples}
          signatureLabel={t("representativeSignatureLabel")}
          signatureName={representativeName}
          role={t("representativeRole")}
        />
      )}

      {isJapanEntryLocale && <JapanEntryVisualProof locale={locale as "en" | "ja"} />}

      <JapanEntryVisualContext
        locale={visualContextLocale}
        copy={visualContextT.raw("visualContext") as VisualContextCopy}
      />

      <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-50" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-10 max-w-2xl">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">{t("valuesEyebrow")}</p>
            <h2 className="font-display text-[26px] md:text-[40px] leading-[1.1]  text-paradigm-ink">
              <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-ink to-paradigm-accent bg-clip-text text-transparent">
                {t("valuesTitle")}
              </span>
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {VALUES.map((v, idx) => {
              const Icon = v.icon
              return (
                <FadeIn key={v.title} delay={idx * 0.1}>
                  <div className="paradigm-glass rounded-lg p-6 md:p-7 paradigm-glow-sm hover:paradigm-glow-lg  transition-all duration-500 h-full">
                    <div className={`inline-flex items-center justify-center w-11 h-11 rounded-lg bg-gradient-to-br ${v.gradient} text-paradigm-paper mb-4 paradigm-glow-sm`}>
                      <Icon size={20} strokeWidth={1.5} aria-hidden />
                    </div>
                    <h3 className="font-display text-[18px] md:text-[20px] leading-[1.2] text-paradigm-ink mb-2 ">{v.title}</h3>
                    <p className="text-[13px] text-paradigm-ink-soft leading-[1.75]">{v.desc}</p>
                  </div>
                </FadeIn>
              )
            })}
          </div>
        </div>
      </section>

      {isJapanEntryLocale && operatingSteps.length > 0 && (
        <section className="relative overflow-hidden bg-paradigm-paper paradigm-section" aria-labelledby="about-operating-heading">
          <div className="paradigm-mesh opacity-25" />
          <div className="relative z-10 mx-auto max-w-5xl px-6 md:px-8">
            <FadeIn className="mb-8 max-w-3xl">
              <p className="paradigm-eyebrow mb-3 text-paradigm-accent">{t("operatingEyebrow")}</p>
              <h2 id="about-operating-heading" className="font-display text-[24px] leading-[1.15] text-paradigm-ink md:text-[38px]">{t("operatingTitle")}</h2>
              <p className="mt-4 text-[14px] leading-[1.8] text-paradigm-ink-soft">{t("operatingDesc")}</p>
            </FadeIn>
            <div className="grid gap-4 md:grid-cols-2">
              {operatingSteps.map((step, index) => (
                <FadeIn key={step.title} delay={index * 0.05}>
                  <article className="h-full rounded-lg border border-paradigm-line bg-paradigm-paper-deep p-6 paradigm-glow-sm">
                    <span className="font-display text-[22px] text-paradigm-accent">{String(index + 1).padStart(2, "0")}</span>
                    <h3 className="mt-3 font-display text-[18px] leading-[1.2] text-paradigm-ink">{step.title}</h3>
                    <p className="mt-3 text-[13px] leading-[1.8] text-paradigm-ink-soft">{step.desc}</p>
                  </article>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-8">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">{t("companyEyebrow")}</p>
            <h2 className="font-display text-[26px] md:text-[36px] leading-[1.15]  text-paradigm-ink">
              {t("companyTitle")}
            </h2>
          </FadeIn>
          <FadeIn>
            <div className="paradigm-glass rounded-lg overflow-hidden border border-paradigm-line paradigm-glow-sm">
              <dl>
                {COMPANY_INFO.map(([label, value], i) => (
                  <div key={label} className={`grid grid-cols-1 md:grid-cols-[180px_1fr] py-4 px-6 ${i < COMPANY_INFO.length - 1 ? "border-b border-paradigm-line/60" : ""}`}>
                    <dt className="paradigm-eyebrow text-paradigm-accent md:pt-0.5">{label}</dt>
                    <dd className="text-[13px] md:text-[14px] text-paradigm-ink leading-[1.7] mt-1.5 md:mt-0">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </FadeIn>
        </div>
      </section>

      {teamMembers.length > 0 && (
        <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
          <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8">
            <FadeIn className="mb-8 text-center">
              <p className="paradigm-eyebrow text-paradigm-accent mb-3">Team</p>
              <h2 className="font-display text-[26px] md:text-[40px] leading-[1.15] text-paradigm-ink">Our team</h2>
            </FadeIn>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {teamMembers.map((m, i) => (
                <FadeIn key={String(m.id)} delay={i * 0.1}>
                  <div className="paradigm-glass rounded-lg p-6 paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-paradigm-accent to-paradigm-glow text-white mb-4 paradigm-glow-sm">
                      <Users size={20} strokeWidth={1.5} aria-hidden />
                    </div>
                    <h3 className="font-display text-[18px] md:text-[20px] leading-[1.2] text-paradigm-ink mb-1">{m.name ?? ""}</h3>
                    <p className="paradigm-eyebrow text-paradigm-accent mb-3">{m.role ?? ""}</p>
                    {m.bio && <p className="text-[13px] text-paradigm-ink-soft leading-[1.75]">{m.bio}</p>}
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      <RichCtaBand
        eyebrow={t("ctaEyebrow")}
        title={t("ctaTitle")}
        highlight={t("ctaHighlight")}
        desc={t("ctaDesc")}
        buttonLabel={t("ctaButton")}
        buttonHref={isJapanEntryLocale ? "/contact?intent=japan-entry" : "/contact"}
        analyticsSource="about-final-cta"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildPageSchema({
              type: "AboutPage",
              title: t("heroTitle"),
              description: t("heroDesc"),
              url: `https://paradigmjp.com/${locale}/about`,
              locale,
            })
          ),
        }}
      />
    </>
  )
}
