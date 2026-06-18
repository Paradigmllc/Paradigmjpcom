/**
 * Personalize Engine — Industry-to-copy mapping for auto-generated demo sites.
 *
 * Maps company metadata to theme selection, industry-specific copy,
 * service menus, FAQ items, and legal document defaults.
 *
 * Used by demo-generator.ts to build the JSON blueprint,
 * and by static pages for personalized content.
 */
export interface CompanyProfile {
  companyName: string
  industry: string
  locale: 'ja' | 'en'
  accentColor: string
  accentColorDark: string
  accentColorLight: string
  phone?: string
  email?: string
  address?: string
  representativeName?: string
  capital?: string
  establishedDate?: string
  employeeCount?: string
  businessDescription?: string
  taxId?: string
  returnPolicy?: string
  paymentMethods?: string
  deliveryTime?: string
}

export interface IndustryConfig {
  theme: 'astrowind' | 'screwfast' | 'astroship'
  labelJa: string
  labelEn: string
  services: Array<{ title: string; description: string; icon: string; features: string[] }>
  faqs: Array<{ questionJa: string; answerJa: string; questionEn: string; answerEn: string }>
  heroHook: string
  heroSubtitle: string
  metrics: Array<{ labelJa: string; labelEn: string; value: string; suffix: string }>
  legalName: string
}

