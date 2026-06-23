import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { cache } from "react"
import { fetchDemoMultiPageData } from "@/lib/sales/demo-generator"
import { DemoContactPage } from "@/components/demo/DemoContactPage"

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
    return { title: "Contact | Demo", robots: { index: false, follow: false } }
  }
  return {
    title: `${data.pages.contact.title} | ${data.companyName}`,
    description: data.pages.contact.subtitle,
    robots: { index: false, follow: false },
  }
}

export default async function DemoContactServerPage({ params }: Props) {
  const { slug } = await params
  const data = await getCachedData(slug)
  if (!data) notFound()

  return <DemoContactPage contact={data.pages.contact} companyName={data.companyName} locale={data.locale} />
}
