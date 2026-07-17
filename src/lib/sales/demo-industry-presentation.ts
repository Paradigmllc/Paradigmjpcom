import type { DemoContentPage, DemoMultiPageData } from "./demo-site-types"
import { sanitizeDemoCopy, sanitizeDemoMedia } from "./demo-public-surface"

type NavKey = "home" | "about" | "services" | "works" | "faq" | "contact"

interface PresentationProfile {
  categoryLabel: string
  accentColor: string
  accentColorDark: string
  nav: Record<NavKey, string>
  featureEyebrow: string
  featureHeading: string
  servicesEyebrow: string
  servicesHeading: string
  galleryEyebrow: string
  galleryHeading: (companyName: string) => string
  sceneHeadings: string[]
  contactTitle: string
  contactSubtitle: string
  works: { title: string; subtitle: string; eyebrow: string }
  aboutLead: string
  worksLead: string
  worksDescription: string
}

const PROFILES: Record<string, PresentationProfile> = {
  restaurant: {
    categoryLabel: "飲食店",
    accentColor: "#b86b3d",
    accentColorDark: "#7d4324",
    nav: { home: "ホーム", about: "お店について", services: "メニュー", works: "店の景色", faq: "よくある質問", contact: "アクセス" },
    featureEyebrow: "TASTE & PLACE",
    featureHeading: "一杯と一皿を、\n選ぶ時間。",
    servicesEyebrow: "MENU",
    servicesHeading: "ご用意しているもの。",
    galleryEyebrow: "SCENES",
    galleryHeading: (name) => `${name}の景色。`,
    sceneHeadings: ["店内とメニュー", "一杯を淹れる時間", "店の佇まい", "季節の一皿"],
    contactTitle: "店舗情報・アクセス",
    contactSubtitle: "所在地、地図、最新情報の確認先をご案内します。",
    works: { title: "店の景色", subtitle: "写真とともに、お店の雰囲気をご紹介します。", eyebrow: "SCENES" },
    aboutLead: "料理と空間をつくる、日々のこと。",
    worksLead: "写真から伝わる、\nお店の空気。",
    worksDescription: "料理や店内の写真を通じて、その場所で過ごす時間や細部のこだわりをご紹介します。",
  },
  beauty_salon: {
    categoryLabel: "美容サロン",
    accentColor: "#b66b7b",
    accentColorDark: "#7d3f50",
    nav: { home: "ホーム", about: "私たちについて", services: "メニュー", works: "スタイル", faq: "よくある質問", contact: "ご予約・アクセス" },
    featureEyebrow: "サロンの考え方",
    featureHeading: "髪を整える時間まで、\n心地よく。",
    servicesEyebrow: "メニュー",
    servicesHeading: "髪と日常を整える、\nサロンメニュー。",
    galleryEyebrow: "スタイル",
    galleryHeading: (name) => `${name}で生まれるスタイル。`,
    sceneHeadings: ["スタイル", "施術の時間", "サロン空間", "ディテール"],
    contactTitle: "ご予約・アクセス",
    contactSubtitle: "所在地と正式なご予約・お問い合わせ方法をご案内します。",
    works: { title: "スタイル", subtitle: "施術や空間のイメージをご紹介します。", eyebrow: "STYLE" },
    aboutLead: "髪と日常に寄り添う、サロンの考え方。",
    worksLead: "仕上がりの先にある、\n心地よい時間。",
    worksDescription: "スタイル、施術、空間の写真を通じて、サロンで過ごす時間を具体的にご紹介します。",
  },
  dental: {
    categoryLabel: "歯科医院",
    accentColor: "#168a8c",
    accentColorDark: "#0a5c60",
    nav: { home: "ホーム", about: "医院について", services: "診療案内", works: "院内紹介", faq: "よくある質問", contact: "アクセス" },
    featureEyebrow: "CARE",
    featureHeading: "安心して相談できる、\n身近な診療を。",
    servicesEyebrow: "TREATMENT",
    servicesHeading: "診療について。",
    galleryEyebrow: "CLINIC",
    galleryHeading: (name) => `${name}の院内紹介。`,
    sceneHeadings: ["受付・待合", "診療空間", "院内設備", "アクセス"],
    contactTitle: "アクセス・お問い合わせ",
    contactSubtitle: "所在地と正式な受診・お問い合わせ方法をご案内します。",
    works: { title: "院内紹介", subtitle: "院内の設備や雰囲気をご紹介します。", eyebrow: "CLINIC" },
    aboutLead: "安心して相談できる、身近な医院へ。",
    worksLead: "診療を支える、\n院内の環境。",
    worksDescription: "受付、待合、診療空間など、来院前に確認したい院内の様子をご紹介します。",
  },
  construction: {
    categoryLabel: "建設・施工",
    accentColor: "#ad6a32",
    accentColorDark: "#713d1d",
    nav: { home: "ホーム", about: "私たちについて", services: "事業案内", works: "施工・仕事", faq: "よくある質問", contact: "お問い合わせ" },
    featureEyebrow: "CRAFT",
    featureHeading: "確かな仕事を、\n一つひとつ。",
    servicesEyebrow: "SERVICES",
    servicesHeading: "手がけていること。",
    galleryEyebrow: "WORKS",
    galleryHeading: (name) => `${name}の仕事。`,
    sceneHeadings: ["仕事の現場", "手仕事の細部", "仕上がり", "地域とのつながり"],
    contactTitle: "お問い合わせ",
    contactSubtitle: "所在地と正式なお問い合わせ方法をご案内します。",
    works: { title: "施工・仕事", subtitle: "仕事の内容を写真とともにご紹介します。", eyebrow: "WORKS" },
    aboutLead: "確かな仕事を支える、日々の姿勢。",
    worksLead: "現場から見える、\n確かな仕事。",
    worksDescription: "施工の考え方、現場の様子、仕上がりに至るまでの判断軸をご紹介します。",
  },
  retail: {
    categoryLabel: "ショップ",
    accentColor: "#a5793f",
    accentColorDark: "#6b4d27",
    nav: { home: "ホーム", about: "お店について", services: "商品・サービス", works: "ギャラリー", faq: "よくある質問", contact: "店舗情報" },
    featureEyebrow: "SELECTION",
    featureHeading: "暮らしに寄り添うものを、\n丁寧に選ぶ。",
    servicesEyebrow: "LINEUP",
    servicesHeading: "取り扱っているもの。",
    galleryEyebrow: "GALLERY",
    galleryHeading: (name) => `${name}のセレクション。`,
    sceneHeadings: ["セレクション", "店内の風景", "商品のディテール", "季節のご案内"],
    contactTitle: "店舗情報",
    contactSubtitle: "所在地、地図、最新情報の確認先をご案内します。",
    works: { title: "ギャラリー", subtitle: "商品や店舗の雰囲気をご紹介します。", eyebrow: "GALLERY" },
    aboutLead: "暮らしに寄り添うものを、丁寧に選ぶ。",
    worksLead: "商品と空間から伝わる、\n店の個性。",
    worksDescription: "商品の表情、店内の雰囲気、季節の提案を写真とともにご紹介します。",
  },
}

