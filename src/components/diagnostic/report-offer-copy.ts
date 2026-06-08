import type { ReportLang } from "./report-copy"
import type { TemplateVariant } from "@/lib/sales/routing"

export type ReportOfferCopy = {
  reportLabel: string
  badge: string
  heroLead: string
  primaryCta: string
  finalHeading: string
  finalBody: string
  screenshotAlt: string
}

export type OfferCopyByLanguage = {
  ja: ReportOfferCopy
  en: ReportOfferCopy
}

const WEBSITE: OfferCopyByLanguage = {
  ja: {
    reportLabel: "Web成長診断レポート",
    badge: "Web成長診断",
    heroLead: "公開データ、取得済みシグナル、改善デモをもとに、売上・信頼・問い合わせ導線のどこから直すべきかを整理しました。",
    primaryCta: "改善デモを見る",
    finalHeading: "30分で、最初に直すべき一点を決める",
    finalBody: "大きな作り直しの前に、売上機会・信頼形成・問い合わせ導線のどこが最も回収しやすいかを一緒に確認します。",
    screenshotAlt: "Webサイト診断スクリーンショット",
  },
  en: {
    reportLabel: "Website growth diagnostic report",
    badge: "Website growth assessment",
    heroLead: "We translated public evidence, collected signals, and the improvement demo into a clear first move across revenue, trust, and inquiry flow.",
    primaryCta: "View improvement demo",
    finalHeading: "Use 30 minutes to choose the first fix",
    finalBody: "Before a large rebuild, identify the easiest recovery path across revenue opportunity, trust proof, and inquiry flow.",
    screenshotAlt: "Website diagnostic screenshot",
  },
}

const JAPAN_ENTRY: OfferCopyByLanguage = {
  ja: {
    reportLabel: "日本市場参入診断レポート",
    badge: "日本市場参入診断",
    heroLead: "海外企業が日本市場に入る前に確認すべき、言語・信頼・販売導線・ローカル運用の優先順位を整理しました。",
    primaryCta: "日本参入プランを見る",
    finalHeading: "日本市場で最初に整えるべき一点を決める",
    finalBody: "翻訳だけで始める前に、どの証拠・導線・運用体制が日本の見込み客に信頼されるかを確認します。",
    screenshotAlt: "日本市場参入診断スクリーンショット",
  },
  en: {
    reportLabel: "Japan entry diagnostic report",
    badge: "Japan entry assessment",
    heroLead: "We mapped the language, trust, sales-flow, and local operating gaps to clarify the first move for entering Japan.",
    primaryCta: "View Japan entry plan",
    finalHeading: "Choose the first Japan-entry fix",
    finalBody: "Before translating everything, confirm which proof, workflow, and local operating layer will make the offer credible in Japan.",
    screenshotAlt: "Japan entry diagnostic screenshot",
  },
}

const VIDEO: OfferCopyByLanguage = {
  ja: {
    reportLabel: "動画成長診断レポート",
    badge: "動画成長診断",
    heroLead: "顧客獲得・信頼形成・継続接点に効く動画導線を、既存データと制作オペレーションの両面から整理しました。",
    primaryCta: "動画プランを見る",
    finalHeading: "最初に量産すべき動画タイプを決める",
    finalBody: "単発動画ではなく、どの商談・教育・納品接点を動画化すると最も効果が出るかを確認します。",
    screenshotAlt: "動画診断スクリーンショット",
  },
  en: {
    reportLabel: "Video growth diagnostic report",
    badge: "Video growth assessment",
    heroLead: "We mapped where video can improve acquisition, trust, and repeat contact using both market evidence and production workflow signals.",
    primaryCta: "View video plan",
    finalHeading: "Choose the first video format to scale",
    finalBody: "Instead of one-off videos, decide which sales, education, or delivery touchpoint should become the repeatable video line.",
    screenshotAlt: "Video diagnostic screenshot",
  },
}

const OUTREACH: OfferCopyByLanguage = {
  ja: {
    reportLabel: "営業自動化診断レポート",
    badge: "営業自動化診断",
    heroLead: "見込み客リスト、提案文、フォーム営業、追客のどこを自動化すべきかを、取得済みシグナルから整理しました。",
    primaryCta: "営業導線を見る",
    finalHeading: "最初に自動化する営業工程を決める",
    finalBody: "闇雲に自動化するのではなく、売上回収に近い工程から小さく実装します。",
    screenshotAlt: "営業自動化診断スクリーンショット",
  },
  en: {
    reportLabel: "Revenue automation diagnostic report",
    badge: "Revenue automation assessment",
    heroLead: "We mapped which part of prospecting, proposal copy, outreach, and follow-up should be automated first.",
    primaryCta: "View revenue workflow",
    finalHeading: "Choose the first sales workflow to automate",
    finalBody: "Start with the workflow closest to revenue recovery instead of automating everything at once.",
    screenshotAlt: "Revenue automation diagnostic screenshot",
  },
}

