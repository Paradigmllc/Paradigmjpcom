import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { VideoGrowthDashboard } from "@/components/video-growth/VideoGrowthDashboard"
import { isCurrentRequestAdmin } from "@/lib/admin-page-auth"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = {
  title: "動画直販キャンペーンOS | Paradigm",
  robots: { index: false, follow: false, nocache: true },
}

type Props = { params: Promise<{ locale: string }> }

export default async function VideoGrowthPage({ params }: Props) {
  const { locale } = await params
  if (!(await isCurrentRequestAdmin())) {
    const safeLocale = /^[a-z]{2}(?:-[A-Z]{2})?$/.test(locale) ? locale : "ja"
    redirect(`/admin/login?redirect=%2F${safeLocale}%2Fadmin%2Fvideo-growth`)
  }
  return <VideoGrowthDashboard />
}
