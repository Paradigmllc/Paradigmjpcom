import type { Metadata } from "next"
import { DemoMultiLayout } from "@/components/demo/DemoMultiLayout"
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

  try {
    const data = await fetchDemoMultiPageData(slug)
    if (data) {
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

  return (
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
  )
}
