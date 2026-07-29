export type MarketingVisualLocale = "ja" | "en"
export type MarketingVisualKind = "general" | "video" | "japan" | "web" | "legal"

export interface MarketingVisualSlide {
  src: string
  label: string
  title: string
  body: string
  alt: string
}

export interface MarketingVisualProcessRow {
  phase: string
  focus: string
  output: string
}

export interface MarketingVisualProfile {
  locale: MarketingVisualLocale
  kind: MarketingVisualKind
  compact: boolean
  showVideo: boolean
  eyebrow: string
  title: string
  description: string
  carouselLabel: string
  previousLabel: string
  nextLabel: string
  tableCaption: string
  tableHeaders: [string, string, string]
  slides: MarketingVisualSlide[]
  process: MarketingVisualProcessRow[]
}

const ASSETS = {
  execution: "/visuals/brand/execution-studio.webp",
  video: "/visuals/brand/video-production-system.webp",
  japan: "/visuals/brand/japan-market-system.webp",
  web: "/visuals/brand/web-ai-system.webp",
} as const

const excludedRoutePattern =
  /^\/(?:admin|api|cms|sales|work|work-report|p|report|d|demo|generated|preview|opportunity|studio|themes-showcase)(?:\/|$)/

const legalRoutes = new Set([
  "/legal",
  "/privacy",
  "/refund",
  "/terms",
  "/video-as-a-service/terms",
])

const videoRoutes = ["/video", "/video-as-a-service"]
const japanRoutes = ["/japan-market-partner", "/package", "/tools/japan-entry-score"]
const webRoutes = ["/services/web", "/services/ai", "/services/seo", "/services/meo", "/lp"]

export function getMarketingVisualLocale(pathname: string): MarketingVisualLocale {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "ja"
}

export function getLocaleFreeRoute(pathname: string): string {
  const route = pathname.replace(/^\/(?:ja|en)(?=\/|$)/, "") || "/"
  return route.length > 1 ? route.replace(/\/+$/, "") : route
}

export function getMarketingVisualKind(pathname: string): MarketingVisualKind | null {
  const route = getLocaleFreeRoute(pathname)
  const locale = getMarketingVisualLocale(pathname)
  if (excludedRoutePattern.test(route)) return null
  if (legalRoutes.has(route)) return "legal"
  if (videoRoutes.some((prefix) => route === prefix || route.startsWith(`${prefix}/`))) return "video"
  if (japanRoutes.some((prefix) => route === prefix || route.startsWith(`${prefix}/`))) return "japan"
  if (webRoutes.some((prefix) => route === prefix || route.startsWith(`${prefix}/`))) return "web"
  if (locale === "en" && (route === "/" || route === "/services")) return "japan"
  return "general"
}

const slideCopy = {
  ja: {
    execution: {
      label: "統合設計",
      title: "制作物ではなく、実行の流れを設計",
      body: "動画・Web・AIの作業を、判断と受け渡しが見える一つの運用にまとめます。",
      alt: "動画、Web、AIの制作工程を一つに接続した抽象的な3Dシステム",
    },
    video: {
      label: "動画運用",
      title: "企画から納品までを繰り返せる形に",
      body: "企画、素材、編集、レビュー、納品の流れを整理し、継続運用しやすくします。",
      alt: "企画から編集、レビュー、納品までを表す動画制作ラインの3Dビジュアル",
    },
    japan: {
      label: "日本市場",
      title: "市場理解とローカル実行を接続",
      body: "調査だけで終わらせず、メッセージ、導線、接点づくりまで具体化します。",
      alt: "日本市場の調査、ローカライズ、実行をつなぐ抽象的な3Dマップ",
    },
    web: {
      label: "Web・AI",
      title: "公開後の改善まで見据えた構成",
      body: "ページ、コンテンツ、データ、AI活用を分断せず、次の改善につなげます。",
      alt: "Web画面、コンテンツ、AI処理が接続されたモジュール型の3Dシステム",
    },
  },
  en: {
    execution: {
      label: "Integrated delivery",
      title: "Design the operating flow, not just the asset",
      body: "Video, web, and AI work are coordinated in one visible system for decisions and handoffs.",
      alt: "Abstract 3D system connecting video, web, and AI production workflows",
    },
    video: {
      label: "Video operations",
      title: "A repeatable path from plan to delivery",
      body: "Planning, assets, editing, review, and delivery are organized for ongoing production.",
      alt: "3D video production line representing planning, editing, review, and delivery",
    },
    japan: {
      label: "Japan market",
      title: "Connect market understanding to local execution",
      body: "Move from research into localized messages, routes to market, and practical market contact.",
      alt: "Abstract 3D map connecting Japan market research, localization, and execution",
    },
    web: {
      label: "Web and AI",
      title: "Build for the improvement after launch",
      body: "Pages, content, data, and AI workflows stay connected to the next useful iteration.",
      alt: "Modular 3D system connecting web interfaces, content, and AI processing",
    },
  },
} as const

