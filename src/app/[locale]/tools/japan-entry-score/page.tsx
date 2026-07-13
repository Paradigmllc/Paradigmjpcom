import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { pageAlternates } from "@/lib/page-metadata"
import { isMarketingLocale } from "@/lib/marketing-routing"
import JapanEntryScoreTool from "@/components/japan-entry/JapanEntryScoreTool"

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isMarketingLocale(locale)) return {}
  const isJapanese = locale === "ja"
  const title = isJapanese ? "日本進出度を可視化する無料チェック | Paradigm" : "Japan Entry Signal Check | Paradigm"
  const description = isJapanese
    ? "Webサイトと運用情報から、日本進出に向けた公開シグナル・準備状況・未確認項目を可視化します。"
    : "See how ready your business looks for Japan using public market signals and your own operating answers."
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/tools/japan-entry-score"),
    openGraph: { title, description, type: "website" },
  }
}

export default async function JapanEntryScorePage({ params }: Props) {
  const { locale } = await params
  if (!isMarketingLocale(locale)) notFound()
  if (locale === "ja") notFound()
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Japan Entry Signal Check",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: `https://paradigmjp.com/${locale}/tools/japan-entry-score`,
    description: "A public-signal utility that visualizes how ready a business looks for Japan.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <JapanEntryScoreTool locale="en" />
    </>
  )
}
