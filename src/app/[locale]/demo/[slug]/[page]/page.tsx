import { notFound } from "next/navigation"
import { DemoContentPage } from "@/components/demo/DemoContentPage"
import { fetchDemoMultiPageData } from "@/lib/sales/demo-generator"
import type { DemoContentPage as DemoContentPageData } from "@/lib/sales/demo-site-types"

export const dynamic = "force-dynamic"
export const revalidate = 300

const CONTENT_PAGES = ["works", "news", "faq", "recruit", "privacy", "terms"] as const
type ContentPageKey = typeof CONTENT_PAGES[number]

function isContentPage(value: string): value is ContentPageKey {
  return CONTENT_PAGES.includes(value as ContentPageKey)
}

export default async function DemoExtendedPage({
  params,
}: {
  params: Promise<{ slug: string; page: string }>
}) {
  const { slug, page } = await params
  if (!isContentPage(page)) notFound()
  const data = await fetchDemoMultiPageData(slug)
  if (!data) notFound()
  const pageData = data.pages[page] as DemoContentPageData | undefined
  if (!pageData) notFound()
  return <DemoContentPage page={pageData} />
}
