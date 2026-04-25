// ═══════════════════════════════════════════════════════════════
// 提案ページ業種別テンプレート定義
// ═══════════════════════════════════════════════════════════════

// demo_tabs の各タブに業種固有のコンテンツを含む拡張型
export interface DemoTabContent {
  // ホームタブ用
  tagline?: string             // カテゴリタグライン（例: "RESTAURANT"）
  nav_buttons?: string[]       // ナビボタン（例: ["ご予約","メニュー","アクセス"]）
  info_cards?: [string, string][] // アイコン+ラベル（例: [["🕐","営業時間"]]）
  feature_tags?: string[]      // 機能タグ（例: ["🇯🇵 日本語","⚡ Speed 91"]）
  // メニュー/サービスタブ用
  menu_items?: { name: string; price: string; tag: string }[]
  // レビュータブ用（ai_reply_samples をデータから読むので基本不要）
  review_heading?: string      // レビューセクションの見出し
}

export interface DemoTab {
  key: string
  label: string
  content?: DemoTabContent  // 業種固有コンテンツ（省略時は汎用フォールバック）
}

export interface ProposalTemplate {
  id: string
  name: string
  industry: string
  accent: string          // メインアクセントカラー
  accent2: string         // セカンダリアクセント
  gradient: string        // ヒーローグラデーション
  copy_tone: string       // コピーのトーン
  cta_text: string        // CTAボタンテキスト
  cta_url: string         // CTAリンク先
  demo_tabs: DemoTab[]    // デモタブ構成（コンテンツ含む）
  stats: { num: string; label: string; sub: string }[]
  testimonials: { avatar: string; name: string; biz: string; result: string }[]
  loss_context: string    // 損失フレームの文脈
  badge_features: { icon: string; title: string; sub: string }[]
  section_order: string[] // セクション表示順
  // コピーライティングフィールド（DB管理）
  hook_headline?: string        // フックキャッチコピー
  hook_sub?: string             // フックサブテキスト
  pain_headline?: string        // 痛点ヘッドライン
  pain_desc?: string            // 痛点説明
  reciprocity_headline?: string // 返報性ヘッドライン
  bandwagon_headline?: string   // バンドワゴンヘッドライン
  cta_subtitle?: string         // CTAサブテキスト
  trust_points?: string[]       // 安心バッジ
}

