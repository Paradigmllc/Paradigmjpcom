// ─── 構造化データ（JSON-LD） — locale-aware (P18-D-12 / 2026-05-12 12-locale 拡張) ──
//
// `getOrganizationJsonLd(locale)` / `getServicesJsonLd(locale)` が locale
// 別の structured data を返す。layout.tsx は locale を渡して呼び出す。
//
// 設計: 構造的データ (name/alternateName) は 12 locale 完全対応 (LOCALE_ORG_NAME map)、
//       seed text (description/knowsAbout) は Plan B により ja/en 2 variant 母版を維持
//       (localeContentVariant ヘルパで collapse). 詳細 → lib/locale-map.ts.

import {
  LOCALE_ORG_NAME,
  LOCALE_ORG_ALTERNATE_NAMES,
  localeContentVariant,
} from "@/lib/locale-map"

const orgNameOf = (locale: string) =>
  (LOCALE_ORG_NAME as Record<string, string>)[locale] ?? "Paradigm LLC"

const altNamesOf = (locale: string) =>
  (LOCALE_ORG_ALTERNATE_NAMES as Record<string, string[]>)[locale] ??
  LOCALE_ORG_ALTERNATE_NAMES.en

export const JAPAN_ENTRY_TITLE = "Japan Entry Package for Fast-Decision SMBs"
export const JAPAN_ENTRY_DESCRIPTION =
  "$13,000 fixed Japan entry setup. Selected launch partners receive $2,000/month × 6 months = $12,000 of managed-operation value included, and month 7 onward is $2,000/month under the signed terms. Launch a market-ready Japanese revenue path with one accountable Tokyo-based team."
export const JAPAN_ENTRY_URL = "https://paradigmjp.com/en"
export const JAPAN_ENTRY_CONTACT_CANONICAL_URL =
  "https://paradigmjp.com/en/contact"
export const JAPAN_ENTRY_CONTACT_URL =
  "https://paradigmjp.com/en/contact?intent=japan-entry"

export const JAPAN_ENTRY_FAQS = [
  {
    q: "Is the setup fee always $13,000?",
    a: "Yes. The setup fee is fixed at $13,000 and paid before kickoff. If the launch cannot fit the published scope, Paradigm declines the application rather than increasing the price after the fact.",
  },
  {
    q: "What does the selected-launch-partner operating period include?",
    a: "The standard managed-operation fee is $2,000/month; selected launch partners receive $2,000/month × 6 months = $12,000 of managed-operation value included. Third-party usage, advertising, hosting, payment processing, legal, tax, and other external costs remain the client's responsibility.",
  },
  {
    q: "What happens after six months?",
    a: "From month 7 onward, managed operation is $2,000/month under the signed terms. Paradigm-operated monitoring, optimization, and support stop when the service ends.",
  },
  {
    q: "Do I need a Japanese entity or bank account?",
    a: "Not for every launch. Eligibility depends on the product, regulated category, payment methods, and provider account location. Paradigm confirms the viable route before accepting the fixed-scope engagement.",
  },
  {
    q: "Do you guarantee Japanese sales?",
    a: "No. Paradigm delivers the agreed market-ready environment and launch work, but does not guarantee a specific revenue outcome.",
  },
  {
    q: "What must our team provide?",
    a: "One final decision-maker, one implementation owner, accurate product and policy information, brand assets, and required account access within 48 hours of kickoff.",
  },
  {
    q: "Does the setup include SNS and market research?",
    a: "Yes. The fixed setup includes profile and starter-content setup for up to two priority social channels, plus a sourced public-signal market report across up to three markets with one priority deep dive. Ongoing posting and private traffic or revenue data are separate.",
  },
  {
    q: "Does regulatory screening replace legal advice?",
    a: "No. Paradigm screens likely disclosure and regulatory applicability, including Japan's Act on Specified Commercial Transactions where relevant, and records questions for qualified professionals. Formal legal opinions, filings, and licences remain separate.",
  },
  {
    q: "Which payment methods can we use?",
    a: "Wise, bank transfer, USDC, and credit card through a Stripe invoice or payment link are available after fit review. The invoice confirms the recipient, fees, and USDC network and wallet details.",
  },
  {
    q: "What happens if the agreed setup is not delivered within 14 business days?",
    a: "The Start Date is recorded after written scope acceptance, cleared payment, complete inputs, required access, and one empowered approver. If Paradigm misses the 14-business-day delivery commitment for the agreed setup, 100% of the USD 13,000 setup fee is refunded. Client-requested changes or holds pause the clock.",
  },
] as const