const processCopy: Record<
  MarketingVisualLocale,
  Record<Exclude<MarketingVisualKind, "legal">, MarketingVisualProcessRow[]>
> = {
  ja: {
    general: [
      { phase: "01 整理", focus: "目的・優先順位・制約", output: "実行スコープ" },
      { phase: "02 制作", focus: "動画・Web・AI", output: "確認できる成果物" },
      { phase: "03 レビュー", focus: "判断・修正・承認", output: "合意された更新" },
      { phase: "04 納品", focus: "公開・受け渡し・次の一手", output: "運用可能な状態" },
    ],
    video: [
      { phase: "01 企画", focus: "目的・視聴者・媒体", output: "構成と制作方針" },
      { phase: "02 制作", focus: "台本・素材・編集", output: "レビュー版" },
      { phase: "03 確認", focus: "内容・表現・尺", output: "修正版" },
      { phase: "04 納品", focus: "用途別の書き出し", output: "運用可能な動画" },
    ],
    japan: [
      { phase: "01 調査", focus: "市場・競合・顧客仮説", output: "判断材料" },
      { phase: "02 翻訳", focus: "価値・言葉・導線", output: "日本向けメッセージ" },
      { phase: "03 実行", focus: "接点・提案・検証", output: "市場からの反応" },
      { phase: "04 学習", focus: "反応・課題・選択肢", output: "次の意思決定" },
    ],
    web: [
      { phase: "01 設計", focus: "利用者・目的・情報", output: "画面と導線" },
      { phase: "02 構築", focus: "UI・コンテンツ・機能", output: "動くページ" },
      { phase: "03 接続", focus: "データ・自動化・AI", output: "つながる運用" },
      { phase: "04 改善", focus: "利用状況・課題・仮説", output: "次の更新" },
    ],
  },
  en: {
    general: [
      { phase: "01 Frame", focus: "Goal, priority, constraints", output: "Execution scope" },
      { phase: "02 Create", focus: "Video, web, and AI", output: "Reviewable work" },
      { phase: "03 Review", focus: "Decide, revise, approve", output: "Agreed update" },
      { phase: "04 Deliver", focus: "Launch, handoff, next step", output: "Operational state" },
    ],
    video: [
      { phase: "01 Plan", focus: "Goal, audience, channel", output: "Creative direction" },
      { phase: "02 Create", focus: "Script, assets, edit", output: "Review cut" },
      { phase: "03 Review", focus: "Message, expression, length", output: "Revised cut" },
      { phase: "04 Deliver", focus: "Channel-ready exports", output: "Usable video" },
    ],
    japan: [
      { phase: "01 Research", focus: "Market, rivals, buyer thesis", output: "Decision inputs" },
      { phase: "02 Localize", focus: "Value, language, journey", output: "Japan message" },
      { phase: "03 Activate", focus: "Contacts, offer, validation", output: "Market response" },
      { phase: "04 Learn", focus: "Signals, friction, options", output: "Next decision" },
    ],
    web: [
      { phase: "01 Frame", focus: "User, goal, information", output: "Interface and journey" },
      { phase: "02 Build", focus: "UI, content, function", output: "Working page" },
      { phase: "03 Connect", focus: "Data, automation, AI", output: "Joined-up operation" },
      { phase: "04 Improve", focus: "Usage, friction, hypothesis", output: "Next iteration" },
    ],
  },
}

function orderedSlides(locale: MarketingVisualLocale, kind: MarketingVisualKind): MarketingVisualSlide[] {
  const copy = slideCopy[locale]
  const keys =
    kind === "video"
      ? (["video", "execution", "web", "japan"] as const)
      : kind === "japan"
        ? (["japan", "execution", "web", "video"] as const)
        : kind === "web"
          ? (["web", "execution", "video", "japan"] as const)
          : (["execution", "video", "japan", "web"] as const)

  return keys.map((key) => ({ src: ASSETS[key], ...copy[key] }))
}