export const PROPOSAL_TEMPLATES: ProposalTemplate[] = [
  // ═══ 飲食店 ═══
  {
    id: "restaurant",
    name: "飲食店テンプレート",
    industry: "飲食店",
    accent: "#00D48B",
    accent2: "#00B377",
    gradient: "linear-gradient(140deg, #071A12 0%, #0A2E1C 30%, #0A1219 100%)",
    copy_tone: "warm",
    cta_text: "無料で相談する（15分）",
    cta_url: "https://cal.appexx.me",
    demo_tabs: [
      {
        key: "home", label: "ホーム",
        content: {
          tagline: "RESTAURANT",
          nav_buttons: ["ご予約", "メニュー", "アクセス"],
          info_cards: [["🕐", "営業時間"], ["📍", "アクセス"], ["📞", "お問い合わせ"], ["📅", "ご予約"]],
          feature_tags: ["🇯🇵 日本語", "🇺🇸 English", "🇨🇳 中文", "⚡ Speed 91", "🔒 SSL"],
        },
      },
      {
        key: "reviews", label: "レビュー管理",
        content: { review_heading: "AI返信サンプル（自動生成）" },
      },
      {
        key: "menu", label: "メニュー",
        content: {
          menu_items: [
            { name: "スタンダードプラン", price: "¥8,800/月", tag: "人気No.1" },
            { name: "プロフェッショナル", price: "¥18,800/月", tag: "おすすめ" },
            { name: "エンタープライズ", price: "¥28,800/月", tag: "全機能" },
          ],
        },
      },
    ],
    stats: [
      { num: "847", label: "導入店舗数", sub: "国内外累計" },
      { num: "4.1→4.6", label: "平均評点改善", sub: "3ヶ月後" },
      { num: "92%", label: "12ヶ月継続率", sub: "解約率 8%" },
    ],
    testimonials: [
      { avatar: "T", name: "田中 誠一", biz: "恵比寿 焼肉店", result: "3ヶ月でGoogle評点 3.8 → 4.6" },
      { avatar: "S", name: "Sarah K.", biz: "新宿 ラーメン店", result: "英語返信率 0% → 94%" },
      { avatar: "Y", name: "山田 花子", biz: "渋谷 カフェ", result: "インバウンド来客 月+31人" },
      { avatar: "J", name: "James L.", biz: "浅草 居酒屋", result: "返信業務 月8時間→0分" },
    ],
    loss_context: "口コミ未返信による集客機会の損失",
    badge_features: [
      { icon: "🌐", title: "3言語対応", sub: "JP / EN / ZH" },
      { icon: "⚡", title: "PageSpeed 91点", sub: "現在比 +40点" },
      { icon: "🔒", title: "SSL設定済み", sub: "Let's Encrypt" },
      { icon: "📱", title: "モバイル最適化", sub: "レスポンシブ" },
    ],
    section_order: ["hook", "diagnostic", "reciprocity", "prospect", "bandwagon", "cta"],
  },

  // ═══ 美容室・サロン ═══
  {
    id: "beauty",
    name: "美容室・サロンテンプレート",
    industry: "美容室/サロン",
    accent: "#E879F9",
    accent2: "#C026D3",
    gradient: "linear-gradient(140deg, #1A0A1F 0%, #2D1035 30%, #0A0E12 100%)",
    copy_tone: "elegant",
    cta_text: "無料カウンセリングを予約",
    cta_url: "https://cal.appexx.me",
    demo_tabs: [
      {
        key: "home", label: "トップ",
        content: {
          tagline: "BEAUTY SALON",
          nav_buttons: ["ご予約", "メニュー", "スタイリスト"],
          info_cards: [["💇", "カット・カラー"], ["💅", "ネイル"], ["📸", "ギャラリー"], ["📅", "ご予約"]],
          feature_tags: ["🇯🇵 日本語", "🇺🇸 English", "⚡ Speed 90+", "📸 Before/After", "🔒 SSL"],
        },
      },
      {
        key: "reviews", label: "口コミ管理",
        content: { review_heading: "口コミAI返信サンプル" },
      },
      {
        key: "menu", label: "メニュー・料金",
        content: {
          menu_items: [
            { name: "カット + カラー", price: "¥8,800〜", tag: "人気No.1" },
            { name: "トリートメント付きセット", price: "¥12,800〜", tag: "おすすめ" },
            { name: "ブライダルコース", price: "¥28,000〜", tag: "特別プラン" },
          ],
        },
      },
    ],
    stats: [
      { num: "320+", label: "導入サロン", sub: "全国" },
      { num: "+38%", label: "予約率改善", sub: "平均3ヶ月" },
      { num: "94%", label: "継続率", sub: "12ヶ月" },
    ],
    testimonials: [
      { avatar: "M", name: "美咲", biz: "表参道 ヘアサロン", result: "新規予約 月+42件" },
      { avatar: "R", name: "玲子", biz: "銀座 ネイルサロン", result: "Google評点 3.9→4.7" },
      { avatar: "K", name: "香織", biz: "恵比寿 エステ", result: "リピート率 +23%改善" },
      { avatar: "A", name: "あや", biz: "渋谷 まつエクサロン", result: "検索順位 圏外→3位" },
    ],
    loss_context: "予約に直結する口コミ・HP改善の機会損失",
    badge_features: [
      { icon: "💅", title: "メニュー予約", sub: "ワンクリック予約" },
      { icon: "⚡", title: "PageSpeed 90+", sub: "高速表示" },
      { icon: "📸", title: "ギャラリー", sub: "ビフォーアフター" },
      { icon: "📱", title: "スマホ最適化", sub: "予約率UP" },
    ],
    section_order: ["hook", "diagnostic", "reciprocity", "prospect", "bandwagon", "cta"],
  },

  // ═══ クリニック・医療 ═══
  {
    id: "medical",
    name: "クリニック・医療テンプレート",
    industry: "クリニック/医療",
    accent: "#38BDF8",
    accent2: "#0284C7",
    gradient: "linear-gradient(140deg, #071520 0%, #0C2A40 30%, #0A0E12 100%)",
    copy_tone: "professional",
    cta_text: "無料相談を予約する",
    cta_url: "https://cal.appexx.me",
    demo_tabs: [
      {
        key: "home", label: "トップ",
        content: {
          tagline: "MEDICAL CLINIC",
          nav_buttons: ["診療予約", "診療科目", "医師紹介"],
          info_cards: [["🏥", "診療時間"], ["📍", "アクセス"], ["📞", "お問い合わせ"], ["📅", "Web予約"]],
          feature_tags: ["🇯🇵 日本語", "🇺🇸 English", "⚡ Speed 95", "🔒 SSL/HIPAA", "📱 レスポンシブ"],
        },
      },
      {
        key: "reviews", label: "患者レビュー",
        content: { review_heading: "患者様の声 — AI返信サンプル" },
      },
      {
        key: "menu", label: "診療案内",
        content: {
          menu_items: [
            { name: "一般内科", price: "保険適用", tag: "予約不要" },
            { name: "専門外来", price: "保険適用", tag: "要予約" },
            { name: "自由診療", price: "¥5,500〜", tag: "美容・予防" },
          ],
        },
      },
    ],
    stats: [
      { num: "180+", label: "導入クリニック", sub: "全国" },
      { num: "+52%", label: "新患数改善", sub: "平均6ヶ月" },
      { num: "96%", label: "継続率", sub: "24ヶ月" },
    ],
    testimonials: [
      { avatar: "D", name: "田中 院長", biz: "新宿 内科クリニック", result: "新患 月+28人" },
      { avatar: "S", name: "鈴木 院長", biz: "渋谷 歯科", result: "Google評点 4.2→4.8" },
      { avatar: "I", name: "伊藤 院長", biz: "池袋 皮膚科", result: "HP経由予約 3倍" },
      { avatar: "W", name: "渡辺 院長", biz: "品川 眼科", result: "口コミ返信率 100%" },
    ],
    loss_context: "患者がHP・口コミを見て転院する機会損失",
    badge_features: [
      { icon: "🏥", title: "Web予約", sub: "24時間受付" },
      { icon: "⚡", title: "高速表示", sub: "PageSpeed 90+" },
      { icon: "🔒", title: "SSL/HIPAA", sub: "セキュリティ" },
      { icon: "📱", title: "スマホ対応", sub: "レスポンシブ" },
    ],
    section_order: ["hook", "diagnostic", "reciprocity", "prospect", "bandwagon", "cta"],
  },

  // ═══ 不動産 ═══
  {
    id: "realestate",
    name: "不動産テンプレート",
    industry: "不動産",
    accent: "#F59E0B",
    accent2: "#D97706",
    gradient: "linear-gradient(140deg, #1A1508 0%, #2D2410 30%, #0A0E12 100%)",
    copy_tone: "authoritative",
    cta_text: "無料で集客改善を相談",
    cta_url: "https://cal.appexx.me",
    demo_tabs: [
      {
        key: "home", label: "トップ",
        content: {
          tagline: "REAL ESTATE",
          nav_buttons: ["物件検索", "売買", "相場情報"],
          info_cards: [["🏠", "新着物件"], ["📊", "相場マップ"], ["📞", "お問い合わせ"], ["📅", "内見予約"]],
          feature_tags: ["🇯🇵 日本語", "🇺🇸 English", "⚡ Speed 88", "🗺️ 地図検索", "🔒 SSL"],
        },
      },
      {
        key: "reviews", label: "口コミ管理",
        content: { review_heading: "お客様の声 — AI返信サンプル" },
      },
      {
        key: "menu", label: "物件一覧",
        content: {
          menu_items: [
            { name: "賃貸マンション", price: "¥80,000〜/月", tag: "人気エリア" },
            { name: "売買物件", price: "¥3,500万〜", tag: "新着" },
            { name: "投資物件", price: "利回り5%〜", tag: "注目" },
          ],
        },
      },
    ],
    stats: [
      { num: "210+", label: "導入不動産会社", sub: "全国" },
      { num: "+67%", label: "問い合わせ改善", sub: "平均3ヶ月" },
      { num: "91%", label: "継続率", sub: "12ヶ月" },
    ],
    testimonials: [
      { avatar: "N", name: "中村", biz: "港区 不動産仲介", result: "問い合わせ 月+35件" },
      { avatar: "O", name: "大野", biz: "世田谷 不動産管理", result: "成約率 +18%改善" },
      { avatar: "H", name: "橋本", biz: "豊島区 賃貸", result: "Google掲載順位1位" },
      { avatar: "F", name: "藤田", biz: "横浜 売買仲介", result: "Web経由成約 3倍" },
    ],
    loss_context: "競合のHP・MEO対策による見込み客の流出",
    badge_features: [
      { icon: "🏠", title: "物件検索", sub: "条件絞り込み" },
      { icon: "📊", title: "相場情報", sub: "エリア分析" },
      { icon: "📞", title: "即時問合せ", sub: "ワンクリック" },
      { icon: "📱", title: "スマホ最適化", sub: "レスポンシブ" },
    ],
    section_order: ["hook", "diagnostic", "prospect", "reciprocity", "bandwagon", "cta"],
  },

  // ═══ EC/ネットショップ ═══
  {
    id: "ec",
    name: "EC/ネットショップテンプレート",
    industry: "EC/ネットショップ",
    accent: "#F97316",
    accent2: "#EA580C",
    gradient: "linear-gradient(140deg, #1A0F08 0%, #2D1A0C 30%, #0A0E12 100%)",
    copy_tone: "dynamic",
    cta_text: "無料でEC改善を相談",
    cta_url: "https://cal.appexx.me",
    demo_tabs: [
      {
        key: "home", label: "トップ",
        content: {
          tagline: "ONLINE STORE",
          nav_buttons: ["新着商品", "カテゴリ", "お気に入り"],
          info_cards: [["🛒", "カート"], ["🔍", "商品検索"], ["📦", "配送状況"], ["💳", "お支払い"]],
          feature_tags: ["🇯🇵 日本語", "🇺🇸 English", "⚡ Speed 92", "🛒 カート最適化", "🔒 SSL"],
        },
      },
      {
        key: "reviews", label: "レビュー分析",
        content: { review_heading: "商品レビュー — AI返信サンプル" },
      },
      {
        key: "menu", label: "商品一覧",
        content: {
          menu_items: [
            { name: "スタンダードプラン", price: "¥9,800/月", tag: "Shopify対応" },
            { name: "グロースプラン", price: "¥19,800/月", tag: "CVR最適化" },
            { name: "エンタープライズ", price: "¥39,800/月", tag: "フルカスタム" },
          ],
        },
      },
    ],
    stats: [
      { num: "150+", label: "導入EC", sub: "Shopify/BASE" },
      { num: "+43%", label: "CVR改善", sub: "平均2ヶ月" },
      { num: "89%", label: "継続率", sub: "12ヶ月" },
    ],
    testimonials: [
      { avatar: "E", name: "遠藤", biz: "アパレルEC", result: "CVR 1.2%→2.8%" },
      { avatar: "K", name: "木村", biz: "食品EC", result: "月商 +120万円" },
      { avatar: "T", name: "高橋", biz: "コスメD2C", result: "広告費 -40%で売上維持" },
      { avatar: "M", name: "松本", biz: "雑貨EC", result: "リピート購入率 +31%" },
    ],
    loss_context: "サイト速度・UXの問題によるカート離脱損失",
    badge_features: [
      { icon: "🛒", title: "カート最適化", sub: "離脱率-30%" },
      { icon: "⚡", title: "高速化", sub: "PageSpeed 90+" },
      { icon: "📊", title: "分析", sub: "GA4連携" },
      { icon: "📱", title: "モバイルEC", sub: "レスポンシブ" },
    ],
    section_order: ["hook", "diagnostic", "prospect", "reciprocity", "bandwagon", "cta"],
  },

  // ═══ IT/SaaS ═══
  {
    id: "saas",
    name: "IT/SaaSテンプレート",
    industry: "IT/SaaS",
    accent: "#6366F1",
    accent2: "#4F46E5",
    gradient: "linear-gradient(140deg, #0A0A1F 0%, #12123A 30%, #0A0E12 100%)",
    copy_tone: "technical",
    cta_text: "無料テクニカル相談を予約",
    cta_url: "https://cal.appexx.me",
    demo_tabs: [
      {
        key: "home", label: "トップ",
        content: {
          tagline: "SAAS PLATFORM",
          nav_buttons: ["機能一覧", "料金", "ドキュメント"],
          info_cards: [["🚀", "デプロイ"], ["📊", "ダッシュボード"], ["🔐", "セキュリティ"], ["📡", "API"]],
          feature_tags: ["🌐 多言語", "⚡ Speed 95+", "🔐 SOC2", "📈 GA4+GTM", "🔒 SSL"],
        },
      },
      {
        key: "reviews", label: "ユーザー評価",
        content: { review_heading: "ユーザーレビュー — AI返信サンプル" },
      },
      {
        key: "menu", label: "機能一覧",
        content: {
          menu_items: [
            { name: "スターター", price: "$49/月", tag: "個人向け" },
            { name: "ビジネス", price: "$149/月", tag: "チーム向け" },
            { name: "エンタープライズ", price: "お問合せ", tag: "カスタム" },
          ],
        },
      },
    ],
    stats: [
      { num: "95+", label: "導入企業", sub: "SaaS/スタートアップ" },
      { num: "+85%", label: "リード獲得改善", sub: "平均3ヶ月" },
      { num: "93%", label: "継続率", sub: "12ヶ月" },
    ],
    testimonials: [
      { avatar: "A", name: "安藤 CTO", biz: "AIスタートアップ", result: "リード獲得 月+180件" },
      { avatar: "S", name: "佐藤 PM", biz: "SaaS企業", result: "Trial→有料 +24%" },
      { avatar: "T", name: "田島 CEO", biz: "HR Tech", result: "コンテンツ経由売上 3倍" },
      { avatar: "L", name: "Lee", biz: "FinTech", result: "SEO流入 月+5,000" },
    ],
    loss_context: "テクニカルSEO問題による潜在リードの流出",
    badge_features: [
      { icon: "🚀", title: "高速化", sub: "Core Web Vitals" },
      { icon: "🔐", title: "セキュリティ", sub: "SOC2対応" },
      { icon: "📈", title: "分析基盤", sub: "GA4+GTM" },
      { icon: "🌐", title: "多言語", sub: "i18n対応" },
    ],
    section_order: ["hook", "diagnostic", "prospect", "bandwagon", "reciprocity", "cta"],
  },

  // ═══ 汎用（デフォルト） ═══
  {
    id: "general",
    name: "汎用テンプレート",
    industry: "全業種",
    accent: "#00D48B",
    accent2: "#00B377",
    gradient: "linear-gradient(140deg, #070B0F 0%, #0A1219 30%, #0A0E12 100%)",
    copy_tone: "balanced",
    cta_text: "無料で相談する（15分）",
    cta_url: "https://cal.appexx.me",
    demo_tabs: [
      {
        key: "home", label: "ホーム",
        content: {
          tagline: "BUSINESS",
          nav_buttons: ["サービス", "お問い合わせ", "会社概要"],
          info_cards: [["🕐", "営業時間"], ["📍", "アクセス"], ["📞", "お問い合わせ"], ["📅", "ご予約"]],
          feature_tags: ["🇯🇵 日本語", "🇺🇸 English", "🇨🇳 中文", "⚡ Speed 91", "🔒 SSL"],
        },
      },
      {
        key: "reviews", label: "レビュー管理",
        content: { review_heading: "AI返信サンプル（自動生成）" },
      },
      {
        key: "menu", label: "サービス",
        content: {
          menu_items: [
            { name: "スタンダードプラン", price: "¥8,800/月", tag: "人気No.1" },
            { name: "プロフェッショナル", price: "¥18,800/月", tag: "おすすめ" },
            { name: "エンタープライズ", price: "¥28,800/月", tag: "全機能" },
          ],
        },
      },
    ],
    stats: [
      { num: "847", label: "導入企業数", sub: "全業種累計" },
      { num: "4.1→4.6", label: "平均評点改善", sub: "3ヶ月後" },
      { num: "92%", label: "12ヶ月継続率", sub: "解約率 8%" },
    ],
    testimonials: [
      { avatar: "T", name: "田中 誠一", biz: "恵比寿 飲食店", result: "Google評点 3.8 → 4.6" },
      { avatar: "S", name: "Sarah K.", biz: "新宿 ラーメン店", result: "英語返信率 0% → 94%" },
      { avatar: "Y", name: "山田 花子", biz: "渋谷 美容室", result: "インバウンド来客 月+31人" },
      { avatar: "J", name: "James L.", biz: "浅草 居酒屋", result: "返信業務 月8時間→0分" },
    ],
    loss_context: "競合のデジタル対策による見込み客の流出",
    badge_features: [
      { icon: "🌐", title: "多言語対応", sub: "JP / EN / ZH" },
      { icon: "⚡", title: "PageSpeed 90+", sub: "高速表示" },
      { icon: "🔒", title: "SSL設定済み", sub: "セキュリティ" },
      { icon: "📱", title: "モバイル最適化", sub: "レスポンシブ" },
    ],
    section_order: ["hook", "diagnostic", "reciprocity", "prospect", "bandwagon", "cta"],
  },
]

