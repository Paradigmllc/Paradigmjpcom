/**
 * /[locale]/cms/[[...slug]] — Pages collection の dynamic renderer
 *
 * 役割:
 *   Payload Pages collection の document を slug でルックアップし、
 *   layout (Block array) を BlockRenderer で render する。
 *
 * 使い方:
 *   1. Admin (/admin) で Pages collection に新規 document 作成
 *   2. slug 入力 (例: "japan-entry-guide")
 *   3. layout で Block を組み合わせ (Hero → Section → CardGrid → CTA)
 *   4. Save & Publish → /ja/cms/japan-entry-guide で公開
 *
 * SEO:
 *   - canonical / hreflang / OG / JSON-LD (Article schema) 自動生成
 *   - 詳細は s5 SEO・GEO 戦略セクション参照
 */

import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getPayload } from "payload"
import config from "@payload-config"
import { coerceLocale, filterByLocale, localeFindOptions } from "@/lib/cms/filters"
import BlockRenderer from "@/blocks/BlockRenderer"
import JsonLd from "@/components/seo/JsonLd"
import { buildArticleSchema, buildBreadcrumbSchema } from "@/lib/seo/schemas"
import { routing } from "@/i18n/routing"

export const dynamic = "force-dynamic"
export const revalidate = 60

interface PageProps {
  params: Promise<{ locale: string; slug?: string[] }>
}

const BASE = "https://paradigmjp.com"

async function fetchPage(locale: string, slug: string) {
  try {
    const payload = await getPayload({ config })
    const res = await payload.find({
      collection: "pages",
      where: filterByLocale(locale, { slug: { equals: slug } }),
      limit: 1,
      depth: 2,
      ...localeFindOptions(locale),
    })
    return res.docs[0] ?? null
  } catch (e) {
    console.error("[cms] payload.find failed:", e)
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params
  const locale = coerceLocale(rawLocale)
  const slugStr = (slug && slug.length > 0) ? slug.join("/") : "index"
  const page = await fetchPage(locale, slugStr)
  if (!page) return { title: "Not Found" }

  const title = (page as { title?: string }).title ?? slugStr
  const description = (page as { description?: string }).description ?? ""
  const canonical = `${BASE}/${locale}/cms/${slugStr}`

  const languages: Record<string, string> = { "x-default": `${BASE}/${routing.defaultLocale}/cms/${slugStr}` }
  for (const l of routing.locales) languages[l] = `${BASE}/${l}/cms/${slugStr}`

  return {
    title,
    description,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      locale,
    },
    twitter: { card: "summary_large_image", title, description },
  }
}

export default async function CMSPage({ params }: PageProps) {
  const { locale: rawLocale, slug } = await params
  const locale = coerceLocale(rawLocale)
  const slugStr = (slug && slug.length > 0) ? slug.join("/") : "index"

  const page = await fetchPage(locale, slugStr)
  if (!page) notFound()

  const layout = ((page as { layout?: unknown[] }).layout ?? []) as Array<{ blockType: string }>
  const url = `${BASE}/${locale}/cms/${slugStr}`

  // JSON-LD: Article + BreadcrumbList
  const articleSchema = buildArticleSchema({
    title: (page as { title?: string }).title ?? slugStr,
    description: (page as { description?: string }).description,
    url,
    locale,
  })
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: locale === "ja" ? "ホーム" : "Home", url: `${BASE}/${locale}` },
    { name: (page as { title?: string }).title ?? slugStr, url },
  ])

  return (
    <>
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema} />
      <BlockRenderer blocks={layout as Array<{ blockType: string; [k: string]: unknown }>} />
    </>
  )
}
