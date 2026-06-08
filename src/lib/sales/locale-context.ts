/**
 * Deep locale context — per-country business data, regulations, payment methods.
 * Goes beyond translation: provides country-specific market data, legal requirements,
 * cultural norms, and payment ecosystem details.
 */

export interface LocaleContext {
  locale: string
  country: string
  currency: string
  currencySymbol: string
  language: string
  /** Primary payment methods in this market */
  paymentMethods: string[]
  /** Key business regulations */
  regulations: string[]
  /** Market size indicators */
  marketData: {
    ecommerceSize: string
    internetPenetration: string
    mobileFirst: boolean
  }
  /** Cultural considerations for business */
  culturalNotes: string
  /** Data privacy regulation */
  privacyLaw: string
  /** Key consumer trust factors */
  trustFactors: string[]
}

// ─── Locale definitions ───
export const LOCALE_CONTEXTS: Record<string, LocaleContext> = {
  ja: {
    locale: "ja",
    country: "日本",
    currency: "JPY",
    currencySymbol: "¥",
    language: "日本語",
    paymentMethods: ["クレジットカード", "コンビニ決済", "銀行振込", "PayPay", "LINE Pay", "Paidy"],
    regulations: ["特定商取引法", "個人情報保護法(APPI)", "資金決済法", "景品表示法", "電子契約法"],
    marketData: { ecommerceSize: "22兆円 (2026)", internetPenetration: "93%", mobileFirst: true },
    culturalNotes: "日本消費者は購入前に企業の信頼性を徹底的に確認します。特商法表示・プライバシーポリシー・会社概要の3点がないサイトからの購入率は8%以下です。",
    privacyLaw: "個人情報保護法 (APPI)",
    trustFactors: ["特商法表記", "プライバシーポリシー", "会社概要", "実績・導入事例", "SSL証明書"],
  },
  en: {
    locale: "en",
    country: "United States",
    currency: "USD",
    currencySymbol: "$",
    language: "English",
    paymentMethods: ["Credit Card", "PayPal", "Apple Pay", "Google Pay", "ACH Transfer"],
    regulations: ["CCPA/CPRA", "ADA Compliance", "FTC Guidelines", "CAN-SPAM Act"],
    marketData: { ecommerceSize: "$1.1T (2026)", internetPenetration: "92%", mobileFirst: true },
    culturalNotes: "US consumers value speed, transparency, and social proof. Reviews, testimonials, and a clear return policy are critical trust signals.",
    privacyLaw: "CCPA/CPRA (state-level), no federal privacy law",
    trustFactors: ["SSL/HTTPS", "Customer Reviews", "Money-back Guarantee", "Trust Badges", "Clear Pricing"],
  },
  ko: {
    locale: "ko",
    country: "대한민국",
    currency: "KRW",
    currencySymbol: "₩",
    language: "한국어",
    paymentMethods: ["신용카드", "카카오페이", "네이버페이", "계좌이체", "토스"],
    regulations: ["전자상거래법", "개인정보보호법(PIPA)", "위치정보법"],
    marketData: { ecommerceSize: "₩240조 (2026)", internetPenetration: "97%", mobileFirst: true },
    culturalNotes: "韓国消費者はモバイルファースト。카카오톡/네이버経由の流入が支配的。迅速なカスタマーサポートと返品ポリシーが信頼の鍵。",
    privacyLaw: "개인정보보호법 (PIPA)",
    trustFactors: ["SSL/HTTPS", "カスタマーレビュー(리뷰)", "返品/交換ポリシー", "事業者登録番号", "カカオ/ネイバー認証"],
  },
  zh: {
    locale: "zh",
    country: "中国",
    currency: "CNY",
    currencySymbol: "¥",
    language: "简体中文",
    paymentMethods: ["支付宝", "微信支付", "银联", "信用卡"],
    regulations: ["电子商务法", "个人信息保护法(PIPL)", "网络安全法", "数据安全法"],
    marketData: { ecommerceSize: "¥15.7万亿 (2026)", internetPenetration: "78%", mobileFirst: true },
    culturalNotes: "中国消費者はモバイル決済が主流。WeChatミニプログラム/支付宝の統合が必須。ICP备案がないとWebサイトが表示されない。",
    privacyLaw: "个人信息保护法 (PIPL)",
    trustFactors: ["ICP备案", "支付宝/微信支付対応", "カスタマーレビュー", "実店舗住所表示", "SSL証明書"],
  },
}

/**
 * Get locale context, falling back to English for unknown locales.
 */
export function getLocaleContext(locale: string): LocaleContext {
  if (locale.startsWith("ja")) return LOCALE_CONTEXTS.ja!
  if (locale.startsWith("ko")) return LOCALE_CONTEXTS.ko!
  if (locale.startsWith("zh")) return LOCALE_CONTEXTS.zh!
  return LOCALE_CONTEXTS.en!
}