// ─── 業種マッチングパターン ─────────────────────────────
const INDUSTRY_PATTERNS: { id: string; pattern: RegExp }[] = [
  { id: "restaurant", pattern: /飲食|レストラン|カフェ|バー|居酒屋|寿司|ラーメン|焼肉|食/ },
  { id: "beauty",     pattern: /美容|サロン|ヘア|ネイル|エステ|まつ/ },
  { id: "medical",    pattern: /クリニック|医|歯科|病院|整骨|薬局|眼科|皮膚/ },
  { id: "realestate", pattern: /不動産|賃貸|物件|マンション|住宅/ },
  { id: "ec",         pattern: /ec|ショップ|通販|shopify|base|stores|d2c|コスメ|アパレル/ },
  { id: "saas",       pattern: /it|saas|テック|スタートアップ|ソフトウェア|ai|fintech|hrtech/ },
]

// 業種名からテンプレートを自動選択（ハードコードfallback）
export function matchTemplate(category?: string): ProposalTemplate {
  if (!category) return PROPOSAL_TEMPLATES.find(t => t.id === "general")!
  const cat = category.toLowerCase()
  for (const { id, pattern } of INDUSTRY_PATTERNS) {
    if (pattern.test(cat)) return PROPOSAL_TEMPLATES.find(t => t.id === id)!
  }
  return PROPOSAL_TEMPLATES.find(t => t.id === "general")!
}

