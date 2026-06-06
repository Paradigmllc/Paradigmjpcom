import { getServiceSalesSupabase } from "@/lib/supabase"
import { fetchCompanyKarte, type CompanyKarteSnapshot } from "@/lib/sales/company-karte"
import { pullTwentyCompaniesToSupabase } from "@/lib/sales/twenty-pull"
import { syncCompanyKarteToTwenty } from "@/lib/sales/twenty-sync"

type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>
type JsonRecord = Record<string, unknown>

export type ExternalStudioTarget = "twenty" | "directus" | "keystatic"

export interface ExternalStudioTargetResult {
  target: ExternalStudioTarget
  direction: string
  ok: boolean
  configured: boolean
  status: "success" | "error" | "skipped"
  message: string
  externalId?: string | null
  externalUrl?: string | null
  details?: JsonRecord
}

export interface ExternalStudioSyncResult {
  ok: boolean
  companyId: string
  companyName: string
  domain: string
  results: ExternalStudioTargetResult[]
}

interface DirectusItem {
  id?: string | number | null
  url?: string | null
  report_url?: string | null
  demo_url?: string | null
  sales_material_url?: string | null
  payload?: unknown
}

interface DirectusResponse<T> {
  data?: T
}

function env(name: string): string | null {
  const value = process.env[name]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "")
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null
}

function stringFrom(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function externalIdFrom(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return null
}

function extractExternalUrl(value: unknown): string | null {
  const record = asRecord(value)
  if (!record) return null
  return (
    stringFrom(record.url) ??
    stringFrom(record.report_url) ??
    stringFrom(record.demo_url) ??
    stringFrom(record.sales_material_url) ??
    stringFrom(record.asset_url) ??
    stringFrom(record.public_url) ??
    null
  )
}

export function buildExternalStudioPayload(karte: CompanyKarteSnapshot): JsonRecord {
  return {
    source: "revenue_os",
    company_id: karte.companyId,
    company_name: karte.companyName,
    domain: karte.domain,
    industry: karte.industry,
    region: karte.region,
    report_locale: karte.reportLocale,
    target_country: karte.targetCountry,
    template_variant: karte.templateVariant,
    title: `${karte.companyName} 営業診断パッケージ`,
    status: "ready",
    report_url: karte.reportUrl,
    form_url: karte.formUrl,
    demo_url: karte.demoUrl,
    sales_material_url: karte.salesMaterialUrl,
    customer_portal_url: karte.customerPortalUrl,
    source_score: karte.sourceScore,
    source_coverage: {
      collected: karte.collectedCount,
      configured: karte.configuredCount,
      missing: karte.missingCount,
    },
    recommended_products: karte.recommendedProducts.map((product) => ({
      code: product.code,
      display_name: product.displayName,
      fit_score: product.fitScore,
      default_amount_yen: product.defaultAmountYen,
      is_subscription: product.isSubscription,
      twenty_opportunity_id: product.twentyOpportunityId,
    })),
    diagnosis_summary: karte.diagnosisSummary,
    recommended_offer: karte.recommendedOffer,
    localized_report_urls: karte.localizedReportUrls,
    evidence: karte.evidence,
    generated_at: karte.generatedAt,
    payload_version: 1,
  }
}

async function logSync(sb: ServiceSupabase, row: {
  direction: string
  entityId: string
  pipelineRunId?: string | null
  action: string
  status: "success" | "error" | "skipped"
  errorMessage?: string | null
  payload?: JsonRecord
}) {
  const { error } = await sb.from("sales_sync_logs").insert({
    direction: row.direction,
    entity_type: "company",
    entity_id: row.entityId,
    pipeline_run_id: row.pipelineRunId ?? null,
    action: row.action,
    status: row.status,
    error_message: row.errorMessage ?? null,
    payload: row.payload ?? null,
  })
  if (error) console.error("[external-studio-sync] sync log insert failed:", error.message)
}

async function updateCompanyExternalMeta(
  sb: ServiceSupabase,
  companyId: string,
  target: ExternalStudioTarget,
  patch: JsonRecord,
) {
  const { data, error } = await sb.from("sales_companies").select("meta").eq("id", companyId).maybeSingle()
  if (error) throw new Error(error.message)

  const currentMeta = asRecord(data?.meta) ?? {}
  const currentStudios = asRecord(currentMeta.external_studios) ?? {}
  const nextMeta: JsonRecord = {
    ...currentMeta,
    external_studios: {
      ...currentStudios,
      [target]: {
        ...(asRecord(currentStudios[target]) ?? {}),
        ...patch,
        last_synced_at: new Date().toISOString(),
      },
    },
  }

  const nextDemo = asRecord(patch.demo_site)
  if (nextDemo) nextMeta.demo_site = { ...(asRecord(currentMeta.demo_site) ?? {}), ...nextDemo }
  const salesMaterialUrl = stringFrom(patch.sales_material_url)
  if (salesMaterialUrl) nextMeta.sales_material_url = salesMaterialUrl

  const { error: updateError } = await sb.from("sales_companies").update({ meta: nextMeta }).eq("id", companyId)
  if (updateError) throw new Error(updateError.message)
}

async function directusFetch<T>(
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

async function pushDirectus(sb: ServiceSupabase, karte: CompanyKarteSnapshot, pipelineRunId?: string | null): Promise<ExternalStudioTargetResult> {
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

async function pullDirectus(sb: ServiceSupabase, karte: CompanyKarteSnapshot, pipelineRunId?: string | null): Promise<ExternalStudioTargetResult> {
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

async function callKeystaticWebhook(
  karte: CompanyKarteSnapshot,
  mode: "push" | "pull",
): Promise<{ ok: true; data: JsonRecord } | { ok: false; configured: boolean; error: string }> {
  const endpoint = env("KEYSTATIC_SYNC_WEBHOOK_URL") ?? env("ASTRO_DEMO_WORKER_URL")
  if (!endpoint) {
    return {
      ok: false,
      configured: false,
      error: "KEYSTATIC_SYNC_WEBHOOK_URL or ASTRO_DEMO_WORKER_URL is not configured",
    }
  }

  const token = env("KEYSTATIC_SYNC_WEBHOOK_SECRET") ?? env("ASTRO_DEMO_WORKER_TOKEN")
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      mode,
      action: "sync_sales_demo_site",
      payload: buildExternalStudioPayload(karte),
    }),
  })
  const text = await res.text()
  if (!res.ok) return { ok: false, configured: true, error: text || `Keystatic sync HTTP ${res.status}` }
  if (!text) return { ok: true, data: {} }
  try {
    return { ok: true, data: JSON.parse(text) as JsonRecord }
  } catch (error) {
    console.error("[external-studio-sync] invalid Keystatic sync JSON:", error)
    return { ok: false, configured: true, error: "Keystatic sync returned invalid JSON" }
  }
}

