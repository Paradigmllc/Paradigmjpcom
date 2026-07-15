import { redirect } from "next/navigation"
import { ManualJapanEntryWorkConsole } from "@/components/work/ManualJapanEntryWorkConsole"
import { isCurrentRequestAdmin } from "@/lib/admin-page-auth"
import { listManualJapanEntryWork } from "@/lib/sales/manual-japan-entry-store"
import type { ManualJapanEntryWorkRow } from "@/lib/sales/manual-japan-entry-types"

export const dynamic = "force-dynamic"

export default async function ManualJapanEntryWorkPage() {
  if (!(await isCurrentRequestAdmin())) redirect("/admin/login")
  let items: ManualJapanEntryWorkRow[] = []
  try {
    items = await listManualJapanEntryWork(100)
  } catch (error) {
    console.error("[work-page] initial history failed:", error)
  }
  return <ManualJapanEntryWorkConsole initialItems={items} />
}
