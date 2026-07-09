/**
 * /[locale] — CMS-driven locale-aware homepage
 *
 * Fetches the PayloadCMS Pages collection document with `isHomepage: true`
 * and renders its `layout` (Block array) via BlockRenderer.
 *
 * JA locale → slug "home-ja" (Web制作メイン)
 * EN/other locales → slug "home-en" (JaaS / Japan Entry Package)
 *
 * Fallback: HomeClient (hardcoded 8-band) if CMS unavailable
 */

import { getPayload } from "payload"
import config from "@payload-config"
import { coerceLocale, filterByLocale, localeFindOptions } from "@/lib/cms/filters"
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
    const slug = contentLocale === "ja" ? "home-ja" : "home-en"
    const res = await payload.find({
      collection: "pages",
      where: filterByLocale(typedLocale, {
        and: [
          { isHomepage: { equals: true } },
          { slug: { equals: slug } },
        ],
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
