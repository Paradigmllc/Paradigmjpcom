import type { ContentLocale } from "./catalog"

export interface ContentApiCopy {
  eyebrow: string
  title: string
  highlight: string
  description: string
  statusReady: string
  statusPending: string
  catalogCta: string
  inquiryCta: string
  modelTitle: string
  modelDescription: string
  tiers: Array<{ label: string; title: string; price: string; description: string }>
  endpointsTitle: string
  endpointsDescription: string
  catalogTitle: string
  catalogDescription: string
  catalogEmpty: string
  catalogError: string
  flowTitle: string
  flowDescription: string
  flow: Array<{ step: string; title: string; description: string }>
  principlesTitle: string
  principles: string[]
  docsLink: string
}

const COPY: Record<ContentLocale, ContentApiCopy> = {
  en: {
    eyebrow: "CONTENT COMMERCE / API + x402",
    title: "Japan intelligence,",
    highlight: "ready for software and agents.",
    description: "Discover public articles for free, then buy structured decision packets per request in USDC. High-touch Japan execution remains available when an API response is not enough.",
    statusReady: "x402 settlement ready",
    statusPending: "x402 settlement setup pending",
    catalogCta: "Open JSON catalog",
    inquiryCta: "Discuss licensed access",
    modelTitle: "One content base, three revenue paths",
    modelDescription: "Keep discovery open, charge for machine-ready decision data, and graduate repeated demand into a contracted data or operating relationship.",
    tiers: [
      { label: "01 / DISCOVER", title: "Public Content API", price: "Free", description: "Published article metadata and full text in JSON or Markdown for search, citation and prototyping." },
      { label: "02 / TRANSACT", title: "x402 Decision Packets", price: "0.25 USDC / request", description: "Structured Japan entry, capital and supplier qualification frameworks without signup or an API key." },
      { label: "03 / OPERATE", title: "Licensed API + Japan Desk", price: "Contract", description: "Higher limits, custom data and human execution for products that need recurring Japan operations." },
    ],
    endpointsTitle: "Versioned endpoints",
    endpointsDescription: "All public reads are CORS-enabled. x402 endpoints use protocol v2 headers: PAYMENT-REQUIRED, PAYMENT-SIGNATURE and PAYMENT-RESPONSE.",
    catalogTitle: "Premium catalog",
    catalogDescription: "The catalog is stored in the operating database, so pricing, versions and payloads can be changed without rebuilding the public pages.",
    catalogEmpty: "No premium products are published for this locale yet.",
    catalogError: "The premium catalog is temporarily unavailable. The free Content API remains available.",
    flowTitle: "How a paid request works",
    flowDescription: "The buyer stays in normal HTTP: discover, receive a 402 challenge, sign the requested USDC payment, then retry the same URL.",
    flow: [
      { step: "01", title: "Discover", description: "Read the free catalog or use an x402 Bazaar-compatible discovery client." },
      { step: "02", title: "Receive 402", description: "The API returns price, Base network and recipient requirements in PAYMENT-REQUIRED." },
      { step: "03", title: "Pay and retry", description: "The client signs a USDC authorization and retries with PAYMENT-SIGNATURE." },
      { step: "04", title: "Use the packet", description: "After verification and settlement, the API returns the packet and PAYMENT-RESPONSE." },
    ],
    principlesTitle: "Commercial guardrails",
    principles: ["Marketing articles stay discoverable and indexable", "Paid payloads carry source, version, timestamp and license metadata", "No personal lead data or regulated advice is sold through the API", "Payment signatures are never stored; only a one-way settlement reference is retained"],
    docsLink: "Read the x402 protocol documentation",
  },
  ja: {
    eyebrow: "コンテンツコマース / API + x402",
    title: "日本市場の知見を、",
    highlight: "ソフトウェアとAIエージェントにも販売する。",
    description: "公開記事は無料で検索・取得でき、意思決定に使える構造化データはUSDCで1リクエストずつ購入できます。APIだけで足りない案件は、従来どおり日本側の実行支援へ接続します。",
    statusReady: "x402決済 稼働中",
    statusPending: "x402決済 接続準備中",
    catalogCta: "JSONカタログを開く",
    inquiryCta: "法人ライセンスを相談する",
    modelTitle: "1つのコンテンツ基盤から、3つの収益導線へ",
    modelDescription: "発見は無料、機械処理できる意思決定データは従量課金、反復需要は法人API契約または日本側の運用契約へ引き上げます。",
    tiers: [
      { label: "01 / 発見", title: "公開Content API", price: "無料", description: "公開済み記事のメタデータと全文をJSONまたはMarkdownで提供。検索・引用・試作に利用できます。" },
      { label: "02 / 取引", title: "x402 Decision Packet", price: "0.25 USDC / 回", description: "会員登録やAPIキーなしで、日本参入・資産・サプライヤー評価の構造化フレームを購入できます。" },
      { label: "03 / 運用", title: "法人API + Japan Desk", price: "個別契約", description: "高レート、独自データ、継続的な日本側実行を必要とするサービス向けです。" },
    ],
    endpointsTitle: "バージョン固定のAPI",
    endpointsDescription: "公開GETはCORS対応。x402はv2のPAYMENT-REQUIRED、PAYMENT-SIGNATURE、PAYMENT-RESPONSEヘッダーを使用します。",
    catalogTitle: "プレミアム商品カタログ",
    catalogDescription: "価格・バージョン・配信内容は運用DBで管理し、公開ページの再ビルドなしで更新できます。",
    catalogEmpty: "この言語で公開中のプレミアム商品はまだありません。",
    catalogError: "プレミアムカタログを一時的に取得できません。無料Content APIは利用できます。",
    flowTitle: "従量課金リクエストの流れ",
    flowDescription: "通常のHTTPのまま、発見、402応答、USDC支払い署名、同一URLへの再送を行います。",
    flow: [
      { step: "01", title: "発見", description: "無料カタログ、またはx402 Bazaar互換クライアントから商品を見つけます。" },
      { step: "02", title: "402を受信", description: "PAYMENT-REQUIREDに価格、Baseネットワーク、受取条件が返ります。" },
      { step: "03", title: "署名して再送", description: "クライアントがUSDC支払いを承認し、PAYMENT-SIGNATURE付きで再送します。" },
      { step: "04", title: "データを利用", description: "検証・決済後、構造化データとPAYMENT-RESPONSEを受け取ります。" },
    ],
    principlesTitle: "販売上のガードレール",
    principles: ["マーケティング記事は検索・閲覧可能なまま維持", "有料データには出典・版・更新日時・ライセンスを付与", "個人リード情報や規制対象の助言はAPI販売しない", "支払い署名は保存せず、決済レスポンスの一方向ハッシュだけを記録"],
    docsLink: "x402プロトコルの公式ドキュメントを見る",
  },
}

export function getContentApiCopy(locale: ContentLocale): ContentApiCopy {
  return COPY[locale]
}
