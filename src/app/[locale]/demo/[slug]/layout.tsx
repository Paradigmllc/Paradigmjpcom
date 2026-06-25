import type { Metadata } from "next"
import { ArtifactInlineEditor } from "@/components/admin/ArtifactInlineEditor"
import { DemoMultiLayout } from "@/components/demo/DemoMultiLayout"
import { isCurrentRequestAdmin } from "@/lib/admin-page-auth"
import type { DemoMultiPageData } from "@/lib/sales/demo-site-types"
import { fetchDemoMultiPageData } from "@/lib/sales/demo-generator"
import { getTemplateById } from "@/lib/sales/demo-templates/registry"

export const dynamic = "force-dynamic"
export const revalidate = 300

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string; slug: string }>
}

export default async function DemoMultiLayoutWrapper({ children, params }: LayoutProps) {
  const { locale, slug } = await params
  const isJa = locale === "ja"
  const basePath = `/${locale}/demo/${slug}`

  let companyName = "Paradigm"
  let templateId: string | undefined
  let accentColor: string | undefined
  let demoData: DemoMultiPageData | null = null

  try {
    const data = await fetchDemoMultiPageData(slug)
    if (data) {
      demoData = data
      companyName = data.meta?.companyName || companyName
      templateId = data.templateId
      accentColor = data.meta?.accentColor || data.pages?.home?.hero?.accentColor
    }
  } catch (error) {
    console.warn("[demo-layout] failed to load demo data:", error instanceof Error ? error.message : String(error))
  }

  const navLabels = isJa
    ? { home: "ホーム", about: "会社概要", services: "サービス", contact: "お問い合わせ" }
    : { home: "Home", about: "About", services: "Services", contact: "Contact" }

  const navLinks = [
    { label: navLabels.home, href: basePath },
    { label: navLabels.about, href: `${basePath}/about` },
    { label: navLabels.services, href: `${basePath}/services` },
    { label: navLabels.contact, href: `${basePath}/contact` },
  ]
  const isAdmin = await isCurrentRequestAdmin()

  return (
    <>
      <DemoMultiLayout
        navLinks={navLinks}
        basePath={basePath}
        isJa={isJa}
        companyName={companyName}
        templateId={templateId}
        accentColor={accentColor}
      >
        {children}
      </DemoMultiLayout>
      {isAdmin && demoData && (
        <ArtifactInlineEditor
          kind="demo"
          slug={slug}
          locale={locale}
          title={demoData.companyName}
          salesOsHref={`/${locale}/admin/sales`}
          initialFields={{
            metaTitle: demoData.meta.title,
            metaDescription: demoData.meta.description,
            homeTitle: demoData.pages.home.hero.title,
            homeSubtitle: demoData.pages.home.hero.subtitle,
            homeCtaTitle: demoData.pages.home.cta.title,
            homeCtaSubtitle: demoData.pages.home.cta.subtitle,
            aboutTitle: demoData.pages.about.title,
            aboutSubtitle: demoData.pages.about.subtitle,
            aboutStory: demoData.pages.about.story,
            servicesTitle: demoData.pages.services.title,
            servicesSubtitle: demoData.pages.services.subtitle,
            contactTitle: demoData.pages.contact.title,
            contactSubtitle: demoData.pages.contact.subtitle,
            contactEmail: demoData.pages.contact.email,
            contactAddress: demoData.pages.contact.address,
          }}
        />
      )}
    </>
  )
}
