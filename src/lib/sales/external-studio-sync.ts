import { getServiceSalesSupabase } from "@/lib/supabase"
import { fetchCompanyKarte } from "@/lib/sales/company-karte"
import { pullTwentyCompaniesToSupabase } from "@/lib/sales/twenty-pull"
import { syncCompanyKarteToTwenty } from "@/lib/sales/twenty-sync"
import {
  type ExternalStudioSyncResult,
  type ExternalStudioTarget,
  type ExternalStudioTargetResult,
  buildExternalStudioPayload,
  normalizeTargets,
} from "./external-studio-core"
import { pushDirectus, pullDirectus } from "./external-studio-directus"
import { syncKeystatic } from "./external-studio-keystatic"

export type {
  ExternalStudioTarget,
  ExternalStudioTargetResult,
  ExternalStudioSyncResult,
}
export { buildExternalStudioPayload }

export async function syncCompanyAcrossSalesTools(
  companyId: string,
  targets?: ExternalStudioTarget[],
  options: { pipelineRunId?: string | null } = {},
): Promise<ExternalStudioSyncResult> {
  const sb = getServiceSalesSupabase()
  if (!sb) {
    console.error("[external-studio-sync] Supabase service_role is not configured")
    return {
      ok: false,
      companyId,
      companyName: "",
      domain: "",
      results: [{ target: "twenty", direction: "supabase->twenty", ok: false, configured: false, status: "error", message: "Supabase service_role is not configured" }],
    }
  }

  const karteResult = await fetchCompanyKarte(sb, companyId)
  if (!karteResult.ok) {
    console.error("[external-studio-sync] fetchCompanyKarte failed:", karteResult.error)
    return {
      ok: false,
      companyId,
      companyName: "",
      domain: "",
      results: [{ target: "twenty", direction: "supabase->twenty", ok: false, configured: false, status: "error", message: karteResult.error ?? "karte fetch failed" }],
    }
  }
  const karte = karteResult.karte
  const requestedTargets = normalizeTargets(targets)
  const results: ExternalStudioTargetResult[] = []

  if (requestedTargets.includes("twenty")) {
    const pushed = await syncCompanyKarteToTwenty(companyId, { pipelineRunId: options.pipelineRunId })
    results.push({
      target: "twenty",
      direction: "supabase->twenty",
      ok: pushed.ok,
      configured: pushed.configured,
      status: pushed.ok ? "success" : pushed.configured ? "error" : "skipped",
      message: pushed.ok ? "Twenty company fields and opportunities synced" : pushed.error ?? "Twenty sync failed",
      externalId: pushed.companyId ?? null,
      details: {
        home_synced: pushed.homeSynced ?? false,
        opportunity_ids: pushed.opportunityIds ?? [],
        recommendation_count: pushed.recommendationCount ?? 0,
      },
    })

    const pulled = await pullTwentyCompaniesToSupabase(200, { pipelineRunId: options.pipelineRunId })
    results.push({
      target: "twenty",
      direction: "twenty->supabase",
      ok: pulled.ok,
      configured: pulled.configured,
      status: pulled.ok ? "success" : pulled.configured ? "error" : "skipped",
      message: pulled.ok
        ? `Twenty pull scanned ${pulled.scanned}, updated ${pulled.updated}, skipped ${pulled.skipped}`
        : pulled.error ?? "Twenty pull failed",
      details: { scanned: pulled.scanned, updated: pulled.updated, skipped: pulled.skipped },
    })
  }

  if (requestedTargets.includes("directus")) {
    results.push(await pushDirectus(sb, karte, options.pipelineRunId))
    results.push(await pullDirectus(sb, karte, options.pipelineRunId))
  }

  if (requestedTargets.includes("keystatic")) {
    results.push(await syncKeystatic(sb, karte, "push", options.pipelineRunId))
    results.push(await syncKeystatic(sb, karte, "pull", options.pipelineRunId))
  }

  return {
    ok: results.every((result) => result.ok),
    companyId: karte.companyId,
    companyName: karte.companyName,
    domain: karte.domain,
    results,
  }
}
