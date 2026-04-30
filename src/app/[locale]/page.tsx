/**
 * /[locale] — Aesop-style luxury homepage
 *
 * 役割:   PayloadCMS Pages collection に isHomepage=true & status=published の
 *         document があればそれを Block-based で render。なければ legacy HomeClient
 *         (8-band cinematic composition) にフォールバック。
 * 入力:   params.locale (12 locales)
 * 出力:   <BlockRenderer> (admin 編集可能) or <HomeClient> (hardcoded fallback)
 *
 * AE-PHP-4 準拠 (役割/入力/出力 明示) + AE-PHP-7 準拠 (DB化 + admin編集可能 → fallback あり)。
 */

import { getPayload } from "payload"
import config from "@payload-config"
import { coerceLocale, filterByLocale, localeFindOptions } from "@/lib/cms/filters"
import BlockRenderer from "@/blocks/BlockRenderer"
import HomeClient from "./HomeClient"

interface Props {
  params: Promise<{ locale: string }>
}

async function fetchHomepage(locale: string) {
  try {
    const payload = await getPayload({ config: config as Parameters<typeof getPayload>[0]["config"] })
    const typedLocale = locale as Parameters<typeof filterByLocale>[0]
    const res = await payload.find({
      collection: "pages",
      where: filterByLocale(typedLocale, {
        and: [
          { isHomepage: { equals: true } },
          { _status: { equals: "published" } },
        ],
      }),
      limit: 1,
      depth: 2,
      ...localeFindOptions(typedLocale),
    } as Parameters<typeof payload.find>[0])
    return res.docs[0] ?? null
  } catch (e) {
    console.error("[home] payload.find homepage failed:", e)
    return null
  }
}

export default async function HomePage({ params }: Props) {
  const { locale: rawLocale } = await params
  const locale = coerceLocale(rawLocale)
  const homepage = await fetchHomepage(locale)

  if (homepage) {
    const layout = ((homepage as { layout?: unknown[] }).layout ?? []) as Array<{
      blockType: string
      [k: string]: unknown
    }>
    if (layout.length > 0) {
      return <BlockRenderer blocks={layout} />
    }
  }

  // Fallback: legacy HomeClient (8 hardcoded sections — Hero/Marquee/Services/
  // Process/Stats/Features/Testimonials/CTA). Admin が Pages collection で
  // isHomepage=true & published な document を作成すればそちらが優先される。
  return <HomeClient />
}
