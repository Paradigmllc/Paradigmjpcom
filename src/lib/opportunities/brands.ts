export const OPPORTUNITY_BRAND_SLUGS = [
  "capital-in-japan",
  "enter-and-operate-japan",
  "source-from-japan",
] as const

export type OpportunityBrandSlug = (typeof OPPORTUNITY_BRAND_SLUGS)[number]
export type OpportunityLocale = "ja" | "en"

export interface OpportunityOffer {
  name: string
  price: string
  description: string
}

export interface OpportunityBrand {
  slug: OpportunityBrandSlug
  code: string
  name: string
  eyebrow: string
  tagline: string
  description: string
  audience: string[]
  pillars: Array<{ title: string; description: string }>
  offers: OpportunityOffer[]
  inquiryTypes: string[]
  accent: "amber" | "violet" | "emerald"
  metric: { value: string; label: string }
  disclaimer?: string
}

export interface OpportunityHubCopy {
  eyebrow: string
  title: string
  highlight: string
  description: string
  portfolioTitle: string
  portfolioDescription: string
  revenueEyebrow: string
  revenueTitle: string
  revenueDescription: string
  revenueRows: Array<{ label: string; value: string }>
  operatingTitle: string
  operatingPoints: string[]
  cardCta: string
  primaryCta: string
}

const EN_BRANDS: Record<OpportunityBrandSlug, OpportunityBrand> = {
  "capital-in-japan": {
    slug: "capital-in-japan",
    code: "01 / CAPITAL",
    name: "Japan Asset Intelligence",
    eyebrow: "For global investors allocating capital to Japan",
    tagline: "Real assets, currency and deal intelligence—connected to execution.",
    description:
      "Decision-grade research for non-resident investors evaluating Japanese property, hospitality and business acquisitions. We turn listings and headlines into comparable numbers, risks and next actions.",
    audience: ["Global investors", "Family offices", "Property investors", "Overseas advisors"],
    pillars: [
      { title: "Deal breakdowns", description: "Purchase price, closing costs, operating assumptions, net yield, downside and exit liquidity in one memo." },
      { title: "Capital context", description: "The yen, BOJ policy, inflation and financing explained only where they change an investment decision." },
      { title: "Local execution network", description: "Qualified introductions to licensed real-estate, tax, legal, management and diligence partners." },
    ],
    offers: [
      { name: "Quick Deal Screen", price: "$500–750", description: "Fast pricing, yield and major-risk screen." },
      { name: "Full Deal Memo", price: "From $1,500", description: "Costs, net return, comparisons and exit analysis." },
      { name: "Institutional Brief", price: "From $3,000", description: "Custom market or portfolio research for firms." },
    ],
    inquiryTypes: ["Quick Deal Screen", "Full Deal Memo", "Area Comparison", "Institutional Brief", "Partner Program"],
    accent: "amber",
    metric: { value: "$20k", label: "minimum stable monthly portfolio target" },
    disclaimer:
      "Investment intelligence, not personalized investment advice. Brokerage, negotiation and regulated procedures are handled by appropriately licensed partners.",
  },
  "enter-and-operate-japan": {
    slug: "enter-and-operate-japan",
    code: "02 / OPERATE",
    name: "Enter & Operate Japan",
    eyebrow: "For foreign brands entering and operating in Japan",
    tagline: "Your external Japan market operator—from validation to revenue.",
    description:
      "A practical Japan operating desk for overseas D2C and consumer brands. We validate the market, build the launch stack and run local growth without requiring a Japan entity on day one.",
    audience: ["Overseas D2C brands", "Premium consumer brands", "Manufacturers", "International expansion leaders"],
    pillars: [
      { title: "Paid market validation", description: "Demand, pricing, compliance, unit economics and channel fit converted into a clear go, revise or stop decision." },
      { title: "Japan launch build", description: "Localization, commerce, logistics, returns, customer support and launch assets delivered as one operating plan." },
      { title: "KPI-linked operation", description: "Japan-side execution, reporting and partner management with exclusivity earned against agreed milestones." },
    ],
    offers: [
      { name: "Paid Market Validation", price: "$5,000", description: "A 1–2 week market, compliance, channel and P&L sprint; fully credited toward launch." },
      { name: "Japan Launch", price: "$20,000 total", description: "A 4–8 week localization, commerce, partner and launch build, including the validation fee." },
      { name: "Hybrid Growth", price: "$2,500/mo + 10%", description: "Ongoing Japan operations tied to Net Collected Japan Sales." },
    ],
    inquiryTypes: ["Paid Market Validation", "Japan Launch", "Hybrid Growth", "Certification / Compliance", "Distributor Search"],
    accent: "violet",
    metric: { value: "$20k", label: "launch setup, staged after paid validation" },
  },
  "source-from-japan": {
    slug: "source-from-japan",
    code: "03 / SOURCE",
    name: "Source from Japan",
    eyebrow: "For global procurement teams sourcing from Japan",
    tagline: "Find qualified Japanese suppliers—not another unverified directory.",
    description:
      "Structured supplier intelligence and on-the-ground sourcing for overseas manufacturers, buyers and brands. We qualify capabilities, certifications, export readiness and commercial fit before an introduction.",
    audience: ["Procurement leaders", "Overseas manufacturers", "Wholesalers", "Industrial distributors"],
    pillars: [
      { title: "Supplier intelligence", description: "Capabilities, materials, MOQ, certifications, capacity, English support and export experience in a comparable format." },
      { title: "RFQ and qualification", description: "Requirements translated into a focused shortlist with evidence, fit notes and unanswered risks." },
      { title: "Japan-side execution", description: "Factory communication, samples, site visits, inspection and export-partner coordination from Japan." },
    ],
    offers: [
      { name: "Supplier Shortlist", price: "$1,500–3,000", description: "Qualified candidates matched to a defined requirement." },
      { name: "Sourcing Sprint", price: "$4,000–10,000", description: "Research, outreach, RFQ and commercial comparison." },
      { name: "Procurement Desk", price: "$2,500–5,000/mo", description: "Continuous sourcing and Japan-side coordination." },
    ],
    inquiryTypes: ["Supplier Shortlist", "Sourcing Sprint", "RFQ Support", "Factory / Product Verification", "Procurement Desk"],
    accent: "emerald",
    metric: { value: "1 desk", label: "shared research, CRM and delivery infrastructure" },
  },
}

