import type { Metadata } from "next"
import { unstable_cache } from "next/cache"
import { coerceLocale, filterByLocale, localeFindOptions } from "@/lib/cms/filters"
import {
  JAPAN_ENTRY_DESCRIPTION,
  JAPAN_ENTRY_FAQS,
  JAPAN_ENTRY_TITLE,
  getJapanEntryHomeJsonLd,
} from "@/lib/jsonld"
import { pageAlternates } from "@/lib/page-metadata"
import BlockRenderer from "@/blocks/BlockRenderer"
import JapanEntryScorePromo from "@/components/japan-entry/JapanEntryScorePromo"
import JapanEntryTrustPanel from "@/components/japan-entry/JapanEntryTrustPanel"
import JapanEntryVisualProof from "@/components/japan-entry/JapanEntryVisualProof"
import {
  isSafeEnglishJapanEntryHomepage,
  isSafeJapaneseHomepageBlock,
} from "@/lib/public-content-safety"
import {
  JAPAN_ENTRY_MONTH_ONE_TARGET,
  JAPAN_ENTRY_MONTH_ONE_TARGET_DISCLOSURE,
  JAPAN_ENTRY_MONTH_ONE_TARGET_STAT,
} from "@/lib/japan-entry-public-copy"

export const dynamic = "force-dynamic"

interface CmsBlock {
  blockType: string
  id?: string
  [key: string]: unknown
}

function fallbackRichText(text: string) {
  return {
    root: {
      type: "root",
      direction: "ltr",
      format: "",
      indent: 0,
      version: 1,
      children: [
        {
          type: "paragraph",
          direction: "ltr",
          format: "",
          indent: 0,
          version: 1,
          children: [{ type: "text", text, format: 0 }],
        },
      ],
    },
  }
}

const EN_FALLBACK_BLOCKS: CmsBlock[] = [
  {
    blockType: "hero",
    variant: "centered",
    badge: "FOR FAST-DECISION GLOBAL SMBs",
    title: "Launch in Japan without hiring a local team",
    subtitle:
      "A fixed-scope Japan entry operation for companies ready to move this month. One accountable Tokyo-based team builds, launches, and operates your Japanese revenue path.",
    primaryCta: {
      label: "Apply for Japan Entry — $12K",
      href: "/en/contact?intent=japan-entry",
    },
    secondaryCta: { label: "See the fixed offer", href: "#japan-entry-pricing" },
    stats: [
      { value: "$12K", label: "fixed setup" },
      { value: "$0", label: "monthly for 6 months" },
      { value: "14", label: "business-day launch target" },
      JAPAN_ENTRY_MONTH_ONE_TARGET_STAT,
    ],
  },
  {
    blockType: "section",
    kicker: "THE OUTCOME",
    title: "A Japan-ready revenue path, not another strategy deck",
    subtitle:
      "Localized positioning, buyer trust, eligible payment or inquiry routing, Japanese support, analytics, and handover in one fixed launch scope.",
    alignment: "center",
    background: "default",
  },
  {
    blockType: "pricing",
    title: "One fixed Japan entry offer",
    subtitle:
      "No low-cost pilot, no tier maze, and no surprise agency retainer. We confirm scope before accepting the engagement.",
    tiers: [
      {
        name: "Japan Entry Package",
        price: "$12,000",
        period: "one-time",
        description:
          "A market-ready launch with six months of managed Japan operation included at no additional monthly charge.",
        features:
          "14-business-day Japan-ready launch target\nLP / HP localization and Japanese buyer path\nSNS setup for up to two priority channels\nPublic-signal market report across up to three markets\nTrust, commercial disclosure, and regulatory applicability screening\nEligible payment and inquiry routing\nJapanese support, launch operations, and handover\n$0/month for the first six months\nThen $995/month — cancellable for future billing under the signed terms",
        ctaLabel: "Apply for Japan Entry — $12K",
        ctaHref: "/en/contact?intent=japan-entry",
        highlighted: true,
      },
    ],
  },
  {
    blockType: "faq",
    title: "Before you apply",
    subtitle: "The fixed scope and commercial terms are published so qualified companies can decide quickly.",
    items: JAPAN_ENTRY_FAQS.map((faq) => ({
      question: faq.q,
      answer: fallbackRichText(faq.a),
    })),
  },
  {
    blockType: "cta",
    title: JAPAN_ENTRY_MONTH_ONE_TARGET,
    subtitle:
      `${JAPAN_ENTRY_MONTH_ONE_TARGET_DISCLOSURE} Apply with your decision authority and launch timing. We reply with a fit decision and fixed deployment scope.`,
    primaryCta: {
      label: "Apply for Japan Entry — $12K",
      href: "/en/contact?intent=japan-entry",
    },
    secondaryCta: { label: "Review the fixed offer", href: "#japan-entry-pricing" },
    background: "gradient",
  },
]

