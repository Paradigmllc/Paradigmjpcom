import { DB_TABLES } from "@/lib/sales/db-tables"
import type { Region } from "@/lib/sales/types"
import type { getServiceSalesSupabase } from "@/lib/supabase"
import { generateSalesAsset } from "./sales-assets"

type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

export async function triggerReadyDiagnosticAssets(sb: ServiceSupabase | null, region: Region): Promise<number> {
  if (!sb) return 0

  try {
    const { data: ready, error } = await sb
      .from(DB_TABLES.SALES_COMPANIES)
      .select("id, domain, report_locale")
      .eq("pipeline_status", "report_ready")
      .eq("region", region)
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) {
      console.error("[agent-team] asset batch scan failed:", error.message)
      return 0
    }

    let triggered = 0
    for (const company of ready ?? []) {
      try {
        await generateSalesAsset({
          companyIdOrSlugOrDomain: company.id,
          assetType: "diagnostic_report",
          reportLocale: typeof company.report_locale === "string" ? company.report_locale : null,
        })
        triggered++
      } catch (e) {
        console.error(
          "[agent-team] asset generation failed for",
          company.domain,
          e instanceof Error ? e.message : String(e),
        )
      }
    }
    return triggered
  } catch (e) {
    console.error("[agent-team] asset batch scan crashed:", e instanceof Error ? e.message : String(e))
    return 0
  }
}
