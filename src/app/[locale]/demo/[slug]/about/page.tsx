import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { fetchDemoMultiPageDataForRequest } from "@/lib/sales/demo-request-access"
import { DemoAboutPage } from "@/components/demo/DemoAboutPage"
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
    title: `${data.pages.about.title} | ${data.companyName}`,
    description: data.pages.about.subtitle,
    robots: { index: false, follow: false },
  }
}

export default async function DemoAboutServerPage({ params }: Props) {
  const { slug } = await params
  const data = await fetchDemoMultiPageDataForRequest(slug)
  if (!data) notFound()

  const template = getTemplateById(data.templateId ?? "zenith")

  return <DemoAboutPage about={data.pages.about} companyName={data.companyName} locale={data.locale} template={template} media={data.premium?.gallery[2]} />
}
