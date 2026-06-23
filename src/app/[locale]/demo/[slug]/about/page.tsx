import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { cache } from "react"
import { fetchDemoMultiPageData } from "@/lib/sales/demo-generator"
import { DemoAboutPage } from "@/components/demo/DemoAboutPage"

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
  const data = await getCachedData(slug)
  if (!data) notFound()

  return <DemoAboutPage about={data.pages.about} companyName={data.companyName} locale={data.locale} />
}
