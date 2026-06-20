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

  // Fallback (CMS homepage 未作成時):
  //   /ja          → HomeClient (国内SMB・4商材 構成)
  //   /en + 10locale → HomeEnClient (JaaS 痛み/損失可視化アーク・Plan B)
  // 2026-05-20 壁打ち確定: /ja と /en は構造が別 → locale 分岐 (CLAUDE.md s1-2)。
  return assertLocale(rawLocale) === "ja" ? <HomeClient /> : <HomeEnClient />
}