const INDUSTRIES: Record<string, IndustryConfig> = {
  dental: {
    theme: 'astrowind',
    labelJa: '歯科医院',
    labelEn: 'Dental Clinic',
    legalName: '医療法人',
    heroHook: '新患数が2.4倍に。データが証明する歯科医院のWeb集患',
    heroSubtitle: '御院のWebサイトを診断。Googleマップと検索からの予約数を最大化します。',
    services: [
      { title: 'MEO対策', description: 'Googleマップ検索で上位表示。競合医院より先に選ばれる仕組み。', icon: 'tabler:map-pin', features: ['マップ最適化', '口コミ管理', '写真最適化'] },
      { title: 'Web予約システム', description: '24時間オンライン予約。電話不要で新患獲得率を大幅向上。', icon: 'tabler:calendar', features: ['LINE予約連携', '自動リマインド', 'カルテ連携'] },
      { title: '医院ブランディング', description: '清潔感・信頼感を伝える洗練されたサイトデザイン。', icon: 'tabler:building-hospital', features: ['治療事例ギャラリー', 'ドクター紹介', '設備紹介'] },
    ],
    faqs: [
      { questionJa: 'MEO対策とは何ですか？', answerJa: 'Googleマップ検索で上位表示されるための対策です。口コミ管理、写真最適化、定期的な情報更新により、地域検索での集患力を高めます。', questionEn: 'What is MEO?', answerEn: 'Map Engine Optimization — improving your visibility on Google Maps search through review management, photo optimization, and regular updates.' },
      { questionJa: '予約システムはどのように導入しますか？', answerJa: '既存の電子カルテと連携可能なシステムを選定し、24時間オンライン予約を実現します。LINEや医院HPから直接予約できる導線を構築します。', questionEn: 'How do you implement the booking system?', answerEn: 'We select and integrate a system compatible with your existing EHR, enabling 24/7 online booking via LINE and your clinic website.' },
      { questionJa: '費用の目安は？', answerJa: 'Web制作は50万円〜、MEO対策は月5万円〜が目安です。医院の規模や目標によって変動します。初回無料診断で具体的なお見積りを提示します。', questionEn: 'What are the costs?', answerEn: 'Web development from ¥500,000, MEO from ¥50,000/month. Varies by clinic size and goals. Free initial diagnostic includes a specific quote.' },
      { questionJa: 'どのくらいの期間で完成しますか？', answerJa: '診断から改善案提示まで3営業日。実装は規模により4〜8週間です。予約システム連携がある場合は+2週間程度です。', questionEn: 'How long does it take?', answerEn: 'Diagnosis to proposal: 3 business days. Implementation: 4-8 weeks depending on scope. +2 weeks for booking system integration.' },
    ],
    metrics: [
      { labelJa: '新患増加倍率', labelEn: 'New Patient Multiplier', value: '2.4', suffix: 'x' },
      { labelJa: 'PageSpeed スコア', labelEn: 'PageSpeed Score', value: '94', suffix: 'pts' },
      { labelJa: '予約CVR改善', labelEn: 'Booking CVR Gain', value: '42', suffix: '%' },
      { labelJa: 'マップ表示順位', labelEn: 'Map Rank', value: '#1', suffix: '' },
    ],
  },
  construction: {
    theme: 'screwfast',
    labelJa: '建設業',
    labelEn: 'Construction',
    legalName: '建設業許可',
    heroHook: '問合せ数3.1倍。建設業のためのWeb集客改善',
    heroSubtitle: '施工事例の見せ方、問合せフォームの最適化、MEO対策で安定受注を実現します。',
    services: [
      { title: '施工実績サイト', description: '写真で魅せる施工事例ギャラリー。信頼を獲得する実績の見せ方。', icon: 'tabler:photo', features: ['ビフォーアフター', '360°パノラマ', '動画埋め込み'] },
      { title: '見積依頼フォーム', description: '最短の導線で見積依頼を獲得。条件入力型フォームで精度の高いリードを。', icon: 'tabler:calculator', features: ['条件分岐', '自動見積連携', 'CRM連携'] },
      { title: '採用サイト', description: '若年層に響くモダンな採用ページ。施工管理技士・職人の獲得に。', icon: 'tabler:users', features: ['社員インタビュー', '福利厚生紹介', '動画コンテンツ'] },
    ],
    faqs: [
      { questionJa: '建設業のWeb集客は効果がありますか？', answerJa: 'はい。特にリフォーム・戸建て・エクステリア分野では、Googleマップと検索からの問合せが主要な集客経路になっています。施工事例の見せ方が成約率を大きく左右します。', questionEn: 'Is web marketing effective for construction?', answerEn: 'Yes. Particularly in renovation, residential, and exterior sectors, Google Maps and search are primary lead sources. How you showcase past projects significantly impacts close rates.' },
      { questionJa: '施工事例サイトの制作に必要なものは？', answerJa: '施工写真（ビフォーアフター推奨）、図面データ、お客様の声があれば理想的です。写真がない場合はプロカメラマンによる撮影も手配可能です。', questionEn: 'What do I need for a portfolio site?', answerEn: 'Project photos (before/after recommended), drawings, and client testimonials if available. We can arrange professional photography if needed.' },
      { questionJa: '費用の目安は？', answerJa: '施工実績サイトは80万円〜、見積フォーム込みで120万円〜。採用サイトは60万円〜が目安です。', questionEn: 'What are the costs?', answerEn: 'Portfolio sites from ¥800,000, with quote forms from ¥1,200,000. Recruitment sites from ¥600,000.' },
    ],
    metrics: [
      { labelJa: '問合せ増加倍率', labelEn: 'Inquiry Multiplier', value: '3.1', suffix: 'x' },
      { labelJa: 'PageSpeed スコア', labelEn: 'PageSpeed Score', value: '96', suffix: 'pts' },
      { labelJa: '見積依頼CVR', labelEn: 'Quote CVR Gain', value: '38', suffix: '%' },
      { labelJa: '採用応募増加', labelEn: 'Application Increase', value: '2.7', suffix: 'x' },
    ],
  },
  consulting: {
    theme: 'astrowind',
    labelJa: 'コンサルティング',
    labelEn: 'Consulting',
    legalName: '',
    heroHook: '成約率38%改善。コンサルティングファームのWeb刷新',
    heroSubtitle: '知見の見える化、ホワイトペーパー導線、ブランド信頼構築をデータで加速します。',
    services: [
      { title: 'ブランドサイト構築', description: '知見と信頼を可視化する洗練されたブランド体験。', icon: 'tabler:building-skyscraper', features: ['ブランド設計', 'ナレッジベース', 'チーム紹介'] },
      { title: 'ホワイトペーパー導線', description: 'ダウンロード率を最大化するLP設計とナーチャリング施策。', icon: 'tabler:file-text', features: ['LP制作', 'フォーム最適化', 'MA連携'] },
      { title: 'SEO/オウンドメディア', description: '専門性を資産化するコンテンツマーケティング戦略。', icon: 'tabler:chart-bar', features: ['キーワード戦略', '記事制作', '分析レポート'] },
    ],
    faqs: [
      { questionJa: 'コンサルティングファームにWebサイトは必要ですか？', answerJa: '必須です。クライアントの90%以上が依頼前にWebサイトを確認します。知見の見える化が差別化要因になります。', questionEn: 'Does a consulting firm need a website?', answerEn: 'Absolutely. 90%+ of clients check your website before engaging. Visible thought leadership is a key differentiator.' },
      { questionJa: '既存サイトの改善で十分ですか？', answerJa: '診断次第です。既存サイトのコンバージョン率が著しく低い場合は全面刷新が効果的です。まずは無料診断で改善余地を可視化します。', questionEn: 'Is improving my existing site enough?', answerEn: 'It depends on the diagnostic. If conversion rates are very low, a full redesign may be more effective. The free diagnostic reveals the opportunity.' },
      { questionJa: '費用の目安は？', answerJa: 'ブランドサイトは100万円〜、ホワイトペーパーLPは30万円〜、オウンドメディア運用は月15万円〜が目安です。', questionEn: 'What are the costs?', answerEn: 'Brand sites from ¥1,000,000, white paper LPs from ¥300,000, owned media operations from ¥150,000/month.' },
    ],
    metrics: [
      { labelJa: '成約率改善', labelEn: 'Close Rate Gain', value: '38', suffix: '%' },
      { labelJa: '資料DL増加', labelEn: 'Downloads Increase', value: '2.8', suffix: 'x' },
      { labelJa: 'PageSpeed', labelEn: 'PageSpeed', value: '98', suffix: 'pts' },
      { labelJa: '検索流入', labelEn: 'Search Traffic', value: '3.5', suffix: 'x' },
    ],
  },
  restaurant: {
    theme: 'astroship',
    labelJa: '飲食店',
    labelEn: 'Restaurant',
    legalName: '食品衛生責任者',
    heroHook: '予約率42%向上。データドリブンな飲食店Web戦略',
    heroSubtitle: 'メニュー表示、予約導線、Googleマップ最適化で売上を伸ばします。',
    services: [
      { title: 'メニュー最適化', description: '写真映えする料理ページ。注文率を最大化する導線設計。', icon: 'tabler:chef-hat', features: ['料理写真撮影', '多言語対応', 'アレルギー表示'] },
      { title: '予約・テイクアウト', description: '電話不要の24時間予約・注文システム。', icon: 'tabler:clock', features: ['LINE予約', 'テイクアウト注文', 'テーブル管理'] },
      { title: 'Googleマップ対策', description: 'MEOで地域検索上位表示。ランチ・ディナー両方の集客に対応。', icon: 'tabler:map', features: ['口コミ促進', '混雑状況表示', '写真更新'] },
    ],
    faqs: [
      { questionJa: '飲食店にWebサイトは必要ですか？', answerJa: 'GoogleマップやSNSだけで十分と思うかもしれませんが、Webサイトがあることで信頼度が大きく変わります。メニュー、営業時間、アクセス情報をきちんと掲載することが重要です。', questionEn: 'Does a restaurant need a website?', answerEn: 'While Google Maps and social media are important, a proper website significantly increases trust. Clear menus, hours, and access info are essential.' },
      { questionJa: '予約システムはどのように導入しますか？', answerJa: 'Cal.comやTableCheckなどの予約サービスと連携し、24時間オンライン予約を実現します。POSレジとの連携も可能なケースがあります。', questionEn: 'How do you implement online booking?', answerEn: 'We integrate with services like Cal.com or TableCheck for 24/7 online reservations. POS integration is also possible in some cases.' },
      { questionJa: '費用の目安は？', answerJa: '飲食店向けWebサイトは30万円〜、予約システム連携込みで50万円〜が目安です。月額保守5万円〜。', questionEn: 'What are the costs?', answerEn: 'Restaurant websites from ¥300,000, with booking integration from ¥500,000. Monthly maintenance from ¥50,000.' },
    ],
    metrics: [
      { labelJa: '予約率向上', labelEn: 'Booking Rate Gain', value: '42', suffix: '%' },
      { labelJa: 'PageSpeed', labelEn: 'PageSpeed', value: '91', suffix: 'pts' },
      { labelJa: 'マップ表示回数', labelEn: 'Map Views', value: '3.2', suffix: 'x' },
      { labelJa: '売上増加', labelEn: 'Revenue Increase', value: '28', suffix: '%' },
    ],
  },
  retail: {
    theme: 'astroship',
    labelJa: '小売業',
    labelEn: 'Retail',
    legalName: '',
    heroHook: 'EC売上28%増。小売業のためのデジタル刷新',
    heroSubtitle: '商品ページ最適化、決済導線改善、リピート率向上をデータで実現します。',
    services: [
      { title: 'ECサイト構築', description: 'Shopify/WooCommerceベースの高速ECサイト。', icon: 'tabler:shopping-cart', features: ['多言語対応', '在庫連携', '分析ダッシュボード'] },
      { title: '商品ページ最適化', description: 'CVRを最大化する商品写真・説明文・レコメンド設計。', icon: 'tabler:photo-star', features: ['A/Bテスト', 'ヒートマップ', 'レビュー表示'] },
      { title: 'オムニチャネル統合', description: '実店舗とECの在庫・会員情報を統合。', icon: 'tabler:building-store', features: ['在庫一元管理', '会員統合', 'クリック&コレクト'] },
    ],
    faqs: [
      { questionJa: 'ECサイト制作の費用は？', answerJa: 'Shopify構築で80万円〜、フルカスタムECで150万円〜が目安です。月額運用費は別途。', questionEn: 'What are e-commerce site costs?', answerEn: 'Shopify builds from ¥800,000, full custom e-commerce from ¥1,500,000. Monthly operation costs separate.' },
    ],
    metrics: [
      { labelJa: 'EC売上増加', labelEn: 'E-Com Sales Growth', value: '28', suffix: '%' },
      { labelJa: 'PageSpeed', labelEn: 'PageSpeed', value: '93', suffix: 'pts' },
      { labelJa: 'CVR改善', labelEn: 'CVR Gain', value: '2.1', suffix: 'x' },
      { labelJa: 'リピート率', labelEn: 'Repeat Rate', value: '18', suffix: '%' },
    ],
  },
  beauty_salon: {
    theme: 'astroship',
    labelJa: '美容サロン',
    labelEn: 'Beauty Salon',
    legalName: '美容所登録',
    heroHook: '予約数2.8倍。美容サロンのためのWeb集客改善',
    heroSubtitle: 'ビフォーアフターの見せ方、Instagram連携、24時間予約システムで売上向上。',
    services: [
      { title: 'サロンブランディング', description: '感性に響くビジュアルデザインで差別化。', icon: 'tabler:spa', features: ['デザイン設計', 'ギャラリー', 'スタイリスト紹介'] },
      { title: 'インスタグラム連携', description: 'Instagramとのシームレスな連携で集客導線を強化。', icon: 'tabler:camera', features: ['投稿埋め込み', 'DM予約連携', 'ストーリー連動'] },
      { title: 'オンライン予約', description: '24時間対応のスマホ最適化予約システム。', icon: 'tabler:calendar-check', features: ['LINE連携', 'リマインド', '顧客管理'] },
    ],
    faqs: [
      { questionJa: 'サロン集客にWebサイトは効果的ですか？', answerJa: 'Instagramだけでは伝えきれない情報（料金体系、施術メニューの詳細、衛生管理など）を掲載することで、新規顧客の不安を解消し予約率が向上します。', questionEn: 'Is a website effective for salon marketing?', answerEn: 'Yes. Instagram alone cannot convey pricing details, treatment menus, and hygiene standards effectively. A website resolves customer concerns and increases booking rates.' },
      { questionJa: '費用の目安は？', answerJa: 'サロン向けWebサイトは40万円〜、予約システム込みで60万円〜。月額保守3万円〜。', questionEn: 'What are the costs?', answerEn: 'Salon websites from ¥400,000, with booking system from ¥600,000. Monthly maintenance from ¥30,000.' },
    ],
    metrics: [
      { labelJa: '予約数増加', labelEn: 'Booking Increase', value: '2.8', suffix: 'x' },
      { labelJa: 'PageSpeed', labelEn: 'PageSpeed', value: '90', suffix: 'pts' },
      { labelJa: '新規顧客率', labelEn: 'New Client Rate', value: '45', suffix: '%' },
      { labelJa: 'リピート率', labelEn: 'Repeat Rate', value: '68', suffix: '%' },
    ],
  },
  accounting: {
    theme: 'astrowind',
    labelJa: '会計事務所',
    labelEn: 'Accounting Office',
    legalName: '税理士法人',
    heroHook: '問合せ数2.1倍。会計事務所のための信頼構築Web戦略',
    heroSubtitle: '専門性の可視化、オンライン相談導線、クラウド会計連携で差別化。',
    services: [
      { title: '事務所ブランディング', description: '信頼と専門性を伝える権威あるWebサイト。', icon: 'tabler:certificate', features: ['実績紹介', '税理士プロフィール', 'セミナー情報'] },
      { title: 'オンライン相談', description: 'Cal.com連携で24時間オンライン初回相談予約。', icon: 'tabler:video', features: ['Zoom連携', '自動リマインド', '事前質問票'] },
      { title: 'クラウド会計導入支援', description: 'freee/MoneyForwardとの連携による業務効率化。', icon: 'tabler:cloud', features: ['導入サポート', 'データ移行', '運用トレーニング'] },
    ],
    faqs: [
      { questionJa: '会計事務所にWebサイトは必要ですか？', answerJa: '必須になりつつあります。特にクラウド会計導入を検討する若手経営者は、Webサイトで事務所の専門性や雰囲気を事前に確認しています。', questionEn: 'Does an accounting firm need a website?', answerEn: 'Increasingly yes. Younger business owners considering cloud accounting check your website to assess expertise and compatibility before contacting you.' },
      { questionJa: '費用の目安は？', answerJa: '会計事務所向けWebサイトは60万円〜、オンライン相談システム込みで80万円〜。月額保守5万円〜。', questionEn: 'What are the costs?', answerEn: 'Accounting websites from ¥600,000, with online consultation system from ¥800,000. Monthly maintenance from ¥50,000.' },
    ],
    metrics: [
      { labelJa: '問合せ増加', labelEn: 'Inquiry Increase', value: '2.1', suffix: 'x' },
      { labelJa: 'PageSpeed', labelEn: 'PageSpeed', value: '97', suffix: 'pts' },
      { labelJa: '相談予約率', labelEn: 'Consultation Rate', value: '23', suffix: '%' },
      { labelJa: '検索順位', labelEn: 'Search Rank', value: '#1', suffix: '' },
    ],
  },
  cleaning: {
    theme: 'screwfast',
    labelJa: '清掃業',
    labelEn: 'Cleaning Service',
    legalName: '建築物清掃業',
    heroHook: '問合せ数2.5倍。清掃業のためのWeb集客改善',
    heroSubtitle: 'サービス内容の明確化、料金の透明化、エリア別MEO対策で安定受注。',
    services: [
      { title: 'サービス紹介サイト', description: 'エアコン清掃、ハウスクリーニング、店舗清掃を明確に訴求。', icon: 'tabler:spray', features: ['料金表', 'サービス一覧', 'お客様の声'] },
      { title: 'エリアMEO対策', description: '地域名×清掃でGoogleマップ上位表示を実現。', icon: 'tabler:map-pin', features: ['エリア別ページ', '口コミ管理', '写真最適化'] },
      { title: '見積・予約フォーム', description: '最短1分で見積依頼が完了するシンプルフォーム。', icon: 'tabler:file-invoice', features: ['条件選択式', '自動返信', 'LINE連携'] },
    ],
    faqs: [
      { questionJa: '清掃業の集客にWebサイトは効果的ですか？', answerJa: '非常に効果的です。特にハウスクリーニングやエアコン清掃では、「地域名+清掃」の検索からの流入が主要な集客経路です。', questionEn: 'Is a website effective for cleaning service marketing?', answerEn: 'Very effective. Particularly for house and AC cleaning, "area name + cleaning" searches are the primary lead source.' },
    ],
    metrics: [
      { labelJa: '問合せ増加', labelEn: 'Inquiry Increase', value: '2.5', suffix: 'x' },
      { labelJa: 'PageSpeed', labelEn: 'PageSpeed', value: '95', suffix: 'pts' },
      { labelJa: '見積CVR', labelEn: 'Quote CVR', value: '31', suffix: '%' },
      { labelJa: 'マップ表示', labelEn: 'Map Views', value: '4.1', suffix: 'x' },
    ],
  },
}

