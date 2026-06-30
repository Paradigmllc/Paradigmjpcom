import { redirect } from "next/navigation"
import { twentyBaseUrl } from "@/lib/sales/twenty-sync-utils"

export const dynamic = "force-dynamic"

export default function SalesDashboardRedirect() {
  redirect(twentyBaseUrl() ?? "https://twenty.paradigmjp.com")
}
