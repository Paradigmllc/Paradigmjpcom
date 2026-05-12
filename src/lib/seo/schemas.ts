/**
 * lib/seo/schemas.ts — JSON-LD 構造化データビルダー (locale-aware)
 *
 * 役割: Google / Bing / GEO (ChatGPT/Perplexity) 検索対策の構造化データ。
 *       schema.org 仕様準拠・全 page で適用 (s5 SEO 鉄則)。
 *
 * 永久ルール (CLAUDE.md s10-6 AE-PHP-3): 全 page.tsx は以下のいずれか以上を
 * 含むこと: LocalBusiness / Service / Article / FAQPage / BreadcrumbList
 *
 * 2026-05-12 12-locale 拡張: LOCALE_ORG_NAME / LOCALE_ORG_ALTERNATE_NAMES を
 * 経由して 12 locale 構造的データを生成。seed text (description) は
 * localeContentVariant() で ja/en 2 variant に collapse (Plan B 母版)。
 */

import {
  LOCALE_ORG_NAME,
  LOCALE_ORG_ALTERNATE_NAMES,
  localeContentVariant,
} from "@/lib/locale-map"

const BASE = "https://paradigmjp.com"

// ─── 共通 utility ────────────────────────────────────────────────
export interface SchemaContext {
  locale: string
  url: string
}

const orgNameFor = (locale: string) =>
  (LOCALE_ORG_NAME as Record<string, string>)[locale] ?? "Paradigm LLC"

const altNamesFor = (locale: string) =>
  (LOCALE_ORG_ALTERNATE_NAMES as Record<string, string[]>)[locale] ??
  LOCALE_ORG_ALTERNATE_NAMES.en

const orgDescFor = (locale: string) =>
  localeContentVariant(locale) === "ja"
    ? "Web 制作・MEO 対策・SEO/GEO・AI 導入支援。Paradigm合同会社が提供する 4 つのデジタル支援サービス。"
    : "Web development, MEO, SEO/GEO, and AI integration. Four productized services from Paradigm LLC."

// ─── LocalBusiness (組織) ────────────────────────────────────────
export function buildLocalBusinessSchema(locale: string = "ja") {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${BASE}#organization`,
    name: orgNameFor(locale),
    alternateName: altNamesFor(locale),
    url: BASE,
    logo: `${BASE}/logo.png`,
    image: `${BASE}/og-image.png`,
    description: orgDescFor(locale),
    address: {
      "@type": "PostalAddress",
      addressCountry: "JP",
      addressRegion: "Tokyo",
    },
    sameAs: ["https://github.com/Paradigmllc", "https://twitter.com/paradigm_jp"],
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
  locale?: string
  serviceType?: string
  priceRangeJpy?: string
}) {
  const locale = input.locale ?? "ja"
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: input.serviceType ?? "Digital Service",
    name: input.name,
    description: input.description,
    url: input.url,
    inLanguage: locale,
    provider: {
      "@type": "Organization",
      "@id": `${BASE}#organization`,
      name: orgNameFor(locale),
    },
    areaServed: { "@type": "Country", name: ["Japan", "Worldwide"] },
    offers: input.priceRangeJpy
      ? {
          "@type": "Offer",
          priceCurrency: "JPY",
          priceSpecification: {
            "@type": "PriceSpecification",
            priceCurrency: "JPY",
            price: input.priceRangeJpy,
          },
        }
      : undefined,
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
    author: {
      "@type": "Organization",
      name: input.authorName ?? orgNameFor(input.locale),
    },
    publisher: {
      "@type": "Organization",
      "@id": `${BASE}#organization`,
      name: orgNameFor(input.locale),
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": input.url },
  }
}

// ─── FAQPage ─────────────────────────────────────────────────────
export function buildFAQSchema(items: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
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
export function buildWebSiteSchema(locale: string = "ja") {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${BASE}#website`,
    url: BASE,
    name: orgNameFor(locale),
    inLanguage: ["ja", "en", "ko", "zh", "de", "fr", "es", "pt", "ru", "ar", "vi", "id"],
    publisher: {
      "@type": "Organization",
      "@id": `${BASE}#organization`,
      name: orgNameFor(locale),
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE}/${locale}/blog?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }
}
