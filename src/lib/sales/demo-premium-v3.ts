import type {
  DemoBrandSystem,
  DemoContentPage,
  DemoCreativeDirection,
  DemoDesignRecipe,
  DemoMultiPageData,
} from "./demo-site-types"

const BRAND_SYSTEMS: Record<string, DemoBrandSystem[]> = {
  restaurant: [
    { id: "table-editorial", displayFont: '"Shippori Mincho", "Noto Serif JP", serif', bodyFont: '"Zen Kaku Gothic New", "Noto Sans JP", sans-serif', headingWeight: 500, surface: "#f4f0e7", surfaceAlt: "#d8cfbd", ink: "#191713", muted: "#655f55", line: "rgba(25,23,19,.18)", heroTone: "cinematic", imageTreatment: "warm", shape: "square" },
    { id: "quiet-kissa", displayFont: '"Noto Serif JP", "Yu Mincho", serif', bodyFont: '"Noto Sans JP", sans-serif', headingWeight: 500, surface: "#f6f3ed", surfaceAlt: "#ded8cc", ink: "#17191a", muted: "#5f625f", line: "rgba(23,25,26,.16)", heroTone: "welcoming", imageTreatment: "natural", shape: "soft" },
  ],
  beauty_salon: [
    { id: "salon-editorial", displayFont: '"Noto Serif JP", "Yu Mincho", serif', bodyFont: '"Zen Kaku Gothic New", "Noto Sans JP", sans-serif', headingWeight: 500, surface: "#faf8f6", surfaceAlt: "#ece7e2", ink: "#1e1b1a", muted: "#6d6661", line: "rgba(30,27,26,.14)", heroTone: "precision", imageTreatment: "crisp", shape: "soft" },
    { id: "salon-signature", displayFont: '"Shippori Mincho", "Noto Serif JP", serif', bodyFont: '"Zen Kaku Gothic New", "Noto Sans JP", sans-serif', headingWeight: 500, surface: "#f7f3ef", surfaceAlt: "#e8ded7", ink: "#211b19", muted: "#71645f", line: "rgba(33,27,25,.15)", heroTone: "editorial", imageTreatment: "warm", shape: "square" },
  ],
  dental: [
    { id: "clinical-calm", displayFont: '"Outfit", "Noto Sans JP", sans-serif', bodyFont: '"Noto Sans JP", sans-serif', headingWeight: 600, surface: "#f5f8f8", surfaceAlt: "#dfe9e8", ink: "#102123", muted: "#53696b", line: "rgba(16,33,35,.14)", heroTone: "precision", imageTreatment: "crisp", shape: "soft" },
  ],
  construction: [
    { id: "built-solid", displayFont: '"Outfit", "BIZ UDPGothic", sans-serif', bodyFont: '"BIZ UDPGothic", "Noto Sans JP", sans-serif', headingWeight: 700, surface: "#f2f1ed", surfaceAlt: "#d9d5ca", ink: "#181a1b", muted: "#5e625f", line: "rgba(24,26,27,.2)", heroTone: "precision", imageTreatment: "crisp", shape: "square" },
  ],
  retail: [
    { id: "select-modern", displayFont: '"Zen Kaku Gothic New", "Noto Sans JP", sans-serif', bodyFont: '"Noto Sans JP", sans-serif', headingWeight: 600, surface: "#f6f4ef", surfaceAlt: "#e2ded4", ink: "#171817", muted: "#626660", line: "rgba(23,24,23,.16)", heroTone: "editorial", imageTreatment: "natural", shape: "soft" },
  ],
  default: [
    { id: "corporate-editorial", displayFont: '"Outfit", "Noto Sans JP", sans-serif', bodyFont: '"Noto Sans JP", sans-serif', headingWeight: 600, surface: "#f4f6f7", surfaceAlt: "#dfe5e8", ink: "#111b22", muted: "#58656d", line: "rgba(17,27,34,.16)", heroTone: "precision", imageTreatment: "crisp", shape: "soft" },
    { id: "corporate-trust", displayFont: '"Noto Serif JP", "Yu Mincho", serif', bodyFont: '"Noto Sans JP", sans-serif', headingWeight: 600, surface: "#f5f2ec", surfaceAlt: "#dfd8cb", ink: "#1c1a17", muted: "#676157", line: "rgba(28,26,23,.17)", heroTone: "editorial", imageTreatment: "natural", shape: "square" },
  ],
}

