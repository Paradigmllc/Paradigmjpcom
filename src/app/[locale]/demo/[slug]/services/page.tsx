import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { fetchDemoMultiPageDataForRequest } from "@/lib/sales/demo-request-access"
import { DemoServicesPage } from "@/components/demo/DemoServicesPage"
import { DemoPremiumV2ServicesPage } from "@/components/demo/premium-v2/DemoPremiumV2ServicesPage"
import { getTemplateById } from "@/lib/sales/demo-templates/registry"

export const dynamic = "force-dynamic"
export const revalidate = 300

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = await fetchDemoMultiPageDataForRequest(slug)
  if (!data) {
    return { title: "Services | Demo", robots: { index: false, follow: false } }
  }
  return {
    title: { absolute: `${data.pages.services.title} | ${data.companyName}` },
    description: data.pages.services.subtitle,
    robots: { index: false, follow: false },
  }
}

export default async function DemoServicesServerPage({ params }: Props) {
  const { slug } = await params
  const data = await fetchDemoMultiPageDataForRequest(slug)
  if (!data) notFound()

  const template = getTemplateById(data.templateId ?? "zenith")

  if (data.premium?.style === "premium-v2") return <DemoPremiumV2ServicesPage data={data} />
  return <DemoServicesPage services={data.pages.services} companyName={data.companyName} locale={data.locale} template={template} media={data.premium?.gallery[1]} />
}