export function resolveMarketingVisualProfile(pathname: string): MarketingVisualProfile | null {
  const locale = getMarketingVisualLocale(pathname)
  const kind = getMarketingVisualKind(pathname)
  if (!kind) return null

  if (kind === "legal") {
    return {
      locale,
      kind,
      compact: true,
      showVideo: false,
      eyebrow: locale === "ja" ? "INFORMATION MAP" : "INFORMATION MAP",
      title: locale === "ja" ? "重要事項を、順序立てて確認" : "Review the important information in order",
      description:
        locale === "ja"
          ? "適用範囲、条件、問い合わせ先を分け、必要な情報へ迷わず進める構成です。"
          : "Scope, conditions, and contact routes are separated so the relevant information stays easy to find.",
      carouselLabel: locale === "ja" ? "情報構成の図解" : "Information structure visual",
      previousLabel: locale === "ja" ? "前へ" : "Previous",
      nextLabel: locale === "ja" ? "次へ" : "Next",
      tableCaption: locale === "ja" ? "確認の順序" : "Review order",
      tableHeaders: locale === "ja" ? ["項目", "確認内容", "次の行動"] : ["Area", "Review", "Next action"],
      slides: orderedSlides(locale, "general").slice(0, 1),
      process:
        locale === "ja"
          ? [
              { phase: "01 適用範囲", focus: "対象となるサービス・利用者", output: "該当条件を確認" },
              { phase: "02 条件", focus: "権利・責任・取り扱い", output: "重要事項を確認" },
              { phase: "03 連絡", focus: "不明点・個別確認", output: "問い合わせへ" },
            ]
          : [
              { phase: "01 Scope", focus: "Relevant service and user", output: "Confirm applicability" },
              { phase: "02 Conditions", focus: "Rights, duties, and handling", output: "Review key terms" },
              { phase: "03 Contact", focus: "Questions and specific cases", output: "Use the contact route" },
            ],
    }
  }

  const headings = {
    ja: {
      general: ["DELIVERY SYSTEM", "実行の中身が見える、統合デリバリー体制", "企画から公開後の改善まで、作業・判断・受け渡しを一つの流れとして可視化します。"],
      video: ["VIDEO OPERATIONS", "動画制作を、単発作業から継続運用へ", "企画、制作、レビュー、用途別納品までを、繰り返し使える制作ラインとして整えます。"],
      japan: ["JAPAN MARKET SYSTEM", "日本市場の理解と実行を、一つの流れに", "調査、ローカライズ、接点づくり、学習までを分断せず、次の判断につなげます。"],
      web: ["WEB & AI SYSTEM", "Web・AIの制作から改善までを接続", "画面、コンテンツ、データ、自動化をつなぎ、公開後も改善できる状態をつくります。"],
    },
    en: {
      general: ["DELIVERY SYSTEM", "A visible, integrated delivery system", "Work, decisions, and handoffs stay connected from planning through post-launch improvement."],
      video: ["VIDEO OPERATIONS", "Move video from one-off production to ongoing operations", "Planning, production, review, and channel-ready delivery become a repeatable production line."],
      japan: ["JAPAN MARKET SYSTEM", "Connect Japan-market understanding to execution", "Research, localization, market contact, and learning stay joined to the next decision."],
      web: ["WEB & AI SYSTEM", "Connect web and AI delivery to improvement", "Interfaces, content, data, and automation are built to keep improving after launch."],
    },
  } as const
  const [eyebrow, title, description] = headings[locale][kind]

  return {
    locale,
    kind,
    compact: false,
    showVideo: kind === "general" || kind === "video",
    eyebrow,
    title,
    description,
    carouselLabel: locale === "ja" ? "制作・運用イメージのスライダー" : "Delivery system image carousel",
    previousLabel: locale === "ja" ? "前の画像" : "Previous image",
    nextLabel: locale === "ja" ? "次の画像" : "Next image",
    tableCaption: locale === "ja" ? "実行フロー" : "Execution flow",
    tableHeaders: locale === "ja" ? ["フェーズ", "主な確認内容", "見える成果"] : ["Phase", "Primary focus", "Visible output"],
    slides: orderedSlides(locale, kind),
    process: processCopy[locale][kind],
  }
}
