import { getTranslations } from "next-intl/server"
import PageHero from "@/components/PageHero"
import FadeIn from "@/components/aesop/FadeIn"

export type LegalDocumentNamespace = "termsPage" | "refundPage"

interface DocumentSection {
  title: string
  body: string
  bullets?: string[]
  contact?: { name: string; email: string }
}

interface Props {
  locale: string
  namespace: LegalDocumentNamespace
}

/**
 * Shared renderer for the public commercial documents.
 * The copy remains locale-owned in messages/{locale}.json while the layout,
 * accessibility structure, and contact rendering stay identical.
 */
export default async function LegalDocumentPage({ locale, namespace }: Props) {
  const t = await getTranslations({ locale, namespace })
  const sections = t.raw("sections") as DocumentSection[]

  return (
    <>
      <PageHero
        badge={t("heroBadge")}
        title={t("heroTitle")}
        desc={t("heroDesc")}
      />
      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-8 space-y-3">
          {sections.map((section, index) => (
            <FadeIn key={section.title} delay={index * 0.04}>
              <article className="paradigm-glass rounded-2xl p-6 md:p-7 paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500">
                <h2 className="font-display text-[18px] md:text-[22px] leading-[1.2] tracking-[-0.01em] text-paradigm-ink mb-4">
                  <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-accent to-paradigm-tech bg-clip-text text-transparent">
                    {section.title}
                  </span>
                </h2>
                <div className="text-[13px] md:text-[14px] text-paradigm-ink-soft leading-[1.85]">
                  <p>{section.body}</p>
                  {section.bullets && section.bullets.length > 0 && (
                    <ul className="mt-3 space-y-1.5 list-disc pl-5 text-paradigm-ink-soft">
                      {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                    </ul>
                  )}
                  {section.contact && (
                    <p className="mt-3 text-paradigm-ink">
                      <strong className="font-medium">{section.contact.name}</strong>
                      <br />
                      Email: {section.contact.email}
                    </p>
                  )}
                </div>
              </article>
            </FadeIn>
          ))}
        </div>
      </section>
    </>
  )
}
