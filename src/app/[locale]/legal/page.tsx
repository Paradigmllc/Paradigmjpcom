/**
 * /[locale]/legal — 特定商取引法に基づく表記 (法定情報・9 条)
 *
 * 役割:   特定商取引法に基づく表記 (法定情報・9 条)
 * 入力:   params.locale
 * 出力:   PageHero + 9 sections (会社名・所在地・代表・連絡先・販売価格・支払方法・引渡時期・返品・申込有効期限)
 *
 * AE-PHP-2 (P18-D 2026-05-08): 全 visible text を messages/{locale}.json:legalPage 経由に統一.
 *   旧 ROWS_JA / ROWS_EN の二重 tuple hardcode → 12 locale 対応 (next-intl getTranslations).
 * AE-PHP-4 準拠 (各 page.tsx に役割/入力/出力 を明示)。
 */
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import PageHero from "@/components/PageHero"
import FadeIn from "@/components/aesop/FadeIn"

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "legalPage" })
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  }
}

export default async function LegalPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "legalPage" })
  const ROWS = t.raw("rows") as Array<[string, string]>

  return (
    <>
      <PageHero badge={t("heroBadge")} title={t("heroTitle")} />
      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <FadeIn className="relative z-10 max-w-3xl mx-auto px-6 md:px-8">
          <div className="paradigm-glass rounded-2xl overflow-hidden border border-paradigm-line paradigm-glow-md">
            <dl>
              {ROWS.map(([label, value], i) => (
                <div key={label} className={`grid grid-cols-1 md:grid-cols-[200px_1fr] py-4 px-5 ${i < ROWS.length - 1 ? "border-b border-paradigm-line/60" : ""}`}>
                  <dt className="paradigm-eyebrow text-paradigm-accent md:pt-0.5">{label}</dt>
                  <dd className="text-[13px] md:text-[14px] text-paradigm-ink leading-[1.75] mt-1.5 md:mt-0">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </FadeIn>
      </section>
    </>
  )
}