const TYPOGRAPHY_SYSTEMS: Record<string, DemoBrandSystem[]> = {
  "editorial-serif": [BRAND_SYSTEMS.restaurant[0], BRAND_SYSTEMS.default[1], BRAND_SYSTEMS.beauty_salon[1]],
  "humanist-sans": [BRAND_SYSTEMS.beauty_salon[0], BRAND_SYSTEMS.retail[0]],
  "modern-grotesk": [BRAND_SYSTEMS.default[0], BRAND_SYSTEMS.dental[0]],
  "technical-sans": [BRAND_SYSTEMS.construction[0], BRAND_SYSTEMS.default[0]],
}

const PALETTE_MOODS: Record<DemoCreativeDirection["paletteMood"], Pick<DemoBrandSystem, "surface" | "surfaceAlt" | "ink" | "muted" | "line">> = {
  "warm-neutral": { surface: "#f6f1e8", surfaceAlt: "#e6daca", ink: "#1f1a15", muted: "#6b6055", line: "rgba(31,26,21,.17)" },
  "cool-professional": { surface: "#f1f5f7", surfaceAlt: "#dce5e9", ink: "#112127", muted: "#58686e", line: "rgba(17,33,39,.16)" },
  earth: { surface: "#f3efe6", surfaceAlt: "#ddd2bf", ink: "#282118", muted: "#6b6254", line: "rgba(40,33,24,.18)" },
  monochrome: { surface: "#f5f5f3", surfaceAlt: "#deded9", ink: "#131313", muted: "#5d5d59", line: "rgba(19,19,19,.17)" },
  "soft-contrast": { surface: "#fbf7f5", surfaceAlt: "#eae2de", ink: "#241f1f", muted: "#726665", line: "rgba(36,31,31,.15)" },
}

function hash(input: string): number {
  let value = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index)
    value = Math.imul(value, 16777619)
  }
  return value >>> 0
}

export function resolveDemoBrandSystem(page: DemoMultiPageData, recipe = page.designRecipe): DemoBrandSystem {
  // Previously generated salon demos persisted the serif-heavy `salon-air`
  // token set. Always migrate them to the current balanced art direction at
  // read time so a renderer release improves existing proposals immediately.
  const typographyStyle = recipe?.creativeDirection?.typographyStyle
  const industryKey = page.presentation?.industryProfile ?? String(page.industry)
  const industrySystems = BRAND_SYSTEMS[industryKey] ?? BRAND_SYSTEMS.default
  const typographySystems = typographyStyle ? TYPOGRAPHY_SYSTEMS[typographyStyle] ?? [] : []
  const industryIds = new Set(industrySystems.map((system) => system.id))
  const industryTypographySystems = typographySystems.filter((system) => industryIds.has(system.id))
  const systems = industryTypographySystems.length > 0 ? industryTypographySystems : industrySystems
  const persistedBrand = page.brandSystem && industryIds.has(page.brandSystem.id) ? page.brandSystem : undefined
  const selected = persistedBrand
    ?? systems[hash(`${page.companyId}:${recipe?.templateId ?? "default"}:${recipe?.creativeDirection?.concept ?? ""}`) % systems.length]
  const mood = recipe?.creativeDirection?.paletteMood
  return mood ? { ...selected, ...PALETTE_MOODS[mood] } : selected
}