/** Get industry configuration with fallback to consulting */
export function getIndustryConfig(industry: string): IndustryConfig {
  return INDUSTRIES[industry] || INDUSTRIES.consulting
}

/** Get all available industries */
export function getAllIndustries(): string[] {
  return Object.keys(INDUSTRIES)
}

/** Get industry label in specified locale */
export function getIndustryLabel(industry: string, locale: 'ja' | 'en'): string {
  const cfg = getIndustryConfig(industry)
  return locale === 'ja' ? cfg.labelJa : cfg.labelEn
}

/** Generate complete company profile from metadata */
export function buildCompanyProfile(meta: Record<string, any>): CompanyProfile {
  const industry = meta.industry || 'consulting'
  const locale = meta.locale || 'ja'
  const cfg = getIndustryConfig(industry)
  return {
    companyName: meta.company_name || 'Sample Company',
    industry,
    locale,
    accentColor: meta.accentColor || '#7c3aed',
    accentColorDark: meta.accentColorDark || '#5b21b6',
    accentColorLight: meta.accentColorLight || '#a78bfa',
    phone: meta.phone || '03-1234-5678',
    email: meta.email || 'info@example.com',
    address: meta.address || (locale === 'ja' ? '東京都渋谷区神宮前1-1-1' : '1-1-1 Jingumae, Shibuya-ku, Tokyo'),
    representativeName: meta.representative_name || (locale === 'ja' ? '山田 太郎' : 'Taro Yamada'),
    capital: meta.capital || '1,000万円',
    establishedDate: meta.established_date || '2020年4月',
    employeeCount: meta.employee_count || '10名',
    businessDescription: meta.business_description || cfg.heroSubtitle,
    taxId: meta.tax_id || 'T9012345678901',
    returnPolicy: meta.return_policy || (locale === 'ja' ? '商品到着後7日以内、未開封品に限り返品可能' : 'Returns accepted within 7 days of delivery, unopened items only'),
    paymentMethods: meta.payment_methods || 'クレジットカード（VISA/Mastercard/AMEX）、銀行振込',
    deliveryTime: meta.delivery_time || (locale === 'ja' ? 'ご注文確認後3〜5営業日以内に発送' : 'Ships within 3-5 business days after order confirmation'),
  }
}

/** Theme selection logic based on industry */
export function selectTheme(industry: string): 'astrowind' | 'screwfast' | 'astroship' {
  return getIndustryConfig(industry).theme
}