const SECURITY: OfferCopyByLanguage = {
  ja: {
    reportLabel: "信頼・セキュリティ診断レポート",
    badge: "信頼・セキュリティ診断",
    heroLead: "公開状態から見える信頼表示・運用基盤・更新鮮度の懸念を、商談前の不安解消という観点で整理しました。",
    primaryCta: "信頼改善プランを見る",
    finalHeading: "信頼を落としている一点を先に直す",
    finalBody: "技術項目の羅列ではなく、見込み客が不安を感じる接点から優先順位を決めます。",
    screenshotAlt: "信頼・セキュリティ診断スクリーンショット",
  },
  en: {
    reportLabel: "Trust and security diagnostic report",
    badge: "Trust and security assessment",
    heroLead: "We translated visible trust, operating, and freshness risks into buyer-facing confidence priorities.",
    primaryCta: "View trust plan",
    finalHeading: "Fix the trust gap prospects can see first",
    finalBody: "Prioritize the visible confidence gaps that affect buyer trust before deep technical work.",
    screenshotAlt: "Trust and security diagnostic screenshot",
  },
}

const MEO: OfferCopyByLanguage = {
  ja: {
    reportLabel: "MEO・ローカル集客診断レポート",
    badge: "MEO・マップ最適化診断",
    heroLead: "Googleマップ・ローカル検索での表示順位、口コミ、写真、営業時間の最適化状況を分析しました。地図からの集客機会損失を可視化します。",
    primaryCta: "MEO改善プランを見る",
    finalHeading: "地図で選ばれる店舗に変える",
    finalBody: "検索順位だけでなく、口コミ返信・写真更新・情報鮮度の3軸でローカル集客を強化します。",
    screenshotAlt: "MEO診断スクリーンショット",
  },
  en: {
    reportLabel: "Local SEO diagnostic report",
    badge: "Map optimization assessment",
    heroLead: "We analyzed Google Maps visibility, reviews, photos, and business hours to quantify local discovery losses.",
    primaryCta: "View MEO plan",
    finalHeading: "Get chosen on the map",
    finalBody: "Strengthen local discovery with a three-axis approach: search ranking, review management, and content freshness.",
    screenshotAlt: "MEO diagnostic screenshot",
  },
}

const SUBSIDY: OfferCopyByLanguage = {
  ja: {
    reportLabel: "補助金活用診断レポート",
    badge: "補助金・支援制度診断",
    heroLead: "御社の事業内容とサイトの公開情報から、活用可能性のある補助金・助成金・支援制度を整理しました。申請期限と適合条件を踏まえた優先順位付きです。",
    primaryCta: "補助金活用プランを見る",
    finalHeading: "使える補助金を確実に取る",
    finalBody: "制度調査から申請代行、採択後の報告まで一貫してサポートします。期限切れや不備による不採択を防ぎます。",
    screenshotAlt: "補助金診断スクリーンショット",
  },
  en: {
    reportLabel: "Subsidy opportunity diagnostic report",
    badge: "Government grant assessment",
    heroLead: "We matched your business profile against available subsidies, grants, and support programs with deadline-aware prioritization.",
    primaryCta: "View subsidy plan",
    finalHeading: "Secure available funding",
    finalBody: "End-to-end support from program identification through application writing to post-award reporting.",
    screenshotAlt: "Subsidy diagnostic screenshot",
  },
}

export const OFFER_COPY: Record<string, OfferCopyByLanguage> = {
  website_diagnostic: WEBSITE,
  meo: MEO,
  subsidy: SUBSIDY,
  security: SECURITY,
  japan_entry: JAPAN_ENTRY,
  video_subscription: VIDEO,
  outreach: OUTREACH,
}

export function getReportOfferCopy(lang: ReportLang, variant: TemplateVariant): ReportOfferCopy {
  return OFFER_COPY[variant]?.[lang === "ja" ? "ja" : "en"] ?? WEBSITE[lang === "ja" ? "ja" : "en"]
}
