import { redirect } from "next/navigation"
import { isCurrentRequestAdmin } from "@/lib/admin-page-auth"
import { DemoAssetReviewConsole } from "@/components/admin/DemoAssetReviewConsole"
import { DemoBatchQueueConsole } from "@/components/admin/DemoBatchQueueConsole"
import { PortalCandidateConsole } from "@/components/admin/PortalCandidateConsole"
import { SiteReproductionConsole } from "@/components/admin/SiteReproductionConsole"

export const dynamic = "force-dynamic"

export default async function DemoAssetReviewPage() {
  if (!(await isCurrentRequestAdmin())) redirect("/admin/login")
  return <><DemoAssetReviewConsole /><PortalCandidateConsole /><DemoBatchQueueConsole /><SiteReproductionConsole /></>
}
