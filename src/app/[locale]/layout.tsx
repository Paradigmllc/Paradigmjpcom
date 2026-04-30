import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { NextIntlClientProvider, hasLocale } from "next-intl"
import { getMessages, setRequestLocale } from "next-intl/server"
import SiteHeader from "@/components/aesop/SiteHeader"
import SiteFooter from "@/components/aesop/SiteFooter"
import DifyChatbot from "@/components/DifyChatbot"
import SiteWrapper from "@/components/SiteWrapper"
import { ThemeProvider } from "@/components/aesop/ThemeProvider"
import PageTransition from "@/components/aesop/PageTransition"
import LuxuryLoader from "@/components/aesop/LuxuryLoader"
import CookieConsent from "@/components/aesop/CookieConsent"
import ScrollProgress from "@/components/aesop/ScrollProgress"
import { ORGANIZATION_JSONLD, SERVICES_JSONLD } from "@/lib/jsonld"
import { routing } from "@/i18n/routing"
import {
  isRtlLocale,
  localeDirection,
  LOCALE_HREFLANG,
  type Locale,
} from "@/lib/locale-map"

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

// 12-locale 対応 metadata（P17 2026-04-27）
// ja=独自設計・他11ロケールは "Japan Entry Package" を母版とする
const LOCALE_TITLES: Record<Locale, { default: string; template: string; description: string; ogSiteName: string; ogLocale: string }> = {
  ja: {
    default: "Paradigm合同会社 | デジタルで事業を加速する",
    template: "%s | Paradigm合同会社",
    description: "Web制作・MEO対策・SEO/GEO・AI導入支援。デジタル技術で中小企業の成長を支援するParadigm合同会社の公式サイトです。",
    ogSiteName: "Paradigm合同会社",
    ogLocale: "ja_JP",
  },
  en: {
    default: "Paradigm LLC | Productized Services for Foreign SMBs Entering Japan",
    template: "%s | Paradigm LLC",
    description: "Translation-free onboarding, local compliance, and AI-powered automation for foreign SMBs entering Japan. Built by operators in Tokyo.",
    ogSiteName: "Paradigm LLC",
    ogLocale: "en_US",
  },
  ko: {
    default: "Paradigm | 일본 진출 SMB를 위한 프로덕타이즈드 서비스",
    template: "%s | Paradigm",
    description: "일본 진출을 검토하는 해외 중소기업을 위한 번역 불필요·현지 준수·AI 자동화 패키지. 도쿄의 오퍼레이터가 만들었습니다.",
    ogSiteName: "Paradigm",
    ogLocale: "ko_KR",
  },
  zh: {
    default: "Paradigm | 面向进军日本中小企业的产品化服务",
    template: "%s | Paradigm",
    description: "为进军日本市场的海外中小企业提供免翻译入驻、本地合规与AI自动化套餐。东京运营团队打造。",
    ogSiteName: "Paradigm",
    ogLocale: "zh_CN",
  },
  de: {
    default: "Paradigm | Produktisierte Services für KMU beim Markteintritt in Japan",
    template: "%s | Paradigm",
    description: "Übersetzungsfreies Onboarding, lokale Compliance und KI-gestützte Automatisierung für ausländische KMU beim Markteintritt in Japan. Gebaut von Operatoren in Tokio.",
    ogSiteName: "Paradigm",
    ogLocale: "de_DE",
  },
  fr: {
    default: "Paradigm | Services productisés pour PME entrant au Japon",
    template: "%s | Paradigm",
    description: "Onboarding sans traduction, conformité locale et automatisation par IA pour les PME étrangères entrant au Japon. Conçu par des opérateurs à Tokyo.",
    ogSiteName: "Paradigm",
    ogLocale: "fr_FR",
  },
  es: {
    default: "Paradigm | Servicios productizados para PYMES que ingresan a Japón",
    template: "%s | Paradigm",
    description: "Onboarding sin traducción, cumplimiento local y automatización con IA para PYMES extranjeras que ingresan a Japón. Construido por operadores en Tokio.",
    ogSiteName: "Paradigm",
    ogLocale: "es_ES",
  },
  pt: {
    default: "Paradigm | Serviços produtizados para PMEs entrando no Japão",
    template: "%s | Paradigm",
    description: "Onboarding sem tradução, compliance local e automação com IA para PMEs estrangeiras entrando no Japão. Construído por operadores em Tóquio.",
    ogSiteName: "Paradigm",
    ogLocale: "pt_BR",
  },
  ru: {
    default: "Paradigm | Продуктизированные сервисы для МСП при выходе на рынок Японии",
    template: "%s | Paradigm",
    description: "Безпереводная адаптация, локальный комплаенс и AI-автоматизация для иностранных МСП при выходе на японский рынок. Создано операторами в Токио.",
    ogSiteName: "Paradigm",
    ogLocale: "ru_RU",
  },
  ar: {
    default: "Paradigm | خدمات منتجة للشركات الصغيرة والمتوسطة الداخلة إلى اليابان",
    template: "%s | Paradigm",
    description: "تأهيل بدون ترجمة، امتثال محلي، وأتمتة مدعومة بالذكاء الاصطناعي للشركات الصغيرة والمتوسطة الأجنبية الداخلة إلى اليابان. صُنع بواسطة مشغلين في طوكيو.",
    ogSiteName: "Paradigm",
    ogLocale: "ar_SA",
  },
  vi: {
    default: "Paradigm | Dịch vụ sản phẩm hóa cho SMB tiến vào Nhật Bản",
    template: "%s | Paradigm",
    description: "Onboarding không cần dịch thuật, tuân thủ địa phương và tự động hóa bằng AI cho các SMB nước ngoài tiến vào thị trường Nhật Bản. Xây dựng bởi các operator tại Tokyo.",
    ogSiteName: "Paradigm",
    ogLocale: "vi_VN",
  },
  id: {
    default: "Paradigm | Layanan Terproduktisasi untuk UKM Memasuki Jepang",
    template: "%s | Paradigm",
    description: "Onboarding tanpa terjemahan, kepatuhan lokal, dan otomatisasi bertenaga AI untuk UKM asing yang memasuki Jepang. Dibuat oleh operator di Tokyo.",
    ogSiteName: "Paradigm",
    ogLocale: "id_ID",
  },
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const meta = LOCALE_TITLES[locale as Locale] ?? LOCALE_TITLES.en

  // hreflang を全 locale 分生成
  const languages: Record<string, string> = { "x-default": "https://paradigmjp.com/ja" }
  for (const l of routing.locales) {
    languages[LOCALE_HREFLANG[l]] = `https://paradigmjp.com/${l}`
  }

  return {
    title: { default: meta.default, template: meta.template },
    description: meta.description,
    metadataBase: new URL("https://paradigmjp.com"),
    alternates: {
      canonical: `https://paradigmjp.com/${locale}`,
      languages,
    },
    openGraph: {
      type: "website",
      locale: meta.ogLocale,
      siteName: meta.ogSiteName,
    },
    robots: { index: true, follow: true },
  }
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  setRequestLocale(locale)
  const messages = await getMessages()

  const typedLocale = locale as Locale
  const dir = localeDirection(typedLocale) // ar=rtl / 他=ltr
  const isRtl = isRtlLocale(typedLocale)

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* P18-A Aesop foundation fonts:
              - Cormorant Garamond  → editorial display headings
              - Inter               → body sans (modern tech feel)
              - JetBrains Mono      → eyebrow / mono accents
            Combined with Noto Sans JP (body) and Noto Serif JP (display) for
            Japanese coverage. Single weighted bundle = 1 round-trip. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+JP:wght@300;400;500;600;700;800&family=Noto+Serif+JP:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        {isRtl && (
          <link
            href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;700;800&display=swap"
            rel="stylesheet"
          />
        )}
        {process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
          <script
            defer
            src="https://analytics.appexx.me/script.js"
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
          />
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSONLD) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SERVICES_JSONLD) }}
        />
        {/* 2026-04-30 SEO/GEO 強化: LocalBusiness + WebSite (SearchAction 付) を全ページに注入 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ProfessionalService",
              "@id": "https://paradigmjp.com#organization",
              name: "Paradigm合同会社",
              alternateName: ["Paradigm LLC", "パラダイム"],
              url: "https://paradigmjp.com",
              logo: "https://paradigmjp.com/logo.png",
              image: "https://paradigmjp.com/og-image.png",
              description: "Web 制作・MEO 対策・SEO/GEO・AI 導入支援。Paradigm合同会社が提供する 4 つのデジタル支援サービス。",
              address: { "@type": "PostalAddress", addressCountry: "JP", addressRegion: "Tokyo" },
              sameAs: ["https://github.com/Paradigmllc"],
              priceRange: "¥¥¥",
              areaServed: ["JP", "US", "EU", "Worldwide"],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "@id": "https://paradigmjp.com#website",
              url: "https://paradigmjp.com",
              name: "Paradigm合同会社",
              inLanguage: ["ja", "en", "ko", "zh", "de", "fr", "es", "pt", "ru", "ar"],
              publisher: { "@type": "Organization", "@id": "https://paradigmjp.com#organization", name: "Paradigm合同会社" },
              potentialAction: {
                "@type": "SearchAction",
                target: { "@type": "EntryPoint", urlTemplate: "https://paradigmjp.com/ja/blog?q={search_term_string}" },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </head>
      <body className="min-h-screen bg-paradigm-paper text-paradigm-ink antialiased">
        <ThemeProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            {/* relative wrapper sits above body::before paper-grain (z-0) */}
            <div className="relative z-10">
              <ScrollProgress />
              <LuxuryLoader />
              <SiteHeader />
              <SiteWrapper>
                <PageTransition>{children}</PageTransition>
              </SiteWrapper>
              <SiteFooter />
              <CookieConsent />
            </div>
            {/* DifyChatbot は ja/en のみ最適化（残10ロケールは en にフォールバック） */}
            <DifyChatbot locale={(locale === "ja" ? "ja" : "en") as "ja" | "en"} />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