// ─── DBテンプレート → ProposalTemplate変換 ─────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dbTemplateToProposal(dbTpl: Record<string, any>): ProposalTemplate {
  return {
    id: dbTpl.template_key || dbTpl.id,
    name: dbTpl.name || "テンプレート",
    industry: dbTpl.industry || "全業種",
    accent: dbTpl.accent_color || dbTpl.accent || "#00D48B",
    accent2: dbTpl.accent2 || dbTpl.accent_color || "#00B377",
    gradient: dbTpl.gradient || "linear-gradient(140deg, #070B0F 0%, #0A1219 30%, #0A0E12 100%)",
    copy_tone: dbTpl.copy_tone || "balanced",
    cta_text: dbTpl.cta_text || "無料で相談する（15分）",
    cta_url: dbTpl.cta_url || "https://cal.appexx.me",
    demo_tabs: dbTpl.demo_tabs || [
      { key: "home", label: "ホーム" },
      { key: "reviews", label: "レビュー管理" },
      { key: "menu", label: "サービス" },
    ],
    stats: dbTpl.stats || [],
    testimonials: dbTpl.testimonials || [],
    loss_context: dbTpl.loss_context || "",
    badge_features: dbTpl.badge_features || [],
    section_order: dbTpl.section_order || ["hook", "diagnostic", "reciprocity", "prospect", "bandwagon", "cta"],
    hook_headline: dbTpl.hook_headline,
    hook_sub: dbTpl.hook_sub,
    pain_headline: dbTpl.pain_headline,
    pain_desc: dbTpl.pain_desc,
    reciprocity_headline: dbTpl.reciprocity_headline,
    bandwagon_headline: dbTpl.bandwagon_headline,
    cta_subtitle: dbTpl.cta_subtitle,
    trust_points: dbTpl.trust_points,
  }
}

