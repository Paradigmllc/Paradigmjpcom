// ─── 構造化データ（JSON-LD） — locale-aware (P18-D-12) ──────────────
//
// `getOrganizationJsonLd(locale)` / `getServicesJsonLd(locale)` が locale
// 別の structured data を返す。layout.tsx は locale を渡して呼び出す。
//
// SEO 上も Google は同一 URL 内で言語混在より、locale ごとに正しい言語の
// description / knowsAbout / Service.name を出す方が評価される。

type Locale = "ja" | "en" | string

export function getOrganizationJsonLd(locale: Locale = "ja") {
  const isJa = locale === "ja"
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: isJa ? "Paradigm合同会社" : "Paradigm LLC",
    alternateName: isJa ? ["Paradigm LLC", "パラダイム"] : ["Paradigm 合同会社", "パラダイム"],
    url: "https://paradigmjp.com",
    logo: "https://paradigmjp.com/opengraph-image",
    description: isJa
      ? "Web制作・MEO対策・SEO/GEO対策・AI導入支援。デジタル技術で中小企業の成長を支援するParadigm合同会社。"
      : "Web development, MEO, SEO/GEO, and AI integration. Paradigm LLC supports SMB growth through digital technology.",
    email: "contact@paradigmjp.com",
    sameAs: ["https://github.com/Paradigmllc"],
    foundingDate: "2025",
    areaServed: { "@type": "Country", name: "Japan" },
    serviceArea: { "@type": "Country", name: "Japan" },
    knowsAbout: isJa
      ? ["Web制作", "MEO対策", "SEO", "GEO", "AI導入支援", "デジタルマーケティング"]
      : ["Web Development", "Local SEO (MEO)", "SEO", "GEO", "AI Integration", "Digital Marketing"],
  }
}

export function getServicesJsonLd(locale: Locale = "ja") {
  const isJa = locale === "ja"
  const orgName = isJa ? "Paradigm合同会社" : "Paradigm LLC"
  const services = isJa
    ? [
        { name: "Web制作", desc: "Next.js/WordPressによる高速・SEO最適化されたWebサイト制作", url: "/services/web", price: "298000", priceDesc: "ライトプラン〜" },
        { name: "MEO対策", desc: "Googleビジネスプロフィール最適化による地域検索上位表示", url: "/services/meo", price: "29800", priceDesc: "月額エントリープラン〜" },
        { name: "SEO/GEO対策", desc: "従来のSEO+AI検索最適化（GEO）による検索流入増加", url: "/services/seo", price: "49800", priceDesc: "月額SEOベーシック〜" },
        { name: "AI導入支援", desc: "ChatGPT/Gemini等を活用した業務自動化・チャットボット構築", url: "/services/ai", price: "198000", priceDesc: "AIスタートプラン〜" },
      ]
    : [
        { name: "Web Development", desc: "High-performance, SEO-optimised Next.js / WordPress sites", url: "/services/web", price: "298000", priceDesc: "From Light plan" },
        { name: "MEO (Local SEO)", desc: "Google Business Profile optimisation for top local rankings", url: "/services/meo", price: "29800", priceDesc: "From Entry plan / month" },
        { name: "SEO / GEO", desc: "Conventional SEO plus AI-search (GEO) for traffic growth", url: "/services/seo", price: "49800", priceDesc: "From SEO Basic / month" },
        { name: "AI Integration", desc: "ChatGPT / Gemini-powered automation and chatbot deployment", url: "/services/ai", price: "198000", priceDesc: "From AI Start plan" },
      ]
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: services.map((s) => ({
      "@type": "Service",
      name: s.name,
      description: s.desc,
      provider: { "@type": "Organization", name: orgName },
      url: `https://paradigmjp.com${s.url}`,
      offers: { "@type": "Offer", priceCurrency: "JPY", price: s.price, description: s.priceDesc },
    })),
  }
}

// Backward-compatible exports (= JA default)
export const ORGANIZATION_JSONLD = getOrganizationJsonLd("ja")
export const SERVICES_JSONLD = getServicesJsonLd("ja")

export const BREADCRUMB_JSONLD = (items: { name: string; url: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: item.name,
    item: item.url,
  })),
})

export const FAQ_JSONLD = (faqs: { q: string; a: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
})
