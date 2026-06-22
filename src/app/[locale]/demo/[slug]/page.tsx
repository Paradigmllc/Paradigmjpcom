import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { cache } from "react"
import { fetchDemoPageData } from "@/lib/sales/demo-generator"
import { DemoPageClient } from "@/components/demo/DemoPageClient"

export const dynamic = "force-dynamic"
export const revalidate = 300

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

const getCachedDemo = cache(
  async (slug: string) => fetchDemoPageData(slug),
)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = await getCachedDemo(slug)
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

export default async function DemoPage({ params }: Props) {
  const { slug } = await params
  const data = await getCachedDemo(slug)
  if (!data) notFound()

  return <DemoPageClient data={data} />
}
