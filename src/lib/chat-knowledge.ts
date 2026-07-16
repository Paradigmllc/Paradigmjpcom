import { JAPAN_ENTRY_BLOG_POSTS } from "@/lib/japan-entry-blog"
import { JAPAN_ENTRY_BLOG_POSTS_JA } from "@/lib/japan-entry-blog-ja"

export type ChatLocale = "ja" | "en"

export type ChatKnowledgeSource = {
  title: string
  href: string
  content: string
  score: number
}

type KnowledgeChunk = Omit<ChatKnowledgeSource, "score"> & {
  locale: ChatLocale
  keywords: string[]
}

const CORE_KNOWLEDGE: KnowledgeChunk[] = [
  {
    locale: "en",
    title: "About Paradigm",
    href: "/en/about",
    keywords: ["paradigm", "company", "about", "operator", "who", "tokyo", "japan"],
    content: "Paradigm LLC is a Tokyo-based Japan market-entry operator for overseas SMBs. We publish verified company and commercial information, separate public evidence from unknowns, and do not claim private client outcomes without permission and source data.",
  },
  {
    locale: "ja",
    title: "Paradigmについて",
    href: "/ja/about",
    keywords: ["Paradigm", "会社", "企業", "概要", "運営", "東京", "日本"],
    content: "Paradigm合同会社は、海外SMBの日本市場向け導線を実装・運用する東京拠点の事業者です。確認できる会社情報と商用条件を公開し、公開根拠と未知の事項を分け、許諾と一次データのない顧客成果を実績として主張しません。",
  },
  {
    locale: "en",
    title: "Japan Entry pricing and commercial terms",
    href: "/en/pricing",
    keywords: ["price", "pricing", "cost", "fee", "monthly", "setup", "12,000", "six", "month", "continuation"],
    content: "$12,000 USD fixed one-time setup. For selected launch partners, the first six months of managed operation are included at no additional monthly charge; continuation pricing is agreed separately after the included period in the written scope. Third-party costs and approved work outside scope remain separate.",
  },
  {
    locale: "ja",
    title: "Japan Entryの料金と契約条件",
    href: "/ja/pricing",
    keywords: ["料金", "費用", "価格", "セットアップ", "12000", "12,000", "月額", "6か月", "継続"],
    content: "セットアップは12,000ドル固定です。選定した契約先には、最初の6か月の運用を追加月額なしで提供します。期間終了後の継続条件・月額は個別に協議し、書面で合意します。第三者費用と合意外の作業は別です。",
  },
  {
    locale: "en",
    title: "Payment methods and setup delivery guarantee",
    href: "/en/pricing#payment-assurance-heading",
    keywords: ["payment", "payments", "wise", "bank", "transfer", "usdc", "credit", "card", "stripe", "refund", "refundable", "guarantee", "start date"],
    content: "After fit review and written scope acceptance, Paradigm can issue payment instructions for Wise, bank transfer, USDC, or credit card through a Stripe invoice or payment link. The invoice confirms fees and, for USDC, the network and wallet. The Start Date is recorded after cleared payment, complete inputs, required access, and an empowered approver. If the agreed fixed setup is not delivered within 14 business days from that Start Date, 100% of the USD $12,000 setup fee is refunded. Client-requested changes or holds are logged and pause the clock.",
  },
  {
    locale: "ja",
    title: "支払方法とセットアップ納品保証",
    href: "/ja/pricing#payment-assurance-heading",
    keywords: ["支払い", "支払", "Wise", "銀行", "振込", "USDC", "クレジット", "カード", "Stripe", "返金", "全額", "保証", "開始日"],
    content: "適合確認と範囲確定後、Wise、銀行振込、USDC、クレジットカード（Stripe請求書または決済リンク）の支払案内を発行します。請求書で手数料、USDCのネットワークとウォレットを確認します。入金、必要素材・アクセス、承認者が揃った日を開始日として記録し、合意した固定セットアップを開始日から14営業日以内に納品できない場合は12,000ドルを全額返金します。顧客側の追加変更や保留は記録して時計を一時停止します。",
  },
  {
    locale: "en",
    title: "Japan Entry scope and exclusions",
    href: "/en/services",
    keywords: ["include", "scope", "deliver", "localization", "sns", "social", "compliance", "support", "handover", "exclude"],
    content: "The standard fixed setup envelope connects Japan Opportunity analysis (including three to five competitors and a 90-day plan), a Japanese landing page plus normally eight to ten core pages and 15,000–20,000 source words, payment setup coordination, up to two priority Social Media channels with ten starter posts or briefs, launch creative, a Notion or Trello workspace, regulatory-readiness coordination, launch operations, and handover. The signed scope is final. It does not replace legal, tax, banking, licensing, logistics, advertising, specialist advice, or provider approval.",
  },
  {
    locale: "ja",
    title: "Japan Entryの提供範囲と除外",
    href: "/ja/services",
    keywords: ["範囲", "内容", "納品", "ローカライズ", "SNS", "法規制", "サポート", "引き継ぎ", "除外"],
    content: "固定セットアップは、日本語の購入者導線、LP/HPローカライズ、優先SNS最大2チャネル、市場・競合の公開シグナル調査、法規制の適用可能性整理、適格な問い合わせ・決済導線、日英サポート、公開運用、引き継ぎを接続します。法務・税務・銀行・許認可・物流・広告・決済会社の承認を代替しません。",
  },
  {
    locale: "en",
    title: "Japan Entry application and timeline",
    href: "/en/contact?intent=japan-entry",
    keywords: ["apply", "application", "contact", "timeline", "14", "business", "days", "approval", "input", "kickoff"],
    content: "Submitting the application starts a fit review; it is not contract acceptance. The Start Date is recorded after written scope acceptance, cleared payment, complete source material, required access, and an empowered approver. The agreed fixed setup is covered by a 14-business-day delivery guarantee from that date, with a full setup-fee refund if it is not delivered; client changes or holds pause the clock.",
  },
  {
    locale: "en",
    title: "Shared delivery workspace and 48-hour start SLA",
    href: "/en/pricing#japan-entry-journey",
    keywords: ["notion", "trello", "workspace", "board", "task", "progress", "status", "48", "hours", "SLA", "updates"],
    content: "After written scope acceptance, Paradigm creates a private, isolated client delivery workspace, normally Notion or Trello on request. It includes Home, Request Queue, Launch Roadmap, Deliverables, Approvals, Reports, and a Meeting & Loom archive. Requests can be queued without an artificial request-count cap, with one primary request in active production at a time; large work is split into reviewable tasks and client-side waits pause the delivery clock. Normal communication is async-first, with short Loom updates when a visual explanation helps. New requests are acknowledged within one business day and normally enter active production within two business days; the 48-business-hour start language is a start SLA, not a promise of completion within 48 hours. Kickoff, key approvals, and material blockers can use Zoom. Translated captions or AI interpretation may assist live calls, but the written English scope and post-call summary govern contractual and regulatory meaning.",
  },
  {
    locale: "ja",
    title: "申込み後と14営業日の前提",
    href: "/ja/contact?intent=japan-entry",
    keywords: ["申込み", "問い合わせ", "期間", "14", "営業日", "承認", "素材", "アクセス", "開始"],
    content: "フォーム送信は契約成立ではなく適合確認から始まります。書面で範囲を確定し、入金、必要素材・アクセス、決裁者が揃った日を開始日として記録します。開始日から14営業日の納品保証を適用し、未納品時はセットアップ費用を全額返金します。顧客側の変更・保留は時計を一時停止します。",
  },
  {
    locale: "ja",
    title: "共有ワークスペースと48時間以内の着手",
    href: "/ja/contact",
    keywords: ["Notion", "Trello", "ワークスペース", "ボード", "タスク", "進捗", "作業", "48時間", "着手", "更新"],
    content: "契約・範囲確定後は、Notionを基本とする共有ワークスペース（希望時はTrello）に、範囲、担当、タスク状況、ブロッカー、承認、成果物、次の作業を記録します。契約した月額運用の通常依頼は原則48営業時間以内に着手します。これは着手の目安であり、すべての依頼が48時間で完了する保証ではありません。",
  },
  {
    locale: "en",
    title: "Public signals and unknown traffic or revenue",
    href: "/en/tools/japan-entry-score",
    keywords: ["traffic", "visits", "revenue", "sales", "country", "market", "similarweb", "data", "signal", "rank", "objective"],
    content: "Public rank, crawl, sitemap, schema, registry, and other open signals can show visibility and readiness. They cannot prove private monthly visits, country traffic share, conversion rate, or revenue without first-party or authorized data. Unknown values remain unknown.",
  },
  {
    locale: "ja",
    title: "公開シグナルで分かることと分からないこと",
    href: "/ja/tools/japan-entry-score",
    keywords: ["アクセス", "訪問", "売上", "国別", "市場", "データ", "順位", "シグナル", "公開", "推定"],
    content: "公開順位、クロール、サイトマップ、構造化データ、登録情報などは可視性の手掛かりです。第一者データや許可されたデータがない限り、実際の訪問数、国別比率、成約率、売上は証明できません。未知は未知として表示します。",
  },
  {
    locale: "en",
    title: "Guarantees and published delivery evidence",
    href: "/en/works",
    keywords: ["guarantee", "guaranteed", "case", "case study", "proof", "results", "outcome", "works", "example"],
    content: "Paradigm does not guarantee rankings, traffic, conversion, or revenue. The Works page shows inspectable delivery systems, process, ownership, evidence boundaries, acceptance checks, and handover rather than invented client outcomes. Authorized first-party case studies can be added when publication permission exists.",
  },
  {
    locale: "ja",
    title: "保証と公開できる提供根拠",
    href: "/ja/works",
    keywords: ["保証", "実績", "事例", "根拠", "成果", "売上", "作品", "公開"],
    content: "検索順位、アクセス、コンバージョン、売上などの成果は保証しません。Worksでは、公開許諾のない顧客名や架空の結果ではなく、実装、工程、所有者、検収、根拠の境界、引き継ぎを確認できます。公開許諾のある一次データが揃った事例だけ追加します。",
  },
]