// ─── DB優先テンプレート取得（DB → ハードコードfallback） ─────
export function matchTemplateWithDB(
  category?: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dbTemplate?: Record<string, any> | null
): ProposalTemplate {
  // DBテンプレートがあればそれを優先
  if (dbTemplate && (dbTemplate.template_key || dbTemplate.accent_color)) {
    return dbTemplateToProposal(dbTemplate)
  }
  // ハードコードfallback
  return matchTemplate(category)
}

// ═══════════════════════════════════════════════════════════════
// 条件分岐パターンマッチングエンジン
// ═══════════════════════════════════════════════════════════════

export interface PatternConditions {
  industries?: string[]     // 業種（いずれかにマッチ）
  tiers?: string[]          // ティア S/A/B/C（いずれか）
  has_email?: boolean       // メール有無
  has_website?: boolean     // HP有無
  prefectures?: string[]    // 都道府県（いずれか）
  groups?: string[]         // リードグループID（いずれか）
  score_min?: number        // match_score >= X
  score_max?: number        // match_score <= X
  products?: string[]       // primary_product（いずれか）
  countries?: string[]      // 国コード（いずれか）
}

export interface PagePattern {
  id: string
  name: string
  description?: string
  conditions: PatternConditions
  template_data: Partial<ProposalTemplate> & Record<string, unknown>
  layout_type: string
  priority: number
  is_active: boolean
}

