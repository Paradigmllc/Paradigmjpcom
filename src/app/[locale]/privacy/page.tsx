/**
 * /[locale]/privacy — プライバシーポリシー (個人情報取扱い 9 条)
 *
 * 役割:   プライバシーポリシー (個人情報取扱い 9 条)
 * 入力:   params.locale
 * 出力:   PageHero + 9 sections (取得・利用目的・第三者提供・安全管理・開示等)
 *
 * AE-PHP-2 (P18-D 2026-05-08): 全 visible text を messages/{locale}.json:privacyPage 経由に統一.
 *   旧 SECTIONS_JA / SECTIONS_EN の二重 React.ReactNode hardcode → 12 locale 対応.
 *   bullets / contact は構造化 JSON (t.raw 経由) で保持し React 側で render.
 * AE-PHP-4 準拠 (各 page.tsx に役割/入力/出力 を明示)。
 */
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { pageAlternates } from "@/lib/page-metadata"
import PageHero from "@/components/PageHero"
import FadeIn from "@/components/aesop/FadeIn"

export const dynamic = "force-dynamic"

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "privacyPage" })
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: pageAlternates(locale, "/privacy"),
  }
}

interface PrivacySection {
  title: string
  body: string
  bullets?: string[]
  contact?: { name: string; email: string }
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "privacyPage" })
  const sections = t.raw("sections") as PrivacySection[]

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
          {sections.map((s, i) => (
            <FadeIn key={s.title} delay={i * 0.04}>
              <article className="paradigm-glass rounded-2xl p-6 md:p-7 paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500">
                <h2 className="font-display text-[18px] md:text-[22px] leading-[1.2] tracking-[-0.01em] text-paradigm-ink mb-4">
                  <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-accent to-paradigm-tech bg-clip-text text-transparent">{s.title}</span>
                </h2>
                <div className="text-[13px] md:text-[14px] text-paradigm-ink-soft leading-[1.85]">
                  <p>{s.body}</p>
                  {s.bullets && s.bullets.length > 0 && (
                    <ul className="mt-3 space-y-1.5 list-disc pl-5 text-paradigm-ink-soft">
                      {s.bullets.map((b) => (<li key={b}>{b}</li>))}
                    </ul>
                  )}
                  {s.contact && (
                    <p className="mt-3 text-paradigm-ink">
                      <strong className="font-medium">{s.contact.name}</strong>
                      <br />
                      Email: {s.contact.email}
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