async function syncKeystatic(
  sb: ServiceSupabase,
  karte: CompanyKarteSnapshot,
  mode: "push" | "pull",
  pipelineRunId?: string | null,
): Promise<ExternalStudioTargetResult> {
  const result = await callKeystaticWebhook(karte, mode)
  const direction = mode === "push" ? "supabase->keystatic" : "keystatic->supabase"
  const action = mode === "push" ? "external_studio_sync" : "external_studio_pull"
  if (!result.ok) {
    await logSync(sb, {
      direction,
      entityId: karte.companyId,
      pipelineRunId,
      action,
      status: result.configured ? "error" : "skipped",
      errorMessage: result.error,
    })
    return {
      target: "keystatic",
      direction,
      ok: false,
      configured: result.configured,
      status: result.configured ? "error" : "skipped",
      message: result.error,
    }
  }

  const externalUrl = extractExternalUrl(result.data)
  const syncedId = externalIdFrom(result.data.id) ?? externalIdFrom(result.data.slug) ?? karte.domain
  await updateCompanyExternalMeta(sb, karte.companyId, "keystatic", {
    id: syncedId,
    url: externalUrl,
    status: mode === "push" ? "synced" : "pulled",
    demo_site: externalUrl ? { url: externalUrl } : undefined,
  })
  await logSync(sb, {
    direction,
    entityId: karte.companyId,
    pipelineRunId,
    action,
    status: "success",
    payload: { id: syncedId, url: externalUrl, response: result.data },
  })

  return {
    target: "keystatic",
    direction,
    ok: true,
    configured: true,
    status: "success",
    message: mode === "push" ? "Keystatic demo-site payload synced" : "Keystatic demo-site changes pulled",
    externalId: syncedId,
    externalUrl,
    details: result.data,
  }
}

function normalizeTargets(targets: ExternalStudioTarget[] | undefined): ExternalStudioTarget[] {
  if (!targets || targets.length === 0) return ["twenty", "directus", "keystatic"]
  const unique = new Set<ExternalStudioTarget>()
  for (const target of targets) unique.add(target)
  return [...unique]
}

export async function syncCompanyAcrossSalesTools(
  companyId: string,
  targets?: ExternalStudioTarget[],
  options: { pipelineRunId?: string | null } = {},
): Promise<ExternalStudioSyncResult> {
  const sb = getServiceSalesSupabase()
  if (!sb) throw new Error("Supabase service_role is not configured")

  const karteResult = await fetchCompanyKarte(sb, companyId)
  if (!karteResult.ok) throw new Error(karteResult.error)
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
