import type { Metadata, Viewport } from "next"
import { notFound } from "next/navigation"
import { NextIntlClientProvider, hasLocale } from "next-intl"
import { getMessages, setRequestLocale } from "next-intl/server"
import { ThemeProvider } from "@/components/aesop/ThemeProvider"
import ConditionalSiteChrome from "@/components/aesop/ConditionalSiteChrome"
import { getOrganizationJsonLd, getServicesJsonLd } from "@/lib/jsonld"
import { getSiteSettings, umamiWebsiteIdFor } from "@/lib/settings"
import { getHeaderNav, getFooterNav } from "@/lib/navigation"
import { themeTokensToCss } from "@/lib/theme-tokens"
import MaintenanceScreen from "@/components/MaintenanceScreen"
import { routing } from "@/i18n/routing"
import {
  isRtlLocale,
  localeDirection,
  LOCALE_HREFLANG,
  LOCALE_ORG_NAME,
  LOCALE_ORG_ALTERNATE_NAMES,
  localeContentVariant,
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

  // PayloadCMS Settings / Header / Footer global を並列取得 (admin で編集可能)
  const [settings, headerNav, footerNav] = await Promise.all([
    getSiteSettings(locale),
    getHeaderNav(locale),
    getFooterNav(locale),
  ])
  const umamiId = umamiWebsiteIdFor(settings, locale) ?? process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID ?? null
  // admin が編集した color/font/radius tokens を CSS 変数として注入 (空なら ""・globals.css default を使用)
  const themeOverrideCss = themeTokensToCss(settings.theme)
  const tracking = settings.tracking

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
          href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@300;400;500;600;700&family=Noto+Sans+JP:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&display=swap"
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
        {/* 解析タグ (CMS Settings.tracking)。空 ID なら出力しない (V ルール: 未設定=無効)。 */}
        {tracking.gtmId && (
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${tracking.gtmId}');`,
            }}
          />
        )}
        {tracking.ga4Id && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${tracking.ga4Id}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${tracking.ga4Id}');`,
              }}
            />
          </>
        )}
        {tracking.metaPixelId && (
          <script
            dangerouslySetInnerHTML={{
              __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${tracking.metaPixelId}');fbq('track','PageView');`,
            }}
          />
        )}
        {/* admin (管理者のみ編集可) のカスタム <head> スクリプト */}
        {tracking.headScripts && (
          <script dangerouslySetInnerHTML={{ __html: tracking.headScripts }} />
        )}
        {umamiId && (
          // H-2 (2026-05-01): "appexx.me 顧客表示禁止" 対応
          // NEXT_PUBLIC_UMAMI_HOST 未設定時は analytics 無効化 (cal.appexx.me 直接表示を回避)
          // Coolify env に NEXT_PUBLIC_UMAMI_HOST=https://analytics.paradigmjp.com 設定推奨
          // (CNAME alias で analytics.appexx.me に解決)
          process.env.NEXT_PUBLIC_UMAMI_HOST && (
            <script
              defer
              src={`${process.env.NEXT_PUBLIC_UMAMI_HOST}/script.js`}
              data-website-id={umamiId}
            />
          )
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(getOrganizationJsonLd(locale)) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(getServicesJsonLd(locale)) }}
        />
        {/* 2026-04-30 SEO/GEO 強化: LocalBusiness + WebSite (SearchAction 付) を全ページに注入 */}
        {/* 2026-05-12 12-locale 拡張: LOCALE_ORG_NAME / LOCALE_ORG_ALTERNATE_NAMES /
            localeContentVariant 経由で全 12 locale 対応の structured data を生成。
            seed text (description) は ja/en 2 variant 母版 (Plan B). */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ProfessionalService",
              "@id": "https://paradigmjp.com#organization",
              name: (LOCALE_ORG_NAME as Record<string, string>)[locale] ?? "Paradigm LLC",
              alternateName:
                (LOCALE_ORG_ALTERNATE_NAMES as Record<string, string[]>)[locale] ??
                LOCALE_ORG_ALTERNATE_NAMES.en,
              url: "https://paradigmjp.com",
              logo: "https://paradigmjp.com/logo.png",
              image: "https://paradigmjp.com/og-image.png",
              description:
                localeContentVariant(locale) === "ja"
                  ? "Web 制作・MEO 対策・SEO/GEO・AI 導入支援。Paradigm合同会社が提供する 4 つのデジタル支援サービス。"
                  : "Web development, MEO, SEO/GEO, and AI integration. Four productized services from Paradigm LLC.",
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
              name: (LOCALE_ORG_NAME as Record<string, string>)[locale] ?? "Paradigm LLC",
              inLanguage: ["ja", "en", "ko", "zh", "de", "fr", "es", "pt", "ru", "ar", "vi", "id"],
              publisher: {
                "@type": "Organization",
                "@id": "https://paradigmjp.com#organization",
                name: (LOCALE_ORG_NAME as Record<string, string>)[locale] ?? "Paradigm LLC",
              },
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: `https://paradigmjp.com/${locale}/blog?q={search_term_string}`,
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        {/* admin が PayloadCMS Settings.theme で編集した色/フォント/角丸を CSS 変数として注入。
            globals.css の default を override する。settings.theme が null なら何も出力しない。 */}
        {themeOverrideCss && (
          <style id="theme-overrides" dangerouslySetInnerHTML={{ __html: themeOverrideCss }} />
        )}
      </head>
      <body className="min-h-dvh bg-paradigm-paper text-paradigm-ink antialiased">
        {/* GTM noscript fallback (JS 無効環境用)。gtmId 未設定なら出力しない。 */}
        {tracking.gtmId && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${tracking.gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
              title="gtm"
            />
          </noscript>
        )}
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
                footerSettings={{
                  contactEmail: settings.contact.email,
                  social: settings.social,
                }}
                headerNav={headerNav}
                footerNav={footerNav}
                announcement={settings.announcement}
              >
                {children}
              </ConditionalSiteChrome>
            )}
          </NextIntlClientProvider>
        </ThemeProvider>
        {/* admin (管理者のみ編集可) のカスタム <body> 末尾スクリプト */}
        {tracking.bodyScripts && (
          <script dangerouslySetInnerHTML={{ __html: tracking.bodyScripts }} />
        )}
      </body>
    </html>
  )
}
