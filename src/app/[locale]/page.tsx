import { getPayload } from "payload"
import config from "@payload-config"
import { coerceLocale, filterByLocale, localeFindOptions } from "@/lib/cms/filters"
import BlockRenderer from "@/blocks/BlockRenderer"

export const dynamic = "force-dynamic"

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

interface Props {
  params: Promise<{ locale: string }>
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

  return (
    <div className="flex items-center justify-center min-h-[60vh] bg-paradigm-paper">
      <p className="text-paradigm-ink-soft">Loading...</p>
    </div>
  )
}
