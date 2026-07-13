import { redirect } from "next/navigation"
import { LeadFactoryConsole } from "@/components/admin/LeadFactoryConsole"
import { isCurrentRequestAdmin } from "@/lib/admin-page-auth"

export const dynamic = "force-dynamic"

export default async function LeadFactoryPage() {
  if (!(await isCurrentRequestAdmin())) redirect("/admin/login")
  return <LeadFactoryConsole />
}
