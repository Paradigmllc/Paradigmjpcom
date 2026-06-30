import { redirect } from "next/navigation"
import { twentyBaseUrl } from "@/lib/sales/twenty-sync-utils"

export const dynamic = "force-dynamic"

export default function SalesPage() {
  redirect(twentyBaseUrl() ?? "https://twenty.paradigmjp.com")
}
