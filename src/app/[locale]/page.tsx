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
import { getTranslations } from "next-intl/server"
import JapanEntryScorePromo from "@/components/japan-entry/JapanEntryScorePromo"
import JapanEntryJourney from "@/components/japan-entry/JapanEntryJourney"
import JapanEntryTrustPanel from "@/components/japan-entry/JapanEntryTrustPanel"
import JapanEntryVisualProof from "@/components/japan-entry/JapanEntryVisualProof"
import JapanEntryVisualContext, { type VisualContextCopy } from "@/components/japan-entry/JapanEntryVisualContext"
import JapanEntryCampaign, { type CampaignCopy } from "@/components/japan-entry/JapanEntryCampaign"
import { JapanMarketUrgency } from "@/components/japan-entry/JapanMarketUrgency"
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
    variant: "split-image",
    badge: "FOR FAST-DECISION GLOBAL SMBs",
    title: "Launch in Japan without hiring a local team",
    subtitle:
      "A fixed-scope Japan entry operation for companies ready to move this month. One accountable Tokyo-based team builds, launches, and operates your Japanese revenue path.",
    primaryCta: {
      label: "Apply for Japan Entry — $13K",
      href: "/en/contact?intent=japan-entry",
    },
    secondaryCta: { label: "See the fixed offer", href: "#japan-entry-pricing" },
    image: {
      url: "/japan-entry/tokyo-sakura-panorama.svg",
      alt: "Tokyo skyline and cherry blossom atmosphere representing a Japan Entry launch path",
    },
    stats: [
      { value: "$13K", label: "fixed setup" },
      { value: "$12K value", label: "$2,000/month × 6 months included for selected launch partners" },
      { value: "14", label: "business-day delivery guarantee" },
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
        price: "$13,000",
        period: "one-time",
        description:
        "A market-ready launch with a standard $2,000/month managed-operation layer. For selected launch partners, $2,000/month × 6 months = $12,000 of managed-operation value is included at no additional monthly fee.",
        features:
        "14-business-day delivery guarantee from the recorded Start Date, or the setup fee is refunded\nLP / HP localization and Japanese buyer path\nSocial Media setup for up to two priority channels\nPublic-signal market report across up to three markets\nTrust, commercial disclosure, and regulatory applicability screening\nWise, bank transfer, USDC, or credit card payment routing\nJapanese support, launch operations, and handover\nStandard managed operation: $2,000/month\nSelected launch partners: $2,000/month × 6 months = $12,000 value included\nMonth 7 onward: $2,000/month under the signed terms; availability and scope are confirmed in writing",
        ctaLabel: "Apply for Japan Entry — $13K",
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
      label: "Apply for Japan Entry — $13K",
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
    badge: "中小企業向け Web制作",
    title: "伝わるだけで終わらない。事業に使えるWebサイトを。",
    subtitle:
      "企業サイト、採用サイト、サービスサイト、LPを、情報設計から公開後の運用まで。初期費用30万円〜、要件と範囲を明記して進めます。",
    primaryCta: { label: "無料相談を申し込む", href: "/ja/contact" },
    secondaryCta: { label: "料金を見る", href: "/ja/pricing" },
    stats: [
      { value: "30万円〜", label: "Web制作" },
      { value: "4", label: "標準工程" },
      { value: "1", label: "担当窓口" },
      { value: "公開後", label: "運用も支援" },
    ],
  },
  {
    blockType: "marquee",
    items: [
      { text: "Web制作30万円〜" },
      { text: "企業サイト・採用サイト" },
      { text: "LP・キャンペーンページ" },
      { text: "WordPress / Next.js" },
      { text: "SEO・アクセシビリティ" },
      { text: "公開後の保守・改善" },
    ],
    direction: "left",
    speed: "slow",
  },
  {
    blockType: "section",
    kicker: "WEB PRODUCTION",
    title: "見た目だけでなく、問い合わせまで設計する。",
    subtitle:
      "目的、顧客、運用体制を先に整理し、情報設計・デザイン・実装・計測を一つの制作プロセスとして進めます。",
    alignment: "center",
    background: "default",
  },
  {
    blockType: "card-grid",
    variant: "bento",
    columns: "3",
    cards: [
      { icon: "Globe", title: "企業サイト・採用サイト", description: "会社の強み、提供価値、採用情報を整理し、初めて訪れた人が次の行動へ進める構成にします。", href: "/ja/services/web", highlighted: true },
      { icon: "PenTool", title: "LP・キャンペーンページ", description: "一つの商材や施策に集中したページを、訴求・証拠・CTAの順番から設計します。", href: "/ja/services/web", highlighted: false },
      { icon: "RefreshCw", title: "既存サイトのリニューアル", description: "現行URL、コンテンツ、検索導線、更新体制を確認し、残すものと作り直すものを分けます。", href: "/ja/services/web", highlighted: false },
      { icon: "Code2", title: "CMS・更新基盤", description: "更新担当者が迷わない入力項目と権限を設計し、公開後の更新手順まで残します。", href: "/ja/services/web", highlighted: false },
      { icon: "Search", title: "SEO・GEOの土台", description: "見出し、メタデータ、構造化データ、内部リンクを制作時から整え、計測できる状態で公開します。", href: "/ja/services/seo", highlighted: false },
      { icon: "ShieldCheck", title: "保守・改善", description: "SSL、バックアップ、軽微な更新、改善提案など、必要な範囲を月額契約に明記します。", href: "/ja/contact", highlighted: false },
    ],
  },
  {
    blockType: "stats",
    kicker: "WORKING MODEL",
    title: "制作前に、範囲と判断基準をそろえる。",
    subtitle: "ページ数だけで料金を決めず、目的・更新体制・外部連携・公開後の責任範囲を先に確認します。",
    stats: [
      { value: "30万円〜", label: "初期制作", sublabel: "要件・ページ数で確定" },
      { value: "4工程", label: "標準プロセス", sublabel: "要件から公開後まで" },
      { value: "1窓口", label: "進行担当", sublabel: "確認事項を集約" },
      { value: "明記", label: "納品条件", sublabel: "見積書・契約書で合意" },
    ],
    background: "surface",
  },
  {
    blockType: "process",
    kicker: "PROCESS",
    title: "相談から公開後の改善まで、4つの工程で進める。",
    subtitle: "制作側だけでなく、社内の確認・承認が止まらないように、各工程の成果物と次の判断を共有します。",
    steps: [
      { title: "ヒアリング・現状監査", description: "事業目標、顧客、既存サイト、素材、更新体制を確認し、制作範囲を整理します。", icon: "ClipboardCheck" },
      { title: "情報設計・ワイヤー", description: "ページ構成、導線、必要なコンテンツ、CTA、計測項目を合意します。", icon: "CheckCircle" },
      { title: "デザイン・実装", description: "デザインシステム、レスポンシブUI、CMS、フォーム、SEO基盤を実装します。", icon: "Code2" },
      { title: "公開・引き継ぎ・改善", description: "検収、公開、操作説明、初期計測、保守範囲を確認し、次の改善を決めます。", icon: "TrendingUp" },
    ],
  },
  {
    blockType: "pricing",
    title: "Web制作の料金目安",
    subtitle: "初期費用30万円〜。ページ数、機能、素材、CMS、移行、公開後サポートの範囲を確認して正式見積もりを作成します。",
    tiers: [
      { name: "ライト", price: "300,000", period: "〜", description: "小規模サイトやサービス紹介ページ向け。まず必要な情報を整理して公開します。", features: "トップページ＋下層4ページ前後\nレスポンシブ対応\nお問い合わせフォーム\nSEO基本設定\n公開後1か月の軽微な修正", ctaLabel: "このプランを相談", ctaHref: "/ja/contact", highlighted: false },
      { name: "スタンダード", price: "600,000", period: "〜", description: "企業サイト・採用サイトの標準構成。更新しやすいCMSと計測基盤を含めます。", features: "トップページ＋下層9ページ前後\n情報設計・ワイヤー・デザイン\nWordPressまたはNext.js CMS\nSEO内部対策・構造化データ\n公開後3か月の運用相談", ctaLabel: "おすすめを相談", ctaHref: "/ja/contact", highlighted: true },
      { name: "グロース", price: "1,000,000", period: "〜", description: "複数サービス、多言語、外部連携などを含む本格的なサイト基盤。", features: "ページ・機能を要件定義で確定\nカスタムUIとコンポーネント設計\n多言語・外部サービス連携\nアクセス解析・改善ダッシュボード\n公開後6か月の改善伴走", ctaLabel: "要件を相談", ctaHref: "/ja/contact", highlighted: false },
    ],
  },
  {
    blockType: "faq",
    title: "Web制作を依頼する前に",
    subtitle: "制作範囲、進め方、費用の考え方を先に公開しています。",
    items: [
      { question: "本当に30万円から制作できますか？", answer: fallbackRichText("はい。ライトプランは30万円からが目安です。ページ数、原稿・写真の準備状況、フォームや外部連携、CMSの有無によって変わるため、要件確認後に正式見積もりを提示します。") },
      { question: "制作期間はどのくらいですか？", answer: fallbackRichText("小規模サイトは要件と素材がそろってから3〜6週間程度、中規模以上は2〜3か月程度が目安です。承認回数、素材準備、外部サービスの審査などの依存条件を見積書に記載します。") },
      { question: "既存サイトのリニューアルにも対応しますか？", answer: fallbackRichText("対応します。既存URL、検索流入、コンテンツ、フォーム、CMS、ドメイン・サーバーを確認し、リダイレクトと切り替え手順を含めて計画します。") },
      { question: "公開後の保守は必須ですか？", answer: fallbackRichText("必須ではありません。更新代行、SSL・バックアップ、障害対応、改善提案など、必要な範囲だけを月額契約に分けて明記します。") },
      { question: "成果や検索順位は保証されますか？", answer: fallbackRichText("制作物の納品・検収条件は契約で明記しますが、売上、問い合わせ数、検索順位などの事業成果は保証しません。公開後に計測し、改善できる状態をつくります。") },
    ],
  },
  {
    blockType: "cta",
    title: "Webサイトを、事業の前進に使える状態へ。",
    subtitle: "現在のサイト、作りたいページ、公開時期、社内の運用体制をお聞かせください。必要な範囲と進め方を整理してご提案します。",
    primaryCta: { label: "無料相談を申し込む", href: "/ja/contact" },
    secondaryCta: { label: "サービスを見る", href: "/ja/services" },
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
  if (locale === "ja") {
    return {
      title: "Web制作30万円〜 | Paradigm合同会社",
      description: "企業サイト・採用サイト・LPを30万円〜。情報設計から公開後の運用まで支援します。",
      alternates: pageAlternates("ja"),
      openGraph: {
        type: "website",
        url: "https://paradigmjp.com/ja",
        title: "Web制作30万円〜 | Paradigm合同会社",
        description: "企業サイト・採用サイト・LPを30万円〜。情報設計から公開後の運用まで支援します。",
      },
    }
  }

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
          alt: `${JAPAN_ENTRY_TITLE} — $13,000 fixed setup`,
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
  const visualContextLocale = locale === "ja" ? "ja" : "en"
  const visualContextT = await getTranslations({ locale: visualContextLocale, namespace: "home" })
  const page = await fetchHomepage(locale)
  const cmsBlocks = page?.layout && Array.isArray(page.layout)
    ? page.layout as CmsBlock[]
    : []
  const safeCmsBlocks = locale === "ja"
    ? cmsBlocks.filter(isSafeJapaneseHomepageBlock)
    : cmsBlocks
  const cmsHomepagePassedSafetyGate = locale !== "ja"
    ? isSafeEnglishJapanEntryHomepage(cmsBlocks)
    : safeCmsBlocks.length === cmsBlocks.length && cmsBlocks.length > 0
  const isJapanEntryLocale = locale !== "ja"
  const packageCopy = isJapanEntryLocale
    ? await getTranslations({ locale: "en", namespace: "packagePage" })
    : null
  const campaign = packageCopy ? packageCopy.raw("campaign") as CampaignCopy : null
  const blocks = locale !== "ja" && cmsBlocks.length > 0 && cmsHomepagePassedSafetyGate
    ? safeCmsBlocks
    : isJapanEntryLocale ? EN_FALLBACK_BLOCKS : JA_FALLBACK_BLOCKS

  return (
    <>
      {isJapanEntryLocale ? (
        <>
          <BlockRenderer blocks={blocks.slice(0, 1)} />
          <JapanMarketUrgency source="homepage" />
          {campaign && <JapanEntryCampaign copy={campaign} source="homepage" compact />}
          <BlockRenderer blocks={blocks.slice(1)} />
        </>
      ) : (
        <BlockRenderer blocks={blocks} />
      )}
      {isJapanEntryLocale && <JapanEntryJourney locale={locale} />}
      {isJapanEntryLocale && <JapanEntryTrustPanel locale={locale as "en" | "ja"} />}
      {isJapanEntryLocale && <JapanEntryVisualProof locale={locale as "en" | "ja"} />}
      <JapanEntryVisualContext
        locale={visualContextLocale}
        copy={visualContextT.raw("visualContext") as VisualContextCopy}
      />
      {isJapanEntryLocale && <JapanEntryScorePromo locale={locale as "en" | "ja"} />}
      {isJapanEntryLocale && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(getJapanEntryHomeJsonLd(locale)) }}
        />
      )}
    </>
  )
}
