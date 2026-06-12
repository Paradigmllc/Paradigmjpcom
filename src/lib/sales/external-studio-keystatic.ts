import type { CompanyKarteSnapshot } from "@/lib/sales/company-karte"
import {
  type ExternalStudioTargetResult,
  type JsonRecord,
  type ServiceSupabase,
  buildExternalStudioPayload,
  env,
  externalIdFrom,
  extractExternalUrl,
  logSync,
  updateCompanyExternalMeta,
} from "./external-studio-core"

export async function callKeystaticWebhook(
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

export async function syncKeystatic(
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
