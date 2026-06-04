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

type OfferCopyByLanguage = {
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

const OFFER_COPY: Record<TemplateVariant, OfferCopyByLanguage> = {
  website_diagnostic: WEBSITE,
  meo: WEBSITE,
  subsidy: WEBSITE,
  security: SECURITY,
  japan_entry: JAPAN_ENTRY,
  video_subscription: VIDEO,
  outreach: OUTREACH,
}

export function getReportOfferCopy(lang: ReportLang, variant: TemplateVariant): ReportOfferCopy {
  return OFFER_COPY[variant]?.[lang === "ja" ? "ja" : "en"] ?? WEBSITE[lang === "ja" ? "ja" : "en"]
}
