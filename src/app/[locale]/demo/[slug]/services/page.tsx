import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { cache } from "react"
import { fetchDemoMultiPageData } from "@/lib/sales/demo-generator"
import { DemoServicesPage } from "@/components/demo/DemoServicesPage"
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
    return { title: "Services | Demo", robots: { index: false, follow: false } }
  }
  return {
    title: `${data.pages.services.title} | ${data.companyName}`,
    description: data.pages.services.subtitle,
    robots: { index: false, follow: false },
  }
}

export default async function DemoServicesServerPage({ params }: Props) {
  const { slug } = await params
  const data = await getCachedData(slug)
  if (!data) notFound()

  const template = getTemplateById(data.templateId ?? "zenith")

  return <DemoServicesPage services={data.pages.services} companyName={data.companyName} locale={data.locale} template={template} />
}