const JA_BRANDS: Record<OpportunityBrandSlug, OpportunityBrand> = {
  "capital-in-japan": {
    ...EN_BRANDS["capital-in-japan"],
    eyebrow: "日本へ資本配分する海外投資家向け",
    tagline: "日本の実物資産・為替・案件情報を、投資判断と実行へつなぐ。",
    description: "非居住者による日本の不動産、ホテル・旅館、事業買収を対象に、売出情報を比較可能な数字・リスク・次の行動へ変換します。",
    audience: ["海外個人投資家", "ファミリーオフィス", "不動産投資家", "海外アドバイザー"],
    pillars: [
      { title: "案件分析", description: "取得価格、諸費用、運用前提、手取り利回り、下振れ要因、出口流動性を一つのメモに整理。" },
      { title: "資本環境", description: "円相場、日銀政策、インフレ、融資を、投資判断が変わる範囲に絞って解説。" },
      { title: "実行ネットワーク", description: "宅建、税務、法務、管理、デューデリジェンスの適切な専門家へ接続。" },
    ],
    offers: [
      { name: "Quick Deal Screen", price: "$500–750", description: "価格・利回り・主要リスクの一次判定。" },
      { name: "Full Deal Memo", price: "$1,500〜", description: "諸費用、手取り収益、比較、出口までの分析。" },
      { name: "Institutional Brief", price: "$3,000〜", description: "法人向け市場・ポートフォリオ調査。" },
    ],
    metric: { value: "$20k", label: "ポートフォリオ全体の月間最低安定ライン" },
    disclaimer: "個別の投資助言ではなく、投資判断材料を提供します。仲介・交渉・規制対象業務は適切な免許・資格を持つ提携先が担当します。",
  },
  "enter-and-operate-japan": {
    ...EN_BRANDS["enter-and-operate-japan"],
    eyebrow: "日本へ参入・運営する海外ブランド向け",
    tagline: "市場検証から売上まで担う、外部日本事業部。",
    description: "海外D2C・消費者ブランド向けの日本事業デスクです。初日から日本法人を抱えず、市場検証、立ち上げ、現地運営まで一気通貫で進めます。",
    audience: ["海外D2Cブランド", "プレミアム消費者ブランド", "海外メーカー", "海外事業責任者"],
    pillars: [
      { title: "有料市場検証", description: "需要、価格、規制、採算、チャネル適合性から、進出・修正・見送りを明確に判断。" },
      { title: "日本ローンチ構築", description: "ローカライズ、EC、物流、返品、顧客対応、ローンチ素材を一つの運営計画として実装。" },
      { title: "KPI連動運営", description: "日本側の実行・報告・パートナー管理を担い、合意KPIの達成に応じて独占権を付与。" },
    ],
    offers: [
      { name: "有料市場検証", price: "$5,000", description: "1〜2週間で市場・規制・チャネル・損益を検証。ローンチ費用へ全額充当。" },
      { name: "日本ローンチ", price: "総額 $20,000", description: "4〜8週間でローカライズ、販売基盤、パートナー、ローンチを構築。検証費用を含む。" },
      { name: "ハイブリッド運営", price: "$2,500/月 + 10%", description: "日本での純回収売上に連動した継続運営。" },
    ],
    inquiryTypes: ["有料市場検証", "日本ローンチ", "ハイブリッド運営", "認証・規制対応", "代理店・販売先開拓"],
    metric: { value: "$20k", label: "有料検証後に段階実行するローンチ総額" },
  },
  "source-from-japan": {
    ...EN_BRANDS["source-from-japan"],
    eyebrow: "日本から調達する海外バイヤー向け",
    tagline: "未検証の企業一覧ではなく、発注判断できる日本サプライヤー情報を。",
    description: "海外メーカー、調達責任者、ブランド向けに、日本企業の能力・認証・輸出対応・商談適合性を確認してから候補化する調達支援です。",
    audience: ["海外調達責任者", "海外メーカー", "卸売事業者", "機械・産業商社"],
    pillars: [
      { title: "サプライヤー情報", description: "加工能力、素材、MOQ、認証、生産能力、英語対応、輸出経験を比較可能に整理。" },
      { title: "RFQ・適格性確認", description: "要件から候補を絞り、根拠、適合度、未解決リスク付きで提示。" },
      { title: "日本側の実行", description: "工場との連絡、サンプル、現地確認、検品、輸出事業者との調整を支援。" },
    ],
    offers: [
      { name: "Supplier Shortlist", price: "$1,500–3,000", description: "要件に合う候補企業を適格性確認付きで選定。" },
      { name: "Sourcing Sprint", price: "$4,000–10,000", description: "調査、接触、RFQ、商条件比較まで実行。" },
      { name: "Procurement Desk", price: "$2,500–5,000/月", description: "継続調達と日本側調整を月額で支援。" },
    ],
    metric: { value: "1基盤", label: "3ブランド共通の調査・CRM・納品オペレーション" },
  },
}

