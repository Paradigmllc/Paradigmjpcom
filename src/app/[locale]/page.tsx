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

import { coerceLocale, assertLocale, filterByLocale, localeFindOptions } from "@/lib/cms/filters"
import { withPayloadReadFallback } from "@/lib/payload-availability"
import BlockRenderer from "@/blocks/BlockRenderer"
import HomeClient from "./HomeClient"
import HomeEnClient from "./HomeEnClient"

export const revalidate = 300

interface Props {
  params: Promise<{ locale: string }>
}

async function fetchHomepage(locale: string) {
  return withPayloadReadFallback<unknown | null>("home.payload.find", async () => {
    const [{ getPayload }, { default: config }] = await Promise.all([
      import("payload"),
      import("@payload-config"),
    ])
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
  }, null)
}

export default async function HomePage({ params }: Props) {
  const { locale: rawLocale } = await params
  const locale = coerceLocale(rawLocale)

  // HomeClient (ja) / HomeEnClient (en+) are the canonical company homepages.
  // PayloadCMS homepage overrides are NOT used — they inject Revenue OS content
  // which is not appropriate for the paradigmjp.com corporate site.
  return assertLocale(rawLocale) === "ja" ? <HomeClient /> : <HomeEnClient />
}