const JA_FALLBACK_BLOCKS: CmsBlock[] = [
  {
    blockType: "hero",
    variant: "centered",
    badge: "中小企業のデジタルパートナー",
    title: "Web制作×AIで、ビジネスの成長を加速する",
    subtitle:
      "戦略設計から公開後の集客・運用まで、Paradigmが一気通貫で支援します。",
    primaryCta: { label: "お問い合わせ", href: "/ja/contact" },
    secondaryCta: { label: "サービスを見る", href: "/ja/services" },
  },
  {
    blockType: "section",
    kicker: "SERVICES",
    title: "ビジネスの成長に必要な実装を、ワンストップで",
    subtitle:
      "Web制作、MEO、SEO/GEO、AI導入支援を、成果につながる一つの導線として設計・実装します。",
    alignment: "center",
    background: "default",
  },
  {
    blockType: "cta",
    title: "事業課題を、実装できる計画に変えます。",
    subtitle: "現在の課題と目標をお聞かせください。担当者が次の一手を整理してご連絡します。",
    primaryCta: { label: "お問い合わせ", href: "/ja/contact" },
    secondaryCta: { label: "会社情報を見る", href: "/ja/about" },
    background: "gradient",
  },
]

const getCachedHomepage = unstable_cache(
  async (locale: string) => {
    const [{ getPayload }, { default: config }] = await Promise.all([
      import("payload"),
      import("@payload-config"),
    ])
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
  },
  ["cms-homepage"],
  { revalidate: 300, tags: ["cms-homepage"] },
)

async function fetchHomepage(locale: string) {
  try {
    return await getCachedHomepage(locale)
  } catch (e) {
    console.error("[homepage] CMS fetch failed:", e)
    return null
  }
}

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (locale !== "en") return {}

  return {
    title: JAPAN_ENTRY_TITLE,
    description: JAPAN_ENTRY_DESCRIPTION,
    alternates: pageAlternates("en"),
    openGraph: {
      type: "website",
      url: "https://paradigmjp.com/en",
      title: JAPAN_ENTRY_TITLE,
      description: JAPAN_ENTRY_DESCRIPTION,
      images: [
        {
          url: "/en/opengraph-image",
          width: 1200,
          height: 630,
          alt: `${JAPAN_ENTRY_TITLE} — $12,000 fixed setup`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: JAPAN_ENTRY_TITLE,
      description: JAPAN_ENTRY_DESCRIPTION,
      images: ["/en/opengraph-image"],
    },
  }
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  const page = await fetchHomepage(locale)
  const cmsBlocks = page?.layout && Array.isArray(page.layout)
    ? page.layout as CmsBlock[]
    : []
  const safeCmsBlocks = locale === "ja"
    ? cmsBlocks.filter(isSafeJapaneseHomepageBlock)
    : cmsBlocks
  const cmsHomepagePassedSafetyGate = locale === "en"
    ? isSafeEnglishJapanEntryHomepage(cmsBlocks)
    : locale === "ja"
      ? safeCmsBlocks.length === cmsBlocks.length && cmsBlocks.length > 0
      : false
  const blocks = cmsBlocks.length > 0 && cmsHomepagePassedSafetyGate
    ? safeCmsBlocks
    : locale === "ja"
      ? JA_FALLBACK_BLOCKS
      : EN_FALLBACK_BLOCKS

  return (
    <>
      <BlockRenderer blocks={blocks} />
      {(locale === "en" || locale === "ja") && <JapanEntryTrustPanel locale={locale} />}
      {(locale === "en" || locale === "ja") && <JapanEntryVisualProof locale={locale} />}
      {(locale === "en" || locale === "ja") && <JapanEntryScorePromo locale={locale} />}
      {locale === "en" && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(getJapanEntryHomeJsonLd()) }}
        />
      )}
    </>
  )
}