export interface ProspectMatchContext {
  category?: string
  tier?: string
  has_email?: boolean
  has_website?: boolean
  address?: string          // 都道府県抽出用
  groups?: string[]         // 所属グループID
  match_score?: number
  primary_product?: string
  country?: string
}

// 都道府県リスト（住所から抽出用）
const PREFECTURES = [
  "北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県",
  "茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県",
  "新潟県","富山県","石川県","福井県","山梨県","長野県",
  "岐阜県","静岡県","愛知県","三重県",
  "滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県",
  "鳥取県","島根県","岡山県","広島県","山口県",
  "徳島県","香川県","愛媛県","高知県",
  "福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県",
]

function extractPrefecture(address?: string): string | null {
  if (!address) return null
  for (const pref of PREFECTURES) {
    if (address.includes(pref)) return pref
  }
  return null
}

// 単一パターンが条件にマッチするかチェック
function matchesConditions(pattern: PagePattern, ctx: ProspectMatchContext): boolean {
  const c = pattern.conditions
  if (!c || Object.keys(c).length === 0) return true // 空条件 = 常にマッチ（デフォルト）

  // 業種マッチ
  if (c.industries && c.industries.length > 0) {
    if (!ctx.category) return false
    const cat = ctx.category.toLowerCase()
    const matched = c.industries.some(ind => cat.includes(ind.toLowerCase()) || ind.toLowerCase().includes(cat))
    if (!matched) return false
  }

  // ティアマッチ
  if (c.tiers && c.tiers.length > 0) {
    if (!ctx.tier || !c.tiers.includes(ctx.tier)) return false
  }

  // メール有無
  if (c.has_email !== undefined && c.has_email !== null) {
    if (ctx.has_email !== c.has_email) return false
  }

  // HP有無
  if (c.has_website !== undefined && c.has_website !== null) {
    if (ctx.has_website !== c.has_website) return false
  }

  // 都道府県
  if (c.prefectures && c.prefectures.length > 0) {
    const pref = extractPrefecture(ctx.address)
    if (!pref || !c.prefectures.includes(pref)) return false
  }

  // グループ
  if (c.groups && c.groups.length > 0) {
    if (!ctx.groups || !ctx.groups.some(g => c.groups!.includes(g))) return false
  }

  // スコア範囲
  if (c.score_min !== undefined && (ctx.match_score === undefined || ctx.match_score < c.score_min)) return false
  if (c.score_max !== undefined && (ctx.match_score === undefined || ctx.match_score > c.score_max)) return false

  // primary_product
  if (c.products && c.products.length > 0) {
    if (!ctx.primary_product || !c.products.includes(ctx.primary_product)) return false
  }

  // 国コード
  if (c.countries && c.countries.length > 0) {
    if (!ctx.country || !c.countries.includes(ctx.country)) return false
  }

  return true
}

