/**
 * lib/seo/schemas.ts — JSON-LD 構造化データビルダー
 *
 * 役割: Google / Bing / GEO (ChatGPT/Perplexity) 検索対策の構造化データ。
 *       schema.org 仕様準拠・全 page で適用 (s5 SEO 鉄則)。
 *
 * 永久ルール (CLAUDE.md s10-6 AE-PHP-3): 全 page.tsx は以下のいずれか以上を
 * 含むこと: LocalBusiness / Service / Article / FAQPage / BreadcrumbList
 */

const BASE = "https://paradigmjp.com"

// ─── 共通 utility ────────────────────────────────────────────────
export interface SchemaContext {
  locale: string
  url: string
}

// ─── LocalBusiness (組織) ────────────────────────────────────────
export function buildLocalBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${BASE}#organization`,
    name: "Paradigm合同会社",
    alternateName: ["Paradigm LLC", "パラダイム"],
    url: BASE,
    logo: `${BASE}/logo.png`,
    image: `${BASE}/og-image.png`,
    description: "Web 制作・MEO 対策・SEO/GEO・AI 導入支援。Paradigm合同会社が提供する 4 つのデジタル支援サービス。",
    address: {
      "@type": "PostalAddress",
      addressCountry: "JP",
      addressRegion: "Tokyo",
    },
    sameAs: [
      "https://github.com/Paradigmllc",
      "https://twitter.com/paradigm_jp",
    ],
    serviceArea: { "@type": "Country", name: ["Japan", "Worldwide"] },
    priceRange: "¥¥¥",
    areaServed: ["JP", "US", "EU", "Worldwide"],
  }
}

// ─── Service (個別サービス) ──────────────────────────────────────
export function buildServiceSchema(input: {
  name: string
  description: string
  url: string
  serviceType?: string
  priceRangeJpy?: string
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: input.serviceType ?? "Digital Service",
    name: input.name,
    description: input.description,
    url: input.url,
    provider: { "@type": "Organization", "@id": `${BASE}#organization`, name: "Paradigm合同会社" },
    areaServed: { "@type": "Country", name: ["Japan", "Worldwide"] },
    offers: input.priceRangeJpy ? {
      "@type": "Offer",
      priceCurrency: "JPY",
      priceSpecification: { "@type": "PriceSpecification", priceCurrency: "JPY", price: input.priceRangeJpy },
    } : undefined,
  }
}

// ─── Article (記事/ページ) ───────────────────────────────────────
export function buildArticleSchema(input: {
  title: string
  description?: string
  url: string
  locale: string
  datePublished?: string
  dateModified?: string
  authorName?: string
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description ?? "",
    url: input.url,
    inLanguage: input.locale,
    datePublished: input.datePublished ?? new Date().toISOString(),
    dateModified: input.dateModified ?? new Date().toISOString(),
    author: { "@type": "Organization", name: input.authorName ?? "Paradigm合同会社" },
    publisher: { "@type": "Organization", "@id": `${BASE}#organization`, name: "Paradigm合同会社" },
    mainEntityOfPage: { "@type": "WebPage", "@id": input.url },
  }
}

// ─── FAQPage ─────────────────────────────────────────────────────
export function buildFAQSchema(items: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(i => ({
      "@type": "Question",
      name: i.question,
      acceptedAnswer: { "@type": "Answer", text: i.answer },
    })),
  }
}

// ─── BreadcrumbList ──────────────────────────────────────────────
export function buildBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

// ─── WebSite (ホームページ・SearchAction 付き) ───────────────────
export function buildWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${BASE}#website`,
    url: BASE,
    name: "Paradigm合同会社",
    inLanguage: ["ja", "en"],
    publisher: { "@type": "Organization", "@id": `${BASE}#organization`, name: "Paradigm合同会社" },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${BASE}/ja/blog?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  }
}
