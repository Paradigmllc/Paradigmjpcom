/**
 * /[locale] — CMS-driven locale-aware homepage
 *
 * Fetches the PayloadCMS Pages collection document with `isHomepage: true`
 * and renders its `layout` (localized Block array) via BlockRenderer.
 *
 * JA locale: Web制作メインのブロック構成
 * EN/other locales: Japan Entry Package (JaaS) メインのブロック構成
 *
 * Fallback: HomeClient (hardcoded 8-band) if CMS unavailable
 */

import { getPayload } from "payload"
import config from "@payload-config"
import { coerceLocale, filterByLocale, localeFindOptions, type AppLocale } from "@/lib/cms/filters"
import BlockRenderer from "@/blocks/BlockRenderer"
import HomeClient from "./HomeClient"

export const dynamic = "force-dynamic"
export const revalidate = 300

interface Props {
  params: Promise<{ locale: string }>
}

async function fetchHomepage(locale: string) {
  try {
    const contentLocale = coerceLocale(locale)
    const payload = await getPayload({ config })
    const typedLocale = contentLocale as Parameters<typeof filterByLocale>[0]
    const res = await payload.find({
      collection: "pages",
      where: filterByLocale(typedLocale, {
        isHomepage: { equals: true },
      }),
      limit: 1,
      depth: 2,
      ...localeFindOptions(typedLocale),
    })
    return res.docs[0] ?? null
  } catch (e) {
    console.error("[homepage] CMS fetch failed:", e)
    return null
  }
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  const page = await fetchHomepage(locale)

  if (page?.layout && Array.isArray(page.layout) && page.layout.length > 0) {
    return (
      <BlockRenderer
        blocks={page.layout as Array<{ blockType: string; [k: string]: unknown }>}
      />
    )
  }

  return <HomeClient />
}
