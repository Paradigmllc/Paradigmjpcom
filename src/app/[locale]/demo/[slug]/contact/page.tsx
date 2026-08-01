import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { fetchDemoMultiPageDataForRequest } from "@/lib/sales/demo-request-access"
import { DemoContactPage } from "@/components/demo/DemoContactPage"
import { DemoPremiumV2ContactPage } from "@/components/demo/premium-v2/DemoPremiumV2ContactPage"
import { DemoPremiumV3ContactPage } from "@/components/demo/premium-v3/DemoPremiumV3ContactPage"
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
    return { title: "Contact | Demo", robots: { index: false, follow: false } }
  }
  return {
    title: { absolute: `${data.pages.contact.title} | ${data.companyName}` },
    description: data.pages.contact.subtitle,
    robots: { index: false, follow: false },
  }
}

export default async function DemoContactServerPage({ params }: Props) {
  const { slug } = await params
  const data = await fetchDemoMultiPageDataForRequest(slug)
  if (!data) notFound()

  const template = getTemplateById(data.templateId ?? "zenith")

  if (data.premium?.style === "premium-v3") return <DemoPremiumV3ContactPage data={data} />
  if (data.premium?.style === "premium-v2") return <DemoPremiumV2ContactPage data={data} />
  return <DemoContactPage contact={data.pages.contact} companyName={data.companyName} locale={data.locale} template={template} />
}
