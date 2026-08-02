import type { Metadata } from "next"
import { redirect } from "next/navigation"
import PetMovieGrowthConsole from "@/components/pet-life-movie/PetMovieGrowthConsole"
import { isCurrentRequestAdmin } from "@/lib/admin-page-auth"
import { getPetMarketingDashboard } from "@/lib/pet-life-movie/marketing/repository"
import type { PetMarketingDashboard } from "@/lib/pet-life-movie/marketing/types"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = {
  title: "Pet Life Movie Global Growth | Paradigm",
  robots: { index: false, follow: false, nocache: true },
}

export default async function PetMovieGrowthPage() {
  if (!(await isCurrentRequestAdmin())) {
    redirect("/admin/login?redirect=%2Fja%2Fadmin%2Fpet-life-movie-growth")
  }
  let dashboard: PetMarketingDashboard | null = null
  let initialError: string | undefined
  try {
    dashboard = await getPetMarketingDashboard()
  } catch (error) {
    console.error("[pet-growth-page] dashboard load failed", error)
    initialError = error instanceof Error ? error.message : "データを取得できませんでした"
  }
  return <PetMovieGrowthConsole dashboard={dashboard} initialError={initialError} />
}