// パターン一覧からprospectに最適なパターンを選択
// A/Bテスト: 同一優先度のパターンが複数マッチした場合ランダムで1つ選択
export function selectPattern(patterns: PagePattern[], ctx: ProspectMatchContext): PagePattern | null {
  const sorted = [...patterns].filter(p => p.is_active).sort((a, b) => b.priority - a.priority)

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i]
    if (!matchesConditions(p, ctx)) continue

    // 同一優先度のマッチパターンを全て集める（A/Bテスト用）
    const samePriority = [p]
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].priority !== p.priority) break
      if (matchesConditions(sorted[j], ctx)) samePriority.push(sorted[j])
    }

    // 複数ある場合はランダム選択（A/Bテスト）
    if (samePriority.length > 1) {
      return samePriority[Math.floor(Math.random() * samePriority.length)]
    }
    return p
  }

  return null
}

// パターンのtemplate_dataをProposalTemplateにマージ
export function applyPatternToTemplate(
  baseTemplate: ProposalTemplate,
  pattern: PagePattern
): ProposalTemplate {
  const td = pattern.template_data
  // Sanitize AI-generated arrays: ensure each item's fields are strings (prevent React "Objects are not valid as React child" crash)
  const safeStats: ProposalTemplate["stats"] | undefined = Array.isArray(td.stats)
    ? td.stats.map((s: Record<string, unknown>) => ({
        num: String(s?.num ?? ""),
        label: String(s?.label ?? ""),
        sub: String(s?.sub ?? ""),
      }))
    : undefined
  const safeTestimonials: ProposalTemplate["testimonials"] | undefined = Array.isArray(td.testimonials)
    ? td.testimonials.map((t: Record<string, unknown>) => ({
        avatar: String(t?.avatar ?? "👤"),
        name: String(t?.name ?? ""),
        biz: String(t?.biz ?? ""),
        result: String(t?.result ?? ""),
      }))
    : undefined
  return {
    ...baseTemplate,
    ...(td.accent ? { accent: String(td.accent) } : {}),
    ...(td.accent2 ? { accent2: String(td.accent2) } : {}),
    ...(td.gradient ? { gradient: String(td.gradient) } : {}),
    ...(td.copy_tone ? { copy_tone: String(td.copy_tone) } : {}),
    ...(td.cta_text ? { cta_text: String(td.cta_text) } : {}),
    ...(td.cta_url ? { cta_url: String(td.cta_url) } : {}),
    ...(td.cta_subtitle ? { cta_subtitle: String(td.cta_subtitle) } : {}),
    ...(td.hook_sub ? { hook_sub: String(td.hook_sub) } : {}),
    ...(td.pain_headline ? { pain_headline: String(td.pain_headline) } : {}),
    ...(td.pain_desc ? { pain_desc: String(td.pain_desc) } : {}),
    ...(td.reciprocity_headline ? { reciprocity_headline: String(td.reciprocity_headline) } : {}),
    ...(td.bandwagon_headline ? { bandwagon_headline: String(td.bandwagon_headline) } : {}),
    ...(td.loss_context ? { loss_context: String(td.loss_context) } : {}),
    ...(td.demo_tabs ? { demo_tabs: td.demo_tabs as DemoTab[] } : {}),
    ...(safeStats ? { stats: safeStats } : {}),
    ...(safeTestimonials ? { testimonials: safeTestimonials } : {}),
    ...(td.badge_features ? { badge_features: td.badge_features as ProposalTemplate["badge_features"] } : {}),
    ...(td.section_order ? { section_order: td.section_order as string[] } : {}),
  }
}

// 完全マッチングフロー: DBパターン → 業種テンプレート → デフォルト
export function matchTemplateWithPatterns(
  patterns: PagePattern[],
  ctx: ProspectMatchContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dbTemplate?: Record<string, any> | null
): { template: ProposalTemplate; pattern: PagePattern | null } {
  // 1. DBパターンからマッチ
  const pattern = selectPattern(patterns, ctx)

  // 2. ベーステンプレート取得（DB or ハードコード）
  const base = matchTemplateWithDB(ctx.category, dbTemplate)

  // 3. パターンのtemplate_dataでオーバーライド
  if (pattern) {
    return { template: applyPatternToTemplate(base, pattern), pattern }
  }

  return { template: base, pattern: null }
}
