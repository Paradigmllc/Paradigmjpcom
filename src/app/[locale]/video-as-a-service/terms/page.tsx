import type { Metadata } from "next"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import { notFound } from "next/navigation"
import { Link } from "@/i18n/routing"
import FadeIn from "@/components/aesop/FadeIn"
import PageHero from "@/components/PageHero"
import { pageAlternates } from "@/lib/page-metadata"
import {
  getVideoServiceTerms,
  type VideoServiceTermSection,
} from "@/lib/video-service-terms"

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (locale !== "ja" && locale !== "en") return {}
  const copy = getVideoServiceTerms(locale)
  return {
    title: copy.title,
    description: copy.description,
    alternates: pageAlternates(locale, "/video-as-a-service/terms"),
  }
}

function TermSection({ section }: { section: VideoServiceTermSection }) {
  return (
    <section className="border-t border-paradigm-line py-8 first:border-t-0 first:pt-0">
      <h2 className="font-display text-[21px] leading-[1.25] text-paradigm-ink md:text-[25px]">
        {section.heading}
      </h2>
      {section.paragraphs?.map((paragraph) => (
        <p
          key={paragraph}
          className="mt-4 text-[13px] leading-[1.9] text-paradigm-ink-soft md:text-[14px]"
        >
          {paragraph}
        </p>
      ))}
      {section.bullets && (
        <ul className="mt-5 space-y-3">
          {section.bullets.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <CheckCircle2
                size={16}
                aria-hidden
                className="mt-1 shrink-0 text-paradigm-accent"
              />
              <span className="text-[13px] leading-[1.85] text-paradigm-ink-soft md:text-[14px]">
                {item}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default async function VideoServiceTermsPage({ params }: Props) {
  const { locale } = await params
  if (locale !== "ja" && locale !== "en") notFound()
  const isJa = locale === "ja"
  const copy = getVideoServiceTerms(locale)

  return (
    <>
      <PageHero
        badge="VIDEO AS A SERVICE · TERMS"
        title={copy.title}
        highlight={isJa ? "利用規約" : "Service Terms"}
        desc={copy.description}
        asideText={`${copy.effectiveDateLabel}: ${copy.effectiveDate}`}
        asideCta={{
          label: isJa ? "サービスページへ戻る" : "Back to the service",
          href: "/video-as-a-service",
        }}
      />

      <main className="bg-paradigm-paper paradigm-section">
        <div className="mx-auto grid max-w-[1180px] gap-10 px-5 md:px-8 lg:grid-cols-[0.72fr_0.28fr] lg:px-10">
          <FadeIn className="border border-paradigm-line bg-paradigm-paper-deep p-6 md:p-10">
            <div className="mb-9 space-y-4">
              {copy.intro.map((paragraph) => (
                <p
                  key={paragraph}
                  className="text-[14px] leading-[1.9] text-paradigm-ink-soft"
                >
                  {paragraph}
                </p>
              ))}
            </div>

            <section className="mb-10 border border-paradigm-line bg-paradigm-paper p-6">
              <h2 className="font-display text-[20px] text-paradigm-ink">
                {copy.hierarchyTitle}
              </h2>
              <ol className="mt-5 space-y-3">
                {copy.hierarchy.map((item, index) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="font-display text-[18px] text-paradigm-accent">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="pt-0.5 text-[13px] leading-[1.8] text-paradigm-ink-soft">
                      {item}
                    </span>
                  </li>
                ))}
              </ol>
            </section>

            {copy.sections.map((section) => (
              <TermSection key={section.heading} section={section} />
            ))}
          </FadeIn>

          <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
            <div className="border border-paradigm-line bg-paradigm-paper-deep p-6">
              <p className="paradigm-eyebrow text-paradigm-accent">
                {copy.effectiveDateLabel}
              </p>
              <p className="mt-3 font-display text-[22px] text-paradigm-ink">
                {copy.effectiveDate}
              </p>
            </div>
            <div className="border border-paradigm-line bg-paradigm-paper-deep p-6">
              <h2 className="font-display text-[20px] text-paradigm-ink">
                {copy.contactTitle}
              </h2>
              <p className="mt-4 text-[13px] leading-[1.85] text-paradigm-ink-soft">
                {copy.contactBody}
              </p>
              <a
                href="mailto:contact@paradigmjp.com"
                className="mt-5 inline-flex text-[12px] font-semibold tracking-[0.08em] text-paradigm-accent underline decoration-paradigm-accent/40 underline-offset-4"
              >
                contact@paradigmjp.com
              </a>
            </div>
            <Link
              href="/video-as-a-service"
              className="inline-flex min-h-11 items-center gap-2 text-[12px] font-semibold tracking-[0.08em] text-paradigm-ink hover:text-paradigm-accent"
            >
              <ArrowLeft size={15} aria-hidden />
              {isJa ? "サービスページへ戻る" : "Back to Video as a Service"}
            </Link>
          </aside>
        </div>
      </main>
    </>
  )
}
