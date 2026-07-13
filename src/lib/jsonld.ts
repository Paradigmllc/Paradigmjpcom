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
  "$12,000 fixed Japan entry setup with six months of managed operation included. Launch a market-ready Japanese revenue path with one accountable Tokyo-based team."
export const JAPAN_ENTRY_URL = "https://paradigmjp.com/en"
export const JAPAN_ENTRY_CONTACT_CANONICAL_URL =
  "https://paradigmjp.com/en/contact"
export const JAPAN_ENTRY_CONTACT_URL =
  "https://paradigmjp.com/en/contact?intent=japan-entry"

export const JAPAN_ENTRY_FAQS = [
  {
    q: "Is the setup fee always $12,000?",
    a: "Yes. The setup fee is fixed at $12,000 and paid before kickoff. If the launch cannot fit the published scope, Paradigm declines the application rather than increasing the price after the fact.",
  },
  {
    q: "What does $0/month for six months mean?",
    a: "The standard managed operating service is included for the first six months at no additional monthly charge. Third-party usage, advertising, hosting, payment processing, legal, tax, and other external costs remain the client's responsibility.",
  },
  {
    q: "What happens after six months?",
    a: "Managed operation continues at $995 per month and may be cancelled for future billing under the signed service terms. Paradigm-operated monitoring, optimization, and support stop when the service ends.",
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
    a: "The Start Date is recorded after written scope acceptance, cleared payment, complete inputs, required access, and one empowered approver. If Paradigm misses the 14-business-day delivery commitment for the agreed setup, 100% of the USD 12,000 setup fee is refunded. Client-requested changes or holds pause the clock.",
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
      price: "12000",
      priceCurrency: "USD",
      description:
        "$12,000 one-time setup. Wise, bank transfer, USDC, or credit card via Stripe invoice/payment link. Managed operation is $0/month for the first six months, then $995/month. If the agreed setup is not delivered within 14 business days from the recorded Start Date, 100% of the setup fee is refunded under the written terms.",
      eligibleRegion: ["US", "CA", "GB", "EU", "AU", "NZ"],
      priceSpecification: [
        {
          "@type": "UnitPriceSpecification",
          name: "Fixed setup",
          price: "12000",
          priceCurrency: "USD",
        },
        {
          "@type": "UnitPriceSpecification",
          name: "Managed operation — months 1 through 6",
          price: "0",
          priceCurrency: "USD",
          unitText: "MONTH",
        },
        {
          "@type": "UnitPriceSpecification",
          name: "Managed operation — from month 7",
          price: "995",
          priceCurrency: "USD",
          unitText: "MONTH",
        },
      ],
    },
  }
}

export function getJapanEntryHomeJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      getJapanEntryServiceJsonLd(),
      {
        "@type": "FAQPage",
        "@id": `${JAPAN_ENTRY_URL}#faq`,
        url: JAPAN_ENTRY_URL,
        inLanguage: "en",
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
        ? "海外SMB向けのJapan Entry固定パッケージ。日本語の購入者導線、市場・競合根拠、SNS、法規制の適用可能性整理、公開運用を接続するParadigm合同会社。"
        : JAPAN_ENTRY_DESCRIPTION,
    sameAs: [],
    areaServed: { "@type": "Country", name: "Japan" },
    serviceArea: { "@type": "Country", name: "Japan" },
    knowsAbout:
      variant === "ja"
        ? ["Japan Entry", "ローカライズ", "市場・競合調査", "SNS初期設定", "法規制スクリーニング", "日本語サポート"]
        : ["Japan Market Entry", "Localization", "Revenue Operations", "Buyer Trust", "Bilingual Support"],
  }
}

export function getServicesJsonLd(locale: string = "ja") {
  const variant = localeContentVariant(locale)
  const orgName = orgNameOf(locale)
  const services = variant === "ja"
    ? [{ name: JAPAN_ENTRY_TITLE, desc: "日本語の購入者導線、市場根拠、SNS、法規制の適用可能性整理、公開運用を一つにまとめた固定パッケージ。", url: "/ja", price: "12000", priceDesc: "固定セットアップ・6か月運用込み" }]
    : [
        {
          name: JAPAN_ENTRY_TITLE,
          desc: JAPAN_ENTRY_DESCRIPTION,
          url: "/en",
          price: "12000",
          priceDesc: "Fixed one-time setup with six months of managed operation included",
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
      url: `https://paradigmjp.com${s.url}`,
      offers: {
        "@type": "Offer",
        priceCurrency: variant === "ja" ? "JPY" : "USD",
        price: s.price,
        description: s.priceDesc,
      },
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