function sentence(value: string): string {
  const normalized = value.replace(/\s+/gu, " ").trim()
  if (!normalized) return ""
  return /[。！？]$/u.test(normalized) ? normalized : `${normalized}。`
}

function normalizedCopy(value: string): string {
  return value.replace(/\s+/gu, "").replace(/[。！？、]/gu, "").toLocaleLowerCase("ja-JP")
}

function stripDescriptionPrefix(value: string, description: string): string {
  const prefix = description.replace(/[。！？]\s*$/u, "")
  if (!prefix) return value.trim()
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")
  return value.replace(new RegExp(`^\\s*${escaped}(?:[。！？])?\\s*(?:[／/]\\s*)?`, "u"), "").trim()
}

function normalizeServices(page: DemoMultiPageData): DemoMultiPageData["pages"]["services"] {
  const services = page.pages.services.services.map((service) => {
    const description = sentence(service.description ?? "")
    const seen = new Set<string>()
    const features = (service.features ?? [])
      .flatMap((feature) => feature.split(/\s*[／/]\s*/u))
      .map((feature) => stripDescriptionPrefix(feature, description))
      .filter((feature) => {
        const key = normalizedCopy(feature)
        if (!key || key === normalizedCopy(description) || seen.has(key)) return false
        seen.add(key)
        return true
      })
    return { ...service, description, features }
  })
  return { ...page.pages.services, services }
}

function enrichScenes(page: DemoMultiPageData): DemoContentPage {
  const current = page.pages.works!
  const serviceNames = page.pages.services.services.map((item) => item.title).filter(Boolean).join("、")
  const serviceLine = serviceNames ? `${page.companyName}では、${serviceNames}をご案内しています。` : ""
  const legacyCaveats = [
    "営業日や提供内容などの最新情報は、公式SNSでご確認ください。",
    "営業日や提供内容などの最新情報は、正式な案内をご確認ください。",
  ]
  const sections = current.sections.slice(0, 6).map((item, index) => {
    // This transformation runs once during generation and again when persisted
    // demos are read. Remove our own enrichment before applying it so copy does
    // not grow on every read. Operating-information caveats belong in News,
    // FAQ, and Contact rather than being repeated below every visual story.
    const cleanBody = [serviceLine, ...legacyCaveats]
      .filter(Boolean)
      .reduce((body, addition) => body.split(addition).join(""), item.body)
      .trim()
    return {
      ...item,
      body: `${sentence(cleanBody)}${index === 0 ? serviceLine : ""}`,
    }
  })
  return { ...current, sections }
}

function buildNews(page: DemoMultiPageData): DemoContentPage {
  const instagram = page.premium?.social.find((item) => item.network === "instagram")
  const serviceNames = page.pages.services.services.map((item) => item.title).filter(Boolean).slice(0, 3).join("、")
  const profile = page.presentation?.industryProfile ?? String(page.industry)
  const headings = profile === "dental"
    ? ["診療案内を更新しました", "初診の方へ", "院内環境のご紹介", "受診前の確認事項"]
    : profile === "construction"
      ? ["施工事例を公開しました", "現地調査から始まるリフォーム", "素材と仕上がりについて", "相談窓口のご案内"]
      : profile === "retail"
        ? ["今月のおすすめ", "店頭で選ぶ時間", "入荷・営業情報", "店舗情報のご案内"]
        : profile === "restaurant"
          ? ["季節のメニューと営業のご案内", "店内で過ごす時間", "ご来店前に確認したいこと", "公式情報について"]
          : ["サービスのお知らせ", "ご相談の進め方", "日々の取り組み", "最新情報について"]
  return {
    title: "お知らせ",
    subtitle: instagram ? "営業案内や新しいご案内は、公式Instagramからご確認いただけます。" : "営業案内や新しい情報を、こちらでお知らせします。",
    eyebrow: "JOURNAL & INFORMATION",
    accentColor: page.meta.accentColor,
    sections: [
      { id: "news-latest", heading: headings[0], body: instagram ? "営業日、臨時のお知らせ、新しいメニューやサービスなど、現在の情報は公式Instagramで発信しています。ご来店やご利用の前に、最新の投稿をご確認ください。" : "営業日、臨時のお知らせ、新しいメニューやサービスなど、現在の情報はこちらでご案内します。", note: instagram?.href },
      { id: "news-lineup", heading: headings[1], body: serviceNames ? `${page.companyName}では、${serviceNames}をご案内しています。内容や提供状況は変更される場合があるため、最新情報をご確認ください。` : `${page.companyName}の商品・サービスに関する新しいご案内を掲載します。` },
      { id: "news-visit", heading: headings[2], body: `${page.pages.contact.address || page.pages.about.locationLabel}の情報と地図はアクセスページにまとめています。営業時間、予約、受付方法など、公開情報に記載のない事項は公式案内をご確認ください。` },
      { id: "news-policy", heading: headings[3], body: "このページでは、事業者が確認した情報だけを掲載します。過去の案内と現在の営業内容が異なる場合は、公式SNSまたは正式なお問い合わせ窓口の最新情報を優先してください。" },
    ],
  }
}