const BLOG_KNOWLEDGE: KnowledgeChunk[] = [
  ...JAPAN_ENTRY_BLOG_POSTS.map((post) => ({
    locale: "en" as const,
    title: post.title,
    href: `/en/blog/${post.slug}`,
    keywords: [post.title, post.excerpt, post.category, ...post.tags],
    content: `${post.excerpt} ${post.content.slice(0, 900)}`,
  })),
  ...JAPAN_ENTRY_BLOG_POSTS_JA.map((post) => ({
    locale: "ja" as const,
    title: post.title,
    href: `/ja/blog/${post.slug}`,
    keywords: [post.title, post.excerpt, post.category, ...post.tags],
    content: `${post.excerpt} ${post.content.slice(0, 900)}`,
  })),
]

const KNOWLEDGE = [...CORE_KNOWLEDGE, ...BLOG_KNOWLEDGE]

function normalize(value: string): string {
  return value.toLocaleLowerCase().replace(/\s+/g, " ").trim()
}

const EN_STOPWORDS = new Set([
  "a", "an", "and", "are", "can", "does", "for", "how", "in", "is", "it", "of", "on", "or", "the", "this", "to", "what", "when", "where", "who", "why", "with",
])

function scoreChunk(query: string, chunk: KnowledgeChunk): number {
  const normalizedQuery = normalize(query)
  const haystack = normalize(`${chunk.title} ${chunk.content} ${chunk.keywords.join(" ")}`)
  const terms = normalizedQuery
    .split(/[\s,、。.!?？]+/)
    .filter((term) => term.length >= 2 && !EN_STOPWORDS.has(term))
  const matchedTerms = terms.filter((term) => haystack.includes(term)).length
  const exactKeywordHits = chunk.keywords.filter((keyword) => normalizedQuery.includes(normalize(keyword))).length
  if (exactKeywordHits === 0 && matchedTerms < 4) return 0
  return matchedTerms + exactKeywordHits * 2
}

export function retrieveChatKnowledge(query: string, locale: ChatLocale, limit = 4): ChatKnowledgeSource[] {
  return KNOWLEDGE
    .filter((chunk) => chunk.locale === locale)
    .map((chunk) => ({ ...chunk, score: scoreChunk(query, chunk) }))
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit)
}

export function formatChatKnowledge(sources: ChatKnowledgeSource[]): string {
  if (sources.length === 0) return "No directly matching approved source was retrieved. Say that the point requires human confirmation."
  return sources
    .map((source, index) => `[Source ${index + 1}] ${source.title} (${source.href})\n${source.content}`)
    .join("\n\n")
}
