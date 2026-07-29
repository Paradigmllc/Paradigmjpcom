import { redirect } from "next/navigation"
import { isCurrentRequestAdmin } from "@/lib/admin-page-auth"

export const dynamic = "force-dynamic"

export default async function VideoFactoryAdminPage() {
  if (!(await isCurrentRequestAdmin())) {
    redirect("/admin/login?redirect=%2Fadmin%2Fvideo-factory")
  }
  redirect("/console/")
}