function buildRecruit(page: DemoMultiPageData): DemoContentPage {
  const values = page.pages.about.values.slice(0, 3)
  const services = page.pages.services.services.slice(0, 3)
  return {
    ...page.pages.recruit!,
    eyebrow: "PEOPLE & CULTURE",
    subtitle: `${page.companyName}の仕事と、応募前に確認いただきたい情報をご案内します。`,
    sections: [
      { id: "recruit-status", heading: "現在の募集状況", body: "募集の有無、職種、雇用形態、勤務条件は、事業者による正式な確認後に掲載します。公開されていない求人や条件を推測してご案内することはありません。" },
      { id: "recruit-work", heading: "仕事について", body: services.length ? `${page.companyName}では、${services.map((item) => item.title).join("、")}に関わる仕事があります。具体的な担当範囲と一日の流れは、募集要項でご確認ください。` : `${page.companyName}の事業に関わる仕事内容は、募集時の正式な募集要項でご案内します。` },
      { id: "recruit-values", heading: "大切にしていること", body: values.length ? values.map((item) => `${item.title}：${item.description}`).join("\n") : `${page.pages.about.mission} この考え方に共感いただける方へ、募集時に詳しい情報をご案内します。` },
      { id: "recruit-process", heading: "応募を検討される方へ", body: "勤務地、勤務時間、休日、待遇、試用期間、選考方法、応募書類をご確認のうえ、正式に案内された窓口をご利用ください。SNSの非公式な連絡先や第三者の募集情報にはご注意ください。" },
    ],
  }
}

