export interface CompanyData {
  id: string;
  name: string;
  nameJa: string;
  industry: string;
  industryJa: string;
  founded: string;
  address: string;
  addressJa: string;
  representative: string;
  representativeJa: string;
  capital: string;
  employees: string;
  businessDescription: string;
  businessDescriptionJa: string;
  licenseNumbers: string[];
  majorClients: string[];
  phone: string;
  email: string;
  businessHours: string;
  businessHoursJa: string;
  website: string;
  mission: string;
  missionJa: string;
  vision: string;
  visionJa: string;
  values: string;
  valuesJa: string;
  returnPolicy: string;
  returnPolicyJa: string;
  paymentMethods: string;
  paymentMethodsJa: string;
  deliveryTime: string;
  deliveryTimeJa: string;
  additionalFees: string;
  additionalFeesJa: string;
  priceNote: string;
  priceNoteJa: string;
  locale: 'ja' | 'en';
}

export const defaultCompany: CompanyData = {
  id: 'paradigm',
  name: 'Paradigm Inc.',
  nameJa: '株式会社パラダイム',
  industry: 'IT / Web Solutions',
  industryJa: 'IT・Webソリューション',
  founded: '2018-04-01',
  address: '〒150-0043 東京都渋谷区道玄坂1-2-3 渋谷フクラス8F',
  addressJa: '〒150-0043 東京都渋谷区道玄坂1-2-3 渋谷フクラス8F',
  representative: 'Takeshi Yamamoto',
  representativeJa: '山本 剛',
  capital: '1,000万円',
  employees: '25名（2025年4月現在）',
  businessDescription:
    'Web制作、SEO対策、MEO対策、SNSマーケティング、動画制作、システム開発、コンサルティング',
  businessDescriptionJa:
    'Web制作、SEO対策、MEO対策、SNSマーケティング、動画制作、システム開発、コンサルティング',
  licenseNumbers: [
    '電気通信事業者 届出番号 A-01-12345',
    'プライバシーマーク 第12345678号',
    'ISO/IEC 27001:2022 認証取得',
  ],
  majorClients: [
    '株式会社サンプルホールディングス',
    'ABCテクノロジー株式会社',
    '一般社団法人デジタル推進協会',
    '東京コマース株式会社',
  ],
  phone: '03-1234-5678',
  email: 'info@paradigm.co.jp',
  businessHours: '平日 10:00〜19:00',
  businessHoursJa: '平日 10:00〜19:00（土日祝休）',
  website: 'https://paradigm.co.jp',
  mission: 'デジタルの力で、すべてのビジネスに成長機会を',
  missionJa: "Empowering every business with digital innovation.",
  vision: '2028年までに、10,000社のデジタルトランスフォーメーションを実現する',
  visionJa: 'Drive digital transformation for 10,000 businesses by 2028.',
  values:
    '顧客第一主義／挑戦と革新／透明性／持続可能性／多様性の尊重',
  valuesJa:
    'Customer First / Innovation / Transparency / Sustainability / Diversity',
  returnPolicy:
    '商品到着後7日以内。お客様都合の場合は送料ご負担。不良品の場合は当社負担にて交換・返品対応。',
  returnPolicyJa:
    'Within 7 days of delivery. Return shipping at customer expense unless defective.',
  paymentMethods:
    'クレジットカード（VISA/Mastercard/JCB/AMEX）、銀行振込（三井住友銀行）、Stripe決済',
  paymentMethodsJa:
    'Credit Card (VISA/Mastercard/JCB/AMEX), Bank Transfer, Stripe',
  deliveryTime:
    'サービス開始：ご契約後5営業日以内。物品販売：ご入金確認後3営業日以内に発送。',
  deliveryTimeJa:
    'Service: within 5 business days. Physical goods: shipped within 3 business days.',
  additionalFees:
    '消費税（10%）、送料（全国一律550円、北海道・沖縄1,100円、5,000円以上で送料無料）',
  additionalFeesJa:
    'Tax (10%), Shipping (¥550 nationwide, ¥1,100 Hokkaido/Okinawa, free over ¥5,000)',
  priceNote: '各商品・サービスページに表示',
  priceNoteJa: 'Displayed on each product/service page.',
  locale: 'ja',
};

export function getCompany(slug: string): CompanyData {
  // In production, fetch from Supabase or API.
  // For demo, return the default company with slug applied.
  return { ...defaultCompany, id: slug };
}

export function t(ja: string, en: string, locale: string): string {
  return locale === 'en' ? en : ja;
}
