import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { cache } from "react"
import { fetchDemoMultiPageData } from "@/lib/sales/demo-generator"
import { DemoHomePage } from "@/components/demo/DemoHomePage"
import { DemoPremiumHomePage } from "@/components/demo/DemoPremiumHomePage"
import { DemoPremiumCraftHomePage } from "@/components/demo/DemoPremiumCraftHomePage"
import { getTemplateById } from "@/lib/sales/demo-templates/registry"

export const dynamic = "force-dynamic"
export const revalidate = 300

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

const getCachedData = cache(
  async (slug: string) => fetchDemoMultiPageData(slug),
)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = await getCachedData(slug)
  if (!data) {
    return { title: "Demo Not Found", robots: { index: false, follow: false } }
  }
  const meta = data.meta
  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      title: meta.title,
      description: meta.description,
      images: meta.ogImage ? [{ url: meta.ogImage }] : [],
      type: "website",
    },
    robots: { index: false, follow: false },
  }
}

export default async function DemoHomeServerPage({ params }: Props) {
  const { slug } = await params
  const data = await getCachedData(slug)
  if (!data) notFound()

  // Resolve template from templateId
  const template = getTemplateById(data.templateId ?? "zenith")

  if (data.premium?.style === "craft") return <DemoPremiumCraftHomePage data={data} />
  if (data.premium) return <DemoPremiumHomePage data={data} />
  return <DemoHomePage data={data} template={template} />
}