const DEFAULT_PROFILE: PresentationProfile = {
  categoryLabel: "事業者",
  accentColor: "#526579",
  accentColorDark: "#2f4356",
  nav: { home: "ホーム", about: "私たちについて", services: "事業案内", works: "仕事・実績", faq: "よくある質問", contact: "お問い合わせ" },
  featureEyebrow: "OUR APPROACH",
  featureHeading: "大切にしていることを、\nひとつずつ。",
  servicesEyebrow: "SERVICES",
  servicesHeading: "ご提供していること。",
  galleryEyebrow: "GALLERY",
  galleryHeading: (name) => `${name}の仕事と風景。`,
  sceneHeadings: ["仕事の風景", "サービスの様子", "空間とディテール", "日々の取り組み"],
  contactTitle: "お問い合わせ",
  contactSubtitle: "所在地と正式なお問い合わせ方法をご案内します。",
  works: { title: "仕事・実績", subtitle: "事業や仕事の様子をご紹介します。", eyebrow: "WORKS" },
  aboutLead: "事業を支える考え方と、日々の取り組み。",
  worksLead: "実績から見える、\n私たちの仕事。",
  worksDescription: "提供するサービスだけでなく、取り組み方や仕事の細部も大切な判断材料です。",
}

const CUSTOMER_FACING_FAQ: Record<string, Array<{ heading: string; body: string }>> = {
  restaurant: [
    { heading: "予約や営業日の確認方法は？", body: "営業日、営業時間、予約方法は公式の最新案内をご確認ください。" },
    { heading: "どのようなメニューがありますか？", body: "現在ご用意しているメニューや季節の案内は、メニューページと公式のお知らせでご確認いただけます。" },
    { heading: "お店へのアクセスを教えてください", body: "所在地と地図はアクセスページに掲載しています。ご来店前に最新の案内をご確認ください。" },
    { heading: "最新情報はどこで見られますか？", body: "営業に関する最新情報は、公式アカウントまたは店舗からの案内をご確認ください。" },
  ],
  beauty_salon: [
    { heading: "予約やメニューの確認方法は？", body: "予約方法、受付状況、メニューの詳細は公式の最新案内をご確認ください。" },
    { heading: "初めて利用する場合の流れは？", body: "ご予約から施術当日までの流れは、サービスページと公式の案内でご確認いただけます。" },
    { heading: "サロンへのアクセスを教えてください", body: "所在地と地図はアクセスページに掲載しています。ご来店前に最新の案内をご確認ください。" },
    { heading: "最新のスタイルや空き状況は？", body: "最新のスタイルや営業情報は、公式アカウントまたはサロンからの案内をご確認ください。" },
  ],
  dental: [
    { heading: "初診時に確認しておくことは？", body: "診療内容、持ち物、受診方法は医院からの最新案内をご確認ください。" },
    { heading: "診療内容を教えてください", body: "現在確認できる診療内容は診療案内ページにまとめています。適応や詳細は医院へご確認ください。" },
    { heading: "予約やお問い合わせの方法は？", body: "予約方法と受付時間は、医院の公式案内をご確認ください。" },
    { heading: "医院へのアクセスを教えてください", body: "所在地と地図はアクセスページに掲載しています。来院前に最新の案内をご確認ください。" },
  ],
  construction: [
    { heading: "相談から着工までの流れは？", body: "ご相談、現地確認、提案、契約、施工の流れはサービスページでご案内しています。" },
    { heading: "対応エリアを教えてください", body: "対応エリアは案件や内容によって異なるため、所在地とご相談内容を添えてお問い合わせください。" },
    { heading: "費用や工期はどのように決まりますか？", body: "現地の状況とご要望を確認したうえで、内容に応じて正式にご案内します。" },
    { heading: "施工後の相談はできますか？", body: "施工後の確認やメンテナンスについては、正式な案内と契約内容をご確認ください。" },
  ],
  retail: [
    { heading: "取扱商品を教えてください", body: "現在のラインアップや季節の商品は、商品ページと公式の最新案内をご確認ください。" },
    { heading: "営業時間と定休日は？", body: "営業時間と定休日は、来店前に店舗からの最新案内をご確認ください。" },
    { heading: "在庫や取り置きについて確認できますか？", body: "在庫や取り置きの可否は商品によって異なるため、店舗へ直接ご確認ください。" },
    { heading: "店舗へのアクセスを教えてください", body: "所在地と地図は店舗情報ページに掲載しています。" },
  ],
  default: [
    { heading: "提供内容を教えてください", body: "現在確認できる提供内容はサービスページにまとめています。詳細は正式な案内をご確認ください。" },
    { heading: "相談の進め方は？", body: "ご相談から実行までの流れは、サービスページでステップごとにご案内しています。" },
    { heading: "対応エリアや対象を教えてください", body: "対応範囲は内容によって異なるため、現在の案内をご確認のうえお問い合わせください。" },
    { heading: "お問い合わせ方法は？", body: "お問い合わせページから、正式な窓口と確認方法をご覧いただけます。" },
  ],
}

