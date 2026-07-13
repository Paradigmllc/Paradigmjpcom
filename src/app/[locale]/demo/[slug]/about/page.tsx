import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { fetchDemoMultiPageDataForRequest } from "@/lib/sales/demo-request-access"
import { DemoAboutPage } from "@/components/demo/DemoAboutPage"
import { DemoPremiumV2AboutPage } from "@/components/demo/premium-v2/DemoPremiumV2AboutPage"
import { DemoPremiumV3AboutPage } from "@/components/demo/premium-v3/DemoPremiumV3AboutPage"
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
    return { title: "About | Demo", robots: { index: false, follow: false } }
  }
  return {
    title: { absolute: `${data.pages.about.title} | ${data.companyName}` },
    description: data.pages.about.subtitle,
    robots: { index: false, follow: false },
  }
}

export default async function DemoAboutServerPage({ params }: Props) {
  const { slug } = await params
  const data = await fetchDemoMultiPageDataForRequest(slug)
  if (!data) notFound()

  const template = getTemplateById(data.templateId ?? "zenith")

  if (data.premium?.style === "premium-v3") return <DemoPremiumV3AboutPage data={data} />
  if (data.premium?.style === "premium-v2") return <DemoPremiumV2AboutPage data={data} />
  return <DemoAboutPage about={data.pages.about} companyName={data.companyName} locale={data.locale} template={template} media={data.premium?.gallery[2]} />
}