const LEGAL_SECTIONS: Record<"privacy" | "terms" | "commerce", DemoContentPage["sections"]> = {
  privacy: [
    { id: "privacy-scope", heading: "基本方針", body: "当サイトは、取得する個人情報を利用目的の範囲内で適切に取り扱い、安全管理に努めます。正式公開時には、実際の運営者、利用サービス、委託先および保存方法を確認した内容へ更新します。" },
    { id: "privacy-data", heading: "取得する情報", body: "お問い合わせフォームを設置する場合、氏名、連絡先、会社名、お問い合わせ内容など、回答に必要な情報を取得することがあります。アクセス解析を利用する場合は、利用サービスと取得項目を明示します。" },
    { id: "privacy-purpose", heading: "利用目的", body: "取得した情報は、お問い合わせへの回答、必要なご連絡、サービス提供、本人確認、安全な運営および利用状況の把握のために利用します。目的を変更する場合は、関連性が合理的に認められる範囲で告知します。" },
    { id: "privacy-sharing", heading: "第三者提供・委託", body: "法令に基づく場合を除き、本人の同意なく個人情報を第三者へ提供しません。業務委託が必要な場合は、委託先を適切に選定し、必要な監督を行います。" },
    { id: "privacy-security", heading: "安全管理", body: "不正アクセス、紛失、改ざん、漏えいを防ぐため、アクセス制御、通信の保護、運用手順の整備など、取り扱う情報に応じた安全管理措置を講じます。" },
    { id: "privacy-request", heading: "開示・訂正・削除", body: "本人から開示、訂正、利用停止、削除などの請求があった場合は、本人確認のうえ、法令と運用方針に基づいて対応します。正式な受付窓口は公開前に事業者が確認します。" },
  ],
  terms: [
    { id: "terms-use", heading: "サイトの利用", body: "当サイトは、事業、商品、サービスおよび営業に関する情報を提供するために運営します。掲載内容は事業者確認後に公開し、必要に応じて予告なく変更または更新することがあります。" },
    { id: "terms-rights", heading: "著作権・知的財産権", body: "文章、写真、ロゴ、デザインその他の掲載物に関する権利は、各権利者に帰属します。私的利用など法令で認められる範囲を超えた複製、転載、改変、配布を禁止します。" },
    { id: "terms-prohibited", heading: "禁止事項", body: "法令または公序良俗に反する行為、当サイトや第三者の権利を侵害する行為、運営を妨害する行為、不正アクセス、虚偽情報の送信、その他事業者が不適切と判断する行為を禁止します。" },
    { id: "terms-links", heading: "外部サービスへのリンク", body: "当サイトから外部SNS、地図その他の第三者サービスへ移動する場合があります。移動先の内容、安全性、利用条件および個人情報の取り扱いについては、各サービスの規約をご確認ください。" },
    { id: "terms-disclaimer", heading: "免責事項", body: "掲載情報の正確性と最新性の確保に努めますが、利用によって生じた損害について、法令上責任を負う場合を除き責任を負いません。重要な判断は正式な窓口で最新情報をご確認ください。" },
    { id: "terms-change", heading: "条件の変更", body: "必要に応じて本条件を変更することがあります。変更後の内容は当サイトへの掲載時から適用されます。準拠法、管轄その他の正式条件は、事業者および専門家の確認後に確定します。" },
  ],
  commerce: [
    { id: "commerce-scope", heading: "この表記について", body: "オンラインで商品販売、有料サービス、申込みまたは決済を受け付ける場合に必要となる表示項目を整理しています。取引を行わない場合は、正式公開時にページの要否を事業者が確認します。" },
    { id: "commerce-operator", heading: "販売事業者・運営責任者", body: "正式な法人名または屋号、運営責任者名、所在地、電話番号、問い合わせ先は、登記情報と実際の運営体制を確認したうえで掲載します。請求があった場合の開示方法も確認します。" },
    { id: "commerce-price", heading: "販売価格・追加費用", body: "販売価格は各商品または申込み画面に税込・税別を区別して表示します。送料、決済手数料、通信料その他の追加費用が発生する場合は、購入確定前に明示します。" },
    { id: "commerce-payment", heading: "支払方法・支払時期", body: "利用できる決済方法、支払時期、請求名義、分割払いの可否は、実際に導入する決済サービスと契約条件を確認後に掲載します。未導入の決済方法を表示しません。" },
    { id: "commerce-delivery", heading: "提供・引渡し時期", body: "商品の発送時期、サービスの提供開始日、申込みの成立時点は、商品またはサービスの性質に合わせて明示します。在庫、天候、交通事情などによる遅延時の連絡方法も確認します。" },
    { id: "commerce-cancel", heading: "キャンセル・返品・交換", body: "キャンセル、返品、交換、返金の可否と期限、送料負担、不良品への対応は、実際の販売条件に合わせて掲載します。法令上必要な対応を妨げる条件は設定しません。" },
  ],
}

