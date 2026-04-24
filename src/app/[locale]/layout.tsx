import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { NextIntlClientProvider, hasLocale } from "next-intl"
import { getMessages, setRequestLocale } from "next-intl/server"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import DifyChatbot from "@/components/DifyChatbot"
import SiteWrapper from "@/components/SiteWrapper"
import { ORGANIZATION_JSONLD, SERVICES_JSONLD } from "@/lib/jsonld"
import { routing } from "@/i18n/routing"

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const isJa = locale === "ja"
  return {
    title: {
      default: isJa
        ? "Paradigm合同会社 | デジタルで事業を加速する"
        : "Paradigm LLC | Productized Services for Foreign SMBs Entering Japan",
      template: isJa ? "%s | Paradigm合同会社" : "%s | Paradigm LLC",
    },
    description: isJa
      ? "Web制作・MEO対策・SEO/GEO・AI導入支援。デジタル技術で中小企業の成長を支援するParadigm合同会社の公式サイトです。"
      : "Translation-free onboarding, local compliance, and AI-powered automation for foreign SMBs entering Japan. Built by operators in Tokyo.",
    metadataBase: new URL("https://paradigmjp.com"),
    alternates: {
      canonical: `https://paradigmjp.com/${locale}`,
      languages: {
        ja: "https://paradigmjp.com/ja",
        en: "https://paradigmjp.com/en",
        "x-default": "https://paradigmjp.com/ja",
      },
    },
    openGraph: {
      type: "website",
      locale: isJa ? "ja_JP" : "en_US",
      siteName: isJa ? "Paradigm合同会社" : "Paradigm LLC",
    },
    robots: { index: true, follow: true },
  }
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  setRequestLocale(locale)
  const messages = await getMessages()

  const dir = "ltr" // ja/en 両方とも ltr。ar を追加した時に locale==="ar" 判定に拡張
  const htmlLang = locale === "ja" ? "ja" : "en"

  return (
    <html lang={htmlLang} dir={dir}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
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
      </head>
      <body className="min-h-screen">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Header />
          <SiteWrapper>{children}</SiteWrapper>
          <Footer />
          <DifyChatbot locale={locale as "ja" | "en"} />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