function rewriteCustomerFacingFaq(
  sections: DemoContentPage["sections"],
  profileKey: string,
): DemoContentPage["sections"] {
  const copy = CUSTOMER_FACING_FAQ[profileKey] ?? CUSTOMER_FACING_FAQ.default
  const rewritten = sections.map((section, index) => {
    const replacement = copy[index]
    return replacement ? { ...section, heading: replacement.heading, body: replacement.body } : section
  })
  return copy.slice(rewritten.length).reduce<DemoContentPage["sections"]>((result, replacement, index) => [
    ...result,
    {
      id: `faq-customer-${rewritten.length + index + 1}`,
      heading: replacement.heading,
      body: replacement.body,
    },
  ], rewritten)
}

function resolveProfileKey(page: DemoMultiPageData): string {
  const explicit = String(page.industry ?? "").trim()
  if (PROFILES[explicit]) return explicit
  const signal = `${explicit} ${page.pages.home.hero.industryLabel} ${page.companyName}`.toLowerCase()
  if (/(飲食|レストラン|カフェ|喫茶|料理|food|restaurant|cafe|bar|bakery)/u.test(signal)) return "restaurant"
  if (/(美容|サロン|beauty|hair|nail)/u.test(signal)) return "beauty_salon"
  if (/(歯科|医院|クリニック|dental|clinic)/u.test(signal)) return "dental"
  if (/(工務|建設|施工|リフォーム|construction|remodel)/u.test(signal)) return "construction"
  if (/(小売|ショップ|販売|retail|shop)/u.test(signal)) return "retail"
  return explicit || "default"
}

