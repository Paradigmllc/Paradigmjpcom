import type { Metadata } from "next"
import { DemoMultiLayout } from "@/components/demo/DemoMultiLayout"

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
  const basePath = `/${locale}/demo/${slug}`

  const navLinks = [
    { label: "Home", href: basePath },
    { label: "About", href: `${basePath}/about` },
    { label: "Services", href: `${basePath}/services` },
    { label: "Contact", href: `${basePath}/contact` },
  ]

  return (
    <DemoMultiLayout navLinks={navLinks} basePath={basePath}>
      {children}
    </DemoMultiLayout>
  )
}