const HUB_COPY: Record<OpportunityLocale, OpportunityHubCopy> = {
  en: {
    eyebrow: "THREE JAPAN TRANSACTION DESKS",
    title: "Turn Japan complexity into",
    highlight: "decisions and transactions.",
    description: "Three distinct audiences. One shared intelligence, CRM and delivery system. Start with a focused paid decision product, then expand into recurring Japan-side execution.",
    portfolioTitle: "Choose the transaction you are trying to complete",
    portfolioDescription: "Each desk has a separate promise and buyer journey, while research and operations stay shared behind the scenes.",
    revenueEyebrow: "PORTFOLIO MODEL",
    revenueTitle: "Designed for stable foreign-currency revenue",
    revenueDescription: "Recurring contracts first, research second, and success fees as upside only.",
    revenueRows: [
      { label: "Recurring retainers", value: "60%+ of revenue" },
      { label: "Standardized research", value: "2–4 projects / month" },
      { label: "Portfolio floor", value: "$20,000 / month" },
      { label: "Completion target", value: "$25,000 / month" },
    ],
    operatingTitle: "One operating system, three public brands",
    operatingPoints: ["Shared research and evidence capture", "Shared CRM, qualification and partner routing", "Shared reporting, content and delivery workflows"],
    cardCta: "Explore this desk",
    primaryCta: "Discuss a Japan opportunity",
  },
  ja: {
    eyebrow: "日本の高額取引を支援する3つの専門デスク",
    title: "日本の複雑さを、",
    highlight: "意思決定と取引に変える。",
    description: "顧客と表のブランドは分け、調査・CRM・納品基盤は共通化。最初に有料の判断商品を提供し、継続的な日本側実行へ接続します。",
    portfolioTitle: "実現したい取引から選ぶ",
    portfolioDescription: "3つのデスクは約束と購買導線を分けつつ、裏側のリサーチと運営を共通化しています。",
    revenueEyebrow: "収益ポートフォリオ",
    revenueTitle: "外貨で安定売上を作る設計",
    revenueDescription: "継続契約を中心に、標準化調査を積み上げ、成功報酬は上振れとして扱います。",
    revenueRows: [
      { label: "月額・年額契約", value: "売上の60%以上" },
      { label: "標準化調査", value: "月2〜4案件" },
      { label: "最低安定ライン", value: "月$20,000" },
      { label: "完成ライン", value: "月$25,000" },
    ],
    operatingTitle: "表は3ブランド、裏側は1つの運営基盤",
    operatingPoints: ["調査とエビデンス取得を共通化", "CRM・適格性確認・提携先振り分けを共通化", "レポート・コンテンツ・納品フローを共通化"],
    cardCta: "専門デスクを見る",
    primaryCta: "日本案件を相談する",
  },
}

export function opportunityLocale(locale: string): OpportunityLocale {
  return locale === "ja" ? "ja" : "en"
}

export function isOpportunityBrandSlug(value: string): value is OpportunityBrandSlug {
  return OPPORTUNITY_BRAND_SLUGS.includes(value as OpportunityBrandSlug)
}

export function getOpportunityBrand(slug: OpportunityBrandSlug, locale: string): OpportunityBrand {
  return opportunityLocale(locale) === "ja" ? JA_BRANDS[slug] : EN_BRANDS[slug]
}

export function getOpportunityBrands(locale: string): OpportunityBrand[] {
  return OPPORTUNITY_BRAND_SLUGS.map((slug) => getOpportunityBrand(slug, locale))
}

export function getOpportunityHubCopy(locale: string): OpportunityHubCopy {
  return HUB_COPY[opportunityLocale(locale)]
}
