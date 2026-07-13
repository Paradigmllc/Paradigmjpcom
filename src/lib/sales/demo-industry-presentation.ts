import type { DemoContentPage, DemoMultiPageData } from "./demo-site-types"

type NavKey = "home" | "about" | "services" | "works" | "faq" | "contact"

interface PresentationProfile {
  nav: Record<NavKey, string>
  featureEyebrow: string
  featureHeading: string
  servicesEyebrow: string
  servicesHeading: string
  galleryEyebrow: string
  galleryHeading: (companyName: string) => string
  works: { title: string; subtitle: string; eyebrow: string }
}

const PROFILES: Record<string, PresentationProfile> = {
  restaurant: {
    nav: { home: "ホーム", about: "お店について", services: "メニュー", works: "店の景色", faq: "よくある質問", contact: "アクセス" },
    featureEyebrow: "TASTE & PLACE",
    featureHeading: "一杯と一皿を、\n選ぶ時間。",
    servicesEyebrow: "MENU",
    servicesHeading: "ご用意しているもの。",
    galleryEyebrow: "SCENES",
    galleryHeading: (name) => `${name}の景色。`,
    works: { title: "店の景色", subtitle: "写真とともに、お店の雰囲気をご紹介します。", eyebrow: "SCENES" },
  },
  beauty_salon: {
    nav: { home: "ホーム", about: "私たちについて", services: "メニュー", works: "スタイル", faq: "よくある質問", contact: "ご予約・アクセス" },
    featureEyebrow: "BEAUTY & CARE",
    featureHeading: "自分らしさを、\n丁寧に整える。",
    servicesEyebrow: "MENU",
    servicesHeading: "ご案内しているメニュー。",
    galleryEyebrow: "STYLE",
    galleryHeading: (name) => `${name}のスタイル。`,
    works: { title: "スタイル", subtitle: "施術や空間のイメージをご紹介します。", eyebrow: "STYLE" },
  },
  dental: {
    nav: { home: "ホーム", about: "医院について", services: "診療案内", works: "院内紹介", faq: "よくある質問", contact: "アクセス" },
    featureEyebrow: "CARE",
    featureHeading: "安心して相談できる、\n身近な診療を。",
    servicesEyebrow: "TREATMENT",
    servicesHeading: "診療について。",
    galleryEyebrow: "CLINIC",
    galleryHeading: (name) => `${name}の院内紹介。`,
    works: { title: "院内紹介", subtitle: "院内の設備や雰囲気をご紹介します。", eyebrow: "CLINIC" },
  },
  construction: {
    nav: { home: "ホーム", about: "私たちについて", services: "事業案内", works: "施工・仕事", faq: "よくある質問", contact: "お問い合わせ" },
    featureEyebrow: "CRAFT",
    featureHeading: "確かな仕事を、\n一つひとつ。",
    servicesEyebrow: "SERVICES",
    servicesHeading: "手がけていること。",
    galleryEyebrow: "WORKS",
    galleryHeading: (name) => `${name}の仕事。`,
    works: { title: "施工・仕事", subtitle: "仕事の内容を写真とともにご紹介します。", eyebrow: "WORKS" },
  },
  retail: {
    nav: { home: "ホーム", about: "お店について", services: "商品・サービス", works: "ギャラリー", faq: "よくある質問", contact: "店舗情報" },
    featureEyebrow: "SELECTION",
    featureHeading: "暮らしに寄り添うものを、\n丁寧に選ぶ。",
    servicesEyebrow: "LINEUP",
    servicesHeading: "取り扱っているもの。",
    galleryEyebrow: "GALLERY",
    galleryHeading: (name) => `${name}のセレクション。`,
    works: { title: "ギャラリー", subtitle: "商品や店舗の雰囲気をご紹介します。", eyebrow: "GALLERY" },
  },
}

const DEFAULT_PROFILE: PresentationProfile = {
  nav: { home: "ホーム", about: "私たちについて", services: "事業案内", works: "仕事・実績", faq: "よくある質問", contact: "お問い合わせ" },
  featureEyebrow: "OUR APPROACH",
  featureHeading: "大切にしていることを、\nひとつずつ。",
  servicesEyebrow: "SERVICES",
  servicesHeading: "ご提供していること。",
  galleryEyebrow: "GALLERY",
  galleryHeading: (name) => `${name}の仕事と風景。`,
  works: { title: "仕事・実績", subtitle: "事業や仕事の様子をご紹介します。", eyebrow: "WORKS" },
}

function meaningfulMediaSections(page: DemoMultiPageData): DemoContentPage["sections"] {
  const media = [...(page.premium?.gallery ?? []), ...(page.premium?.heroMedia ?? [])]
  const unique = media.filter((item, index) => media.findIndex((candidate) => candidate.src === item.src) === index)
  return unique.slice(0, 4).map((item, index) => ({
    id: `scene-${index + 1}`,
    heading: item.title?.trim() || item.eyebrow?.trim() || `Scene ${String(index + 1).padStart(2, "0")}`,
    body: item.caption?.trim() || item.alt,
  }))
}

function socialNewsPage(page: DemoMultiPageData): DemoContentPage {
  const instagram = page.premium?.social.find((item) => item.network === "instagram")
  return {
    title: "お知らせ",
    subtitle: instagram ? "最新のお知らせは公式Instagramでご案内しています。" : "最新情報はこちらでご案内します。",
    eyebrow: "NEWS",
    sections: [{
      id: "latest-information",
      heading: instagram ? "公式Instagram" : "最新情報",
      body: instagram
        ? "営業日や新しいご案内など、最新の情報は公式Instagramをご確認ください。"
        : "正式公開後、営業案内や新しいお知らせをこちらに掲載できます。",
      note: instagram?.href,
    }],
    accentColor: page.meta.accentColor,
  }
}

/**
 * Adds a deterministic editorial layer after the single company-level LLM call.
 * It changes information architecture and labels without inventing business facts.
 */
export function applyIndustryPresentation(page: DemoMultiPageData): DemoMultiPageData {
  if (page.locale !== "ja") return page
  const profile = PROFILES[String(page.industry)] ?? DEFAULT_PROFILE
  const social = page.premium?.social[0]
  const primaryHref = social?.href ?? `/${page.slug}/contact`
  const primaryLabel = social ? `${social.label}を見る` : profile.nav.contact
  const scenes = meaningfulMediaSections(page)
  const works = page.pages.works ? {
    ...page.pages.works,
    ...profile.works,
    sections: scenes.length > 0 ? scenes : page.pages.works.sections,
  } : page.pages.works

  return {
    ...page,
    meta: {
      ...page.meta,
      proposalNotice: "提案用デモ · 公式サイトではありません",
      primaryCtaLabel: primaryLabel,
      primaryCtaHref: primaryHref,
      footerDescription: page.meta.description,
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
        hero: {
          ...page.pages.home.hero,
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
      },
      services: {
        ...page.pages.services,
        title: profile.nav.services,
        processEyebrow: page.industry === "restaurant" ? "VISIT" : "FLOW",
        processTitle: page.industry === "restaurant" ? "店で過ごす時間。" : "ご利用の流れ。",
        services: page.pages.services.services.map((service) => ({ ...service, priceNote: undefined })),
        ctaTitle: social ? "最新のご案内はこちら。" : "詳しく知りたい方へ。",
        ctaSubtitle: social ? "営業情報や最新のラインアップは、公式アカウントをご確認ください。" : page.pages.contact.formNote || page.pages.contact.subtitle,
        ctaText: primaryLabel,
        ctaHref: primaryHref,
      },
      works,
      news: socialNewsPage(page),
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
    },
  }
}
