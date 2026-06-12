import type { CompanyKarteSnapshot } from "@/lib/sales/company-karte"
import {
  type DirectusItem,
  type DirectusResponse,
  type ExternalStudioTargetResult,
  type JsonRecord,
  type ServiceSupabase,
  buildExternalStudioPayload,
  env,
  externalIdFrom,
  extractExternalUrl,
  logSync,
  stringFrom,
  trimTrailingSlash,
  updateCompanyExternalMeta,
} from "./external-studio-core"

export async function directusFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const baseUrl = env("DIRECTUS_BASE_URL")
  const token = env("DIRECTUS_TOKEN")
  if (!baseUrl || !token) return { ok: false, error: "DIRECTUS_BASE_URL or DIRECTUS_TOKEN is not configured" }

  const res = await fetch(`${trimTrailingSlash(baseUrl)}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  })
  const text = await res.text()
  if (!res.ok) return { ok: false, error: text || `Directus API HTTP ${res.status}` }
  if (!text) return { ok: true, data: {} as T }
  try {
    return { ok: true, data: JSON.parse(text) as T }
  } catch (error) {
    console.error("[external-studio-sync] invalid Directus JSON:", error)
    return { ok: false, error: "Directus returned invalid JSON" }
  }
}

export async function pushDirectus(sb: ServiceSupabase, karte: CompanyKarteSnapshot, pipelineRunId?: string | null): Promise<ExternalStudioTargetResult> {
  const collection = env("DIRECTUS_SALES_ASSETS_COLLECTION") ?? "sales_assets"
  const payload = buildExternalStudioPayload(karte)
  const params = new URLSearchParams({
    "filter[company_id][_eq]": karte.companyId,
    limit: "1",
  })

  const existing = await directusFetch<DirectusResponse<DirectusItem[]>>(`/items/${collection}?${params.toString()}`)
  if (!existing.ok) {
    await logSync(sb, {
      direction: "supabase->directus",
      entityId: karte.companyId,
      pipelineRunId,
      action: "external_studio_sync",
      status: existing.error.includes("not configured") ? "skipped" : "error",
      errorMessage: existing.error,
      payload: { collection },
    })
    return {
      target: "directus",
      direction: "supabase->directus",
      ok: false,
      configured: !existing.error.includes("not configured"),
      status: existing.error.includes("not configured") ? "skipped" : "error",
      message: existing.error,
      details: { collection },
    }
  }

  const item = Array.isArray(existing.data.data) ? existing.data.data[0] : null
  const itemId = externalIdFrom(item?.id)
  const method = itemId ? "PATCH" : "POST"
  const path = itemId ? `/items/${collection}/${encodeURIComponent(itemId)}` : `/items/${collection}`
  const saved = await directusFetch<DirectusResponse<DirectusItem>>(path, {
    method,
    body: JSON.stringify(payload),
  })

  if (!saved.ok) {
    await logSync(sb, {
      direction: "supabase->directus",
      entityId: karte.companyId,
      pipelineRunId,
      action: "external_studio_sync",
      status: "error",
      errorMessage: saved.error,
      payload: { collection, method },
    })
    return {
      target: "directus",
      direction: "supabase->directus",
      ok: false,
      configured: true,
      status: "error",
      message: saved.error,
      details: { collection, method },
    }
  }

  const savedItem = saved.data.data ?? {}
  const savedId = externalIdFrom(savedItem.id) ?? itemId
  const savedUrl = extractExternalUrl(savedItem)
  await updateCompanyExternalMeta(sb, karte.companyId, "directus", {
    id: savedId,
    collection,
    url: savedUrl,
    status: "synced",
  })
  await logSync(sb, {
    direction: "supabase->directus",
    entityId: karte.companyId,
    pipelineRunId,
    action: "external_studio_sync",
    status: "success",
    payload: { collection, directus_id: savedId, url: savedUrl },
  })

  return {
    target: "directus",
    direction: "supabase->directus",
    ok: true,
    configured: true,
    status: "success",
    message: "Directus asset record synced",
    externalId: savedId,
    externalUrl: savedUrl,
    details: { collection },
  }
}

export async function pullDirectus(sb: ServiceSupabase, karte: CompanyKarteSnapshot, pipelineRunId?: string | null): Promise<ExternalStudioTargetResult> {
  const collection = env("DIRECTUS_SALES_ASSETS_COLLECTION") ?? "sales_assets"
  const params = new URLSearchParams({
    "filter[company_id][_eq]": karte.companyId,
    limit: "1",
  })
  const result = await directusFetch<DirectusResponse<DirectusItem[]>>(`/items/${collection}?${params.toString()}`)
  if (!result.ok) {
    await logSync(sb, {
      direction: "directus->supabase",
      entityId: karte.companyId,
      pipelineRunId,
      action: "external_studio_pull",
      status: result.error.includes("not configured") ? "skipped" : "error",
      errorMessage: result.error,
      payload: { collection },
    })
    return {
      target: "directus",
      direction: "directus->supabase",
      ok: false,
      configured: !result.error.includes("not configured"),
      status: result.error.includes("not configured") ? "skipped" : "error",
      message: result.error,
      details: { collection },
    }
  }

  const item = Array.isArray(result.data.data) ? result.data.data[0] : null
  if (!item) {
    await logSync(sb, {
      direction: "directus->supabase",
      entityId: karte.companyId,
      pipelineRunId,
      action: "external_studio_pull",
      status: "skipped",
      payload: { collection, reason: "no directus item" },
    })
    return {
      target: "directus",
      direction: "directus->supabase",
      ok: true,
      configured: true,
      status: "skipped",
      message: "Directus record was not found yet",
      details: { collection },
    }
  }

  const pulledId = externalIdFrom(item.id)
  const pulledUrl = extractExternalUrl(item)
  await updateCompanyExternalMeta(sb, karte.companyId, "directus", {
    id: pulledId,
    collection,
    url: pulledUrl,
    status: "pulled",
    sales_material_url: stringFrom(item.sales_material_url),
  })
  await logSync(sb, {
    direction: "directus->supabase",
    entityId: karte.companyId,
    pipelineRunId,
    action: "external_studio_pull",
    status: "success",
    payload: { collection, directus_id: pulledId, url: pulledUrl },
  })

  return {
    target: "directus",
    direction: "directus->supabase",
    ok: true,
    configured: true,
    status: "success",
    message: "Directus changes pulled into Supabase meta",
    externalId: pulledId,
    externalUrl: pulledUrl,
    details: { collection },
  }
}