function buildFaq(page: DemoMultiPageData): DemoContentPage {
  const current = page.pages.faq!
  if (current.sections.length >= 5) return current
  const additions: DemoContentPage["sections"] = [
    { id: "faq-location", heading: "場所はどこですか？", body: `${page.pages.contact.address || page.pages.about.locationLabel}です。地図とアクセス方法はアクセスページをご確認ください。` },
    { id: "faq-latest", heading: "最新の営業情報はどこで確認できますか？", body: page.premium?.social.length ? "営業日や最新のご案内は公式SNSをご確認ください。公開情報にない事項は正式な窓口からお問い合わせください。" : "営業日や最新のご案内は、当サイトの正式な案内をご確認ください。" },
    { id: "faq-service", heading: `${page.meta.navLabels?.services ?? "商品・サービス"}について詳しく知りたいです。`, body: `${page.pages.services.title}ページで、${page.pages.services.services.map((item) => item.title).join("、")}をご案内しています。提供状況などの最新情報もあわせてご確認ください。` },
  ]
  const ids = new Set(current.sections.map((item) => item.id))
  return { ...current, sections: [...current.sections, ...additions.filter((item) => !ids.has(item.id))].slice(0, 7) }
}

export function upgradeDemoToPremiumV3(page: DemoMultiPageData, recipe = page.designRecipe): DemoMultiPageData {
  if (!page.premium) return page
  const brandSystem = resolveDemoBrandSystem(page, recipe)
  const hasSocial = page.premium.social.length > 0
  const isRestaurant = page.presentation?.industryProfile === "restaurant" || page.industry === "restaurant"
  const journeyCopy = {
    home: isRestaurant
      ? "メニュー、所在地、現在の営業案内を一つの流れで確認できます。ご来店前に必要な情報をご覧ください。"
      : "業務内容、考え方、相談の流れを一つのサイトで確認できます。まずは各ページから検討に必要な情報をご覧ください。",
    services: isRestaurant
      ? "提供内容はメニューページで、所在地と地図はアクセスページでご確認いただけます。"
      : "業務範囲と進め方を確認したうえで、正式な相談方法と必要な準備事項をご確認ください。",
    contact: hasSocial
      ? "所在地、地図、現在の案内はこのページで確認できます。営業や提供内容に変更がある場合は、公式SNSの最新情報もあわせてご確認ください。お問い合わせは入力・確認まで体験でき、正式公開時には実際の受付方法へ切り替えます。"
      : "所在地、地図、現在確認できる事業情報をこのページにまとめています。相談方法、受付条件、必要な入力項目は実際の運用に合わせてご案内します。お問い合わせは入力・確認まで体験できます。",
  }
  return {
    ...page,
    brandSystem,
    premium: { ...page.premium, style: "premium-v3" },
    designRecipe: recipe ? { ...recipe, typographyPreset: brandSystem.id } : recipe,
    pages: {
      ...page.pages,
      home: { ...page.pages.home, cta: { ...page.pages.home.cta, subtitle: journeyCopy.home } },
      services: { ...normalizeServices(page), ctaSubtitle: journeyCopy.services },
      contact: { ...page.pages.contact, formNote: journeyCopy.contact },
      works: page.pages.works ? enrichScenes(page) : page.pages.works,
      news: page.pages.news ? buildNews(page) : page.pages.news,
      faq: page.pages.faq ? buildFaq(page) : page.pages.faq,
      recruit: page.pages.recruit ? buildRecruit(page) : page.pages.recruit,
      privacy: page.pages.privacy ? { ...page.pages.privacy, eyebrow: "PRIVACY", sections: LEGAL_SECTIONS.privacy } : page.pages.privacy,
      terms: page.pages.terms ? { ...page.pages.terms, eyebrow: "TERMS", sections: LEGAL_SECTIONS.terms } : page.pages.terms,
      commerce: page.pages.commerce ? { ...page.pages.commerce, eyebrow: "COMMERCE DISCLOSURE", sections: LEGAL_SECTIONS.commerce } : page.pages.commerce,
    },
  }
}