function buildNarrativeModules(page: DemoMultiPageData, profile: PresentationProfile) {
  const existing = page.pages.home.narrativeModules ?? []
  if (existing.length >= 3) return existing
  const serviceModules = page.pages.services.services.slice(0, 3).map((service, index) => ({
    eyebrow: `${profile.servicesEyebrow} 0${index + 1}`,
    title: service.title,
    body: service.description,
    points: service.features.slice(0, 3),
  }))
  return serviceModules.length >= 3 ? serviceModules : [
    { eyebrow: "APPROACH", title: profile.aboutLead, body: page.pages.about.story, points: page.pages.about.values.slice(0, 3).map((value) => value.title) },
    ...serviceModules,
  ].slice(0, 3)
}

function meaningfulMediaSections(page: DemoMultiPageData, profile: PresentationProfile): DemoContentPage["sections"] {
  const media = [...(page.premium?.gallery ?? []), ...(page.premium?.heroMedia ?? [])]
  const unique = media.filter((item, index) => media.findIndex((candidate) => candidate.src === item.src) === index)
  return unique.slice(0, 4).map((item, index) => ({
    id: `scene-${index + 1}`,
    heading: item.title?.trim() || item.eyebrow?.trim() || profile.sceneHeadings[index] || `Gallery ${String(index + 1).padStart(2, "0")}`,
    body: item.caption?.trim() || item.alt,
  }))
}

