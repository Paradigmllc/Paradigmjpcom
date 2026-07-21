import type { Metadata, Viewport } from "next"
import { notFound } from "next/navigation"
import { headers } from "next/headers"
import { NextIntlClientProvider, hasLocale } from "next-intl"
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server"
import { ThemeProvider } from "@/components/aesop/ThemeProvider"
import ConditionalSiteChrome from "@/components/aesop/ConditionalSiteChrome"
import ConsentAwareTracking from "@/components/aesop/ConsentAwareTracking"
import { getOrganizationJsonLd, getServicesJsonLd } from "@/lib/jsonld"
import { buildWebSiteSchema } from "@/lib/seo/schemas"
import { getSiteSettings, umamiWebsiteIdFor } from "@/lib/settings"
import { getHeaderNav, getFooterNav } from "@/lib/navigation"
import { themeTokensToCss } from "@/lib/theme-tokens"
import MaintenanceScreen from "@/components/MaintenanceScreen"
import type { JapanMarketUrgencyCopy } from "@/components/japan-entry/JapanMarketUrgencyBar"
import { routing } from "@/i18n/routing"
import { pageAlternates } from "@/lib/page-metadata"
import { isMarketingLocale } from "@/lib/marketing-routing"
import {
  isRtlLocale,
  localeDirection,
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
// ja は国内向け一般サイト、他11ロケールは英語 Japan Entry 母版を使う
const LOCALE_TITLES: Record<Locale, { default: string; template: string; description: string; ogSiteName: string; ogLocale: string }> = {
  ja: {
    default: "Paradigm合同会社 | デジタルで事業を加速する",
    template: "%s | Paradigm合同会社",
    description: "Paradigm合同会社は、Web制作、MEO、SEO/GEO、AI導入を設計から公開後の運用まで支援します。",
    ogSiteName: "Paradigm合同会社",
    ogLocale: "ja_JP",
  },
  en: {
    default: "Japan Entry Package for Fast-Decision SMBs | Paradigm",
    template: "%s | Paradigm LLC",
    description: "$13,000 fixed Japan entry setup. The standard managed-operation fee is $2,000/month; the first 10 selected launch partners receive months 1–6 at $0/month, and month 7 onward is $2,000/month under the signed terms.",
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0813" },
  ],
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const localizedMeta = LOCALE_TITLES[locale as Locale] ?? LOCALE_TITLES.en
  const meta = locale === "ja"
    ? localizedMeta
    : locale === "en"
      ? LOCALE_TITLES.en
      : {
          ...LOCALE_TITLES.en,
          ogLocale: localizedMeta.ogLocale,
          ogSiteName: localizedMeta.ogSiteName,
        }

  return {
    title: { default: meta.default, template: meta.template },
    description: meta.description,
    metadataBase: new URL("https://paradigmjp.com"),
    alternates: pageAlternates(locale),
    openGraph: {
      type: "website",
      locale: meta.ogLocale,
      siteName: meta.ogSiteName,
      images: [
        {
          url: `/${locale}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: meta.default,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.default,
      description: meta.description,
      images: [`/${locale}/opengraph-image`],
    },
    robots: isMarketingLocale(locale)
      ? { index: true, follow: true }
      : { index: false, follow: false, noarchive: true },
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

  // PayloadCMS Settings / Header / Footer global を並列取得 (admin で編集可能)
  const [settings, headerNav, footerNav] = await Promise.all([
    getSiteSettings(locale),
    getHeaderNav(locale),
    getFooterNav(locale),
  ])
  const requestHost = (await headers()).get("host")?.split(":")[0]
  const forceStandalone = requestHost === "demo.paradigmjp.com"
  const umamiId = umamiWebsiteIdFor(settings, locale) ?? process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID ?? null
  // admin が編集した color/font/radius tokens を CSS 変数として注入 (空なら ""・globals.css default を使用)
  const themeOverrideCss = themeTokensToCss(settings.theme)
  const tracking = settings.tracking
  const urgencyTranslations = locale !== "ja"
    ? await getTranslations({ locale: "en", namespace: "marketUrgency" })
    : null
  const marketUrgency: JapanMarketUrgencyCopy | undefined = urgencyTranslations
    ? {
        eyebrow: urgencyTranslations("eyebrow"),
        title: urgencyTranslations("title"),
        highlight: urgencyTranslations("highlight"),
        body: urgencyTranslations("body"),
        ctaLabel: urgencyTranslations("ctaLabel"),
        ctaHref: urgencyTranslations("ctaHref"),
        proof: urgencyTranslations("proof"),
      }
    : undefined

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Noto Sans (body) + Noto Sans JP (CJK) + Outfit (display headings)
             Aurora redesign 2026-06-09: display font changed from Noto Sans 300 weight
             to Outfit — modern geometric sans for bold, distinctive headings.
             Body remains Noto Sans for readability across 12 locales. */}
        <link
          href="https://fonts.googleapis.com/css2?family=BIZ+UDPGothic:wght@400;700&family=Noto+Sans:wght@300;400;500;600;700&family=Noto+Sans+JP:wght@300;400;500;600;700&family=Noto+Serif+JP:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&family=Shippori+Mincho:wght@400;500;600;700&family=Zen+Kaku+Gothic+New:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {isRtl && (
          <link
            href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;700&display=swap"
            rel="stylesheet"
          />
        )}
        {/* Favicon — admin が Settings.seo.favicon を設定していればそれを優先、無ければ既定 SVG */}
        <link rel="icon" type="image/svg+xml" href={settings.seo.faviconUrl ?? "/favicon.svg"} />
        <link rel="apple-touch-icon" href={settings.seo.faviconUrl ?? "/favicon.svg"} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(getOrganizationJsonLd(locale)) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(getServicesJsonLd(locale)) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildWebSiteSchema(locale)) }}
        />
        {/* admin が PayloadCMS Settings.theme で編集した色/フォント/角丸を CSS 変数として注入。
            globals.css の default を override する。settings.theme が null なら何も出力しない。 */}
        {themeOverrideCss && (
          <style id="theme-overrides" dangerouslySetInnerHTML={{ __html: themeOverrideCss }} />
        )}
      </head>
      <body className="min-h-dvh bg-paradigm-paper text-paradigm-ink antialiased">
        <ConsentAwareTracking
          tracking={tracking}
          umamiHost={process.env.NEXT_PUBLIC_UMAMI_HOST}
          umamiWebsiteId={umamiId}
        />
        <ThemeProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            {settings.maintenance.maintenanceMode ? (
              <MaintenanceScreen locale={locale} message={settings.maintenance.maintenanceMessage} />
            ) : (
              // ConditionalSiteChrome (2026-05-10): /{locale}/report/* と /p/* 配下では
              // header/footer/chrome を一切描画せず LP 表示にする (B36 MVP 診断レポート LP 化).
              // 通常ページは site chrome 全部入り (従来挙動).
              // 2026-05-21: header/footer ナビ + 告知バーを CMS global から渡す。
              <ConditionalSiteChrome
                locale={locale}
                forceStandalone={forceStandalone}
                footerSettings={{
                  contactEmail: settings.contact.email,
                  social: settings.social,
                  company: {
                    legalName: settings.company.legalName,
                    representativeName: settings.company.representativeName,
                    registrationNumber: settings.company.registrationNumber,
                    address: settings.company.address ?? settings.contact.address,
                  },
                }}
                headerNav={headerNav}
                footerNav={footerNav}
                announcement={settings.announcement}
                marketUrgency={marketUrgency}
              >
                {children}
              </ConditionalSiteChrome>
            )}
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