function getJapanEntryServiceJsonLd() {
  return {
    "@type": "Service",
    "@id": `${JAPAN_ENTRY_URL}#japan-entry-service`,
    name: JAPAN_ENTRY_TITLE,
    description: JAPAN_ENTRY_DESCRIPTION,
    serviceType: "Japan market entry implementation and managed operation",
    url: JAPAN_ENTRY_URL,
    provider: {
      "@type": "Organization",
      "@id": "https://paradigmjp.com#organization",
      name: "Paradigm LLC",
      url: "https://paradigmjp.com",
    },
    areaServed: { "@type": "Country", name: "Japan" },
    audience: {
      "@type": "BusinessAudience",
      audienceType: "Fast-decision global small and medium-sized businesses",
    },
    offers: {
      "@type": "Offer",
      "@id": `${JAPAN_ENTRY_URL}#fixed-offer`,
      url: JAPAN_ENTRY_CONTACT_URL,
      price: "13000",
      priceCurrency: "USD",
      description:
        "$13,000 one-time setup. Wise, bank transfer, USDC, or credit card via Stripe invoice/payment link. Selected launch partners receive $2,000/month × 6 months = $12,000 of managed-operation value included, and month 7 onward is $2,000/month under the signed terms. If the agreed setup is not delivered within 14 business days from the recorded Start Date, 100% of the setup fee is refunded under the written terms.",
      eligibleRegion: ["US", "CA", "GB", "EU", "AU", "NZ"],
      priceSpecification: [
        {
          "@type": "UnitPriceSpecification",
          name: "Fixed setup",
          price: "13000",
          priceCurrency: "USD",
        },
      ],
    },
  }
}

export function getJapanEntryHomeJsonLd(locale: string = "en") {
  const pageUrl = `https://paradigmjp.com/${locale}`
  return {
    "@context": "https://schema.org",
    "@graph": [
      getJapanEntryServiceJsonLd(),
      {
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        url: pageUrl,
        inLanguage: locale,
        mainEntity: JAPAN_ENTRY_FAQS.map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: { "@type": "Answer", text: faq.a },
        })),
      },
    ],
  }
}

export function getJapanEntryApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "@id": `${JAPAN_ENTRY_CONTACT_CANONICAL_URL}#webpage`,
    name: `Apply for the ${JAPAN_ENTRY_TITLE}`,
    description: JAPAN_ENTRY_DESCRIPTION,
    url: JAPAN_ENTRY_CONTACT_CANONICAL_URL,
    inLanguage: "en",
    about: getJapanEntryServiceJsonLd(),
    potentialAction: {
      "@type": "CommunicateAction",
      name: "Submit a Japan Entry application",
      target: {
        "@type": "EntryPoint",
        urlTemplate: JAPAN_ENTRY_CONTACT_URL,
      },
    },
  }
}

export function getOrganizationJsonLd(locale: string = "ja") {
  const variant = localeContentVariant(locale)
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://paradigmjp.com#organization",
    name: orgNameOf(locale),
    alternateName: altNamesOf(locale),
    url: "https://paradigmjp.com",
    logo: "https://paradigmjp.com/favicon.svg",
    description:
      variant === "ja"
        ? "Web制作、MEO、SEO/GEO、AI導入を、設計から公開後の運用まで支援するParadigm合同会社。"
        : JAPAN_ENTRY_DESCRIPTION,
    sameAs: [],
    areaServed: { "@type": "Country", name: "Japan" },
    serviceArea: { "@type": "Country", name: "Japan" },
    knowsAbout:
      variant === "ja"
        ? ["Web制作", "MEO", "SEO/GEO", "AI導入支援", "デジタルマーケティング", "運用改善"]
        : ["Japan Market Entry", "Localization", "Revenue Operations", "Buyer Trust", "Bilingual Support"],
  }
}

export function getServicesJsonLd(locale: string = "ja") {
  const variant = localeContentVariant(locale)
  const orgName = orgNameOf(locale)
  const pageLocale = variant === "ja" ? "ja" : locale
  const services: Array<{ name: string; desc: string; url: string; price?: string; priceDesc?: string }> = variant === "ja"
    ? [
        { name: "Web制作", desc: "目的と運用条件に合わせたWebサイトの設計・制作・公開後運用。", url: "/ja/services/web" },
        { name: "MEO", desc: "Googleビジネスプロフィールの整備、投稿・口コミ運用、順位計測。", url: "/ja/services/meo" },
        { name: "SEO/GEO", desc: "検索エンジンとAI検索に対応するコンテンツ・構造化データ・技術改善。", url: "/ja/services/seo" },
        { name: "AI導入支援", desc: "対象業務、人の確認工程、評価指標を定義したAI導入と自動化。", url: "/ja/services/ai" },
      ]
    : [
        {
          name: JAPAN_ENTRY_TITLE,
          desc: JAPAN_ENTRY_DESCRIPTION,
          url: `/${pageLocale}`,
          price: "13000",
          priceDesc: "Fixed one-time setup; selected launch partners receive $2,000/month × 6 months = $12,000 of managed-operation value included",
        },
      ]
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: services.map((s) => ({
      "@type": "Service",
      name: s.name,
      description: s.desc,
      provider: { "@type": "Organization", name: orgName },
      url: `https://paradigmjp.com${variant === "ja" ? s.url : `/${pageLocale}`}`,
      ...(s.price ? { offers: {
        "@type": "Offer",
        priceCurrency: variant === "ja" ? "JPY" : "USD",
        price: s.price,
        description: s.priceDesc,
      } } : {}),
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