function socialNewsPage(page: DemoMultiPageData): DemoContentPage {
  const instagram = page.premium?.social.find((item) => item.network === "instagram")
  const serviceSections = page.pages.services.services.slice(0, 2).map((service, index) => ({
    id: `service-note-${index + 1}`,
    heading: service.title,
    body: service.description,
    note: instagram?.href,
  }))
  return {
    title: "お知らせ",
    subtitle: instagram ? "最新のお知らせは公式Instagramでご案内しています。" : "最新情報はこちらでご案内します。",
    eyebrow: "NEWS",
    sections: [
      {
        id: "latest-information",
        heading: instagram ? "公式Instagramからのご案内" : "最新情報",
        body: instagram
          ? "営業日や新しいご案内など、最新の情報は公式Instagramをご確認ください。"
          : "営業案内や新しいお知らせは、確認済みの情報をこちらに掲載します。",
        note: instagram?.href,
      },
      ...serviceSections,
    ],
    accentColor: page.meta.accentColor,
  }
}

function normalizedCopy(value: string | undefined): string {
  return (value ?? "").replace(/[\s、。！？・／/「」『』（）()]/gu, "").toLowerCase()
}

function distinctPremiumIntro(page: DemoMultiPageData, profile: PresentationProfile) {
  if (!page.premium) return page.premium
  const intro = page.premium.intro
  const repeatsHero = normalizedCopy(intro.title) === normalizedCopy(page.pages.home.hero.title)
  const repeatsStory = normalizedCopy(intro.body) === normalizedCopy(page.pages.about.story)
  const valueSummary = page.pages.about.values
    .slice(0, 2)
    .map((value) => value.description.trim())
    .filter(Boolean)
    .join("\n")

  return {
    ...page.premium,
    intro: {
      ...intro,
      eyebrow: repeatsHero ? profile.featureEyebrow : intro.eyebrow,
      title: repeatsHero ? profile.featureHeading : intro.title,
      body: repeatsStory && valueSummary ? valueSummary : intro.body,
      note: profile.categoryLabel === "飲食店"
        ? "料理、空間、サービス。その店らしさが伝わる情報を、写真と言葉でご紹介します。"
        : `${profile.categoryLabel}の特徴とご案内を、確認できる情報をもとに整理しています。`,
    },
  }
}

/**
 * Adds a deterministic editorial layer after the single company-level LLM call.
 * It changes information architecture and labels without inventing business facts.
 */
export function applyIndustryPresentation(page: DemoMultiPageData): DemoMultiPageData {
  if (page.locale !== "ja") return page
  const profileKey = resolveProfileKey(page)
  const profile = PROFILES[profileKey] ?? DEFAULT_PROFILE
  const publicMedia = page.premium
    ? {
        ...page.premium,
        heroMedia: sanitizeDemoMedia(page.premium.heroMedia, page.companyName, profile.sceneHeadings).slice(0, 5),
        gallery: sanitizeDemoMedia(
          [...page.premium.gallery, ...page.premium.heroMedia],
          page.companyName,
          profile.sceneHeadings,
        ).slice(0, 8),
      }
    : page.premium
  const publicServices = page.pages.services.services.map((service) => ({
    ...service,
    description: sanitizeDemoCopy(service.description, `${service.title}についてご案内します。`),
    features: service.features
      .map((feature) => sanitizeDemoCopy(feature, ""))
      .filter(Boolean),
  }))
  const publicPage: DemoMultiPageData = {
    ...page,
    premium: publicMedia,
    pages: {
      ...page.pages,
      services: { ...page.pages.services, services: publicServices },
    },
  }
  const social = page.premium?.social[0]
  const primaryHref = social?.href ?? `/${page.slug}/contact`
  const primaryLabel = social ? `${social.label}を見る` : profile.nav.contact
  const scenes = meaningfulMediaSections(page, profile)
  const authoredWorks = page.pages.works?.sections ?? []
  const hasSubstantialWorks = authoredWorks.length >= 4
    && authoredWorks.every((section) => section.body.trim().length >= 120)
  const works = page.pages.works ? {
    ...page.pages.works,
    ...profile.works,
    sections: hasSubstantialWorks ? authoredWorks : scenes.length > 0 ? scenes : authoredWorks,
  } : page.pages.works

  return {
    ...page,
    premium: distinctPremiumIntro(publicPage, profile),
    meta: {
      ...page.meta,
      title: `${page.companyName} | ${profile.categoryLabel}`,
      accentColor: profile.accentColor,
      accentColorDark: profile.accentColorDark,
      proposalNotice: "提案用デモ · 公式サイトではありません",
      primaryCtaLabel: primaryLabel,
      primaryCtaHref: primaryHref,
      footerDescription: `${profile.aboutLead} ${page.pages.contact.address || page.pages.about.locationLabel}`.trim(),
      footerOwner: page.companyName,
      navLabels: profile.nav,
    },
      pages: {
      ...page.pages,
      home: {
        ...page.pages.home,
        featureEyebrow: profile.featureEyebrow,
        featureHeading: profile.featureHeading,
        featureSubtitle: page.pages.services.subtitle,
        narrativeModules: buildNarrativeModules(publicPage, profile),
        hero: {
          ...page.pages.home.hero,
          tagline: profile.categoryLabel,
          industryLabel: profile.categoryLabel,
          primaryCta: { text: primaryLabel, href: primaryHref },
          secondaryCta: { text: profile.nav.services, href: `/${page.slug}/services` },
        },
        cta: {
          ...page.pages.home.cta,
          title: social ? "最新のご案内を、公式SNSで。" : "詳しい情報をご案内します。",
          subtitle: social ? "営業情報や新しいお知らせは、公式アカウントをご確認ください。" : page.pages.contact.formNote || page.pages.contact.subtitle,
          buttonText: primaryLabel,
          buttonHref: primaryHref,
        },
      },
      about: {
        ...page.pages.about,
        title: profile.nav.about,
        industryLabel: profile.categoryLabel,
      },
      services: {
        ...page.pages.services,
        title: profile.nav.services,
        processEyebrow: profileKey === "restaurant" ? "VISIT" : "FLOW",
        processTitle: profileKey === "restaurant" ? "店で過ごす時間。" : "ご利用の流れ。",
        services: publicServices.map((service) => ({ ...service, priceNote: undefined })),
        ctaTitle: social ? "最新のご案内はこちら。" : "詳しく知りたい方へ。",
        ctaSubtitle: social ? "営業情報や最新のラインアップは、公式アカウントをご確認ください。" : page.pages.contact.formNote || page.pages.contact.subtitle,
        ctaText: primaryLabel,
        ctaHref: primaryHref,
      },
      contact: {
        ...page.pages.contact,
        title: profile.contactTitle,
        subtitle: profile.contactSubtitle,
      },
      works,
      news: socialNewsPage(publicPage),
      faq: page.pages.faq
        ? { ...page.pages.faq, sections: rewriteCustomerFacingFaq(page.pages.faq.sections, profileKey) }
        : page.pages.faq,
      recruit: page.pages.recruit ? {
        ...page.pages.recruit,
        title: "採用情報",
        subtitle: "募集状況と応募方法についてご案内します。",
        eyebrow: "RECRUIT",
        sections: [
          {
            id: "recruit-status",
            heading: "現在の募集について",
            body: "募集の有無、職種、勤務条件は事業者による正式な確認が必要です。公開時は最新の募集要項をこちらに掲載します。",
          },
          {
            id: "recruit-contact",
            heading: "応募を検討される方へ",
            body: "業務内容、勤務地、勤務時間、待遇、選考方法をご確認のうえ、正式に案内された応募窓口をご利用ください。",
          },
        ],
      } : page.pages.recruit,
    },
    presentation: {
      featureEyebrow: profile.featureEyebrow,
      featureHeading: profile.featureHeading,
      servicesEyebrow: profile.servicesEyebrow,
      servicesHeading: profile.servicesHeading,
      galleryEyebrow: profile.galleryEyebrow,
      galleryHeading: profile.galleryHeading(page.companyName),
      industryProfile: profileKey,
      worksLead: profile.worksLead,
      worksDescription: profile.worksDescription,
      aboutLead: profile.aboutLead,
    },
  }
}
