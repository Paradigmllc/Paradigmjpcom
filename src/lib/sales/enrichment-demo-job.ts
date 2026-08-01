import type { JsonRecord, SalesEnrichmentJob, ServiceSupabase } from "./enrichment-jobs"
import type { SalesCompany } from "./types"
import { DB_TABLES } from "./db-tables"
import { generateFullStackDemo } from "./demo-page-service"
import { readValidatedDemoSourceManifest } from "./demo-source-policy"
import { activateTemporaryUnlistedDemo } from "./demo-private-access"
import { syncDemoCandidateToTwenty } from "./demo-twenty-sync"
import { demoSiteUrl } from "./routing"
import { logDiagnosisEvent } from "./enrichment-jobs-runner-phases"

type ReusedDemo = {
  slug: string
  qualityScore: number | null
  qualityReport: JsonRecord | null
}

function normalizedCompanyIdentity(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\u3000]/g, "")
    .replace(/[()（）「」『』。、・,.，\-ー_/]/g, "")
}

/**
 * A portal re-sync can create a fresh list-only company row while a previous
 * row already owns the clean URL. Reuse only when the owner is the same
 * normalized business name; never bridge two different businesses.
 */
async function reuseExistingSameBusinessDemo(
  sb: ServiceSupabase,
  company: SalesCompany,
  generationError: string,
  assets: NonNullable<ReturnType<typeof readValidatedDemoSourceManifest>["manifest"]>["assets"],
): Promise<ReusedDemo | null> {
  const match = generationError.match(/Clean URL conflict: \/(.+?) is already assigned to another company/)
  const slug = match?.[1]?.trim()
  if (!slug) return null

  const { data: page, error: pageError } = await sb
    .from(DB_TABLES.THEME_DEMO_PAGES)
    .select("slug, company_id, quality_score, quality_report")
    .eq("slug", slug)
    .maybeSingle()
  if (pageError) {
    console.error("[sales-enrichment] existing demo lookup failed:", pageError.message)
    return null
  }
  if (!page?.company_id || page.company_id === company.id) return null

  const { data: owner, error: ownerError } = await sb
    .from(DB_TABLES.SALES_COMPANIES)
    .select("company_name")
    .eq("id", page.company_id)
    .maybeSingle()
  if (ownerError) {
    console.error("[sales-enrichment] existing demo owner lookup failed:", ownerError.message)
    return null
  }
  if (!owner?.company_name || normalizedCompanyIdentity(owner.company_name) !== normalizedCompanyIdentity(company.company_name)) {
    console.error("[sales-enrichment] clean URL conflict kept fail-closed for different business:", {
      companyId: company.id,
      companyName: company.company_name,
      ownerName: owner?.company_name ?? null,
      slug,
    })
    return null
  }

  const access = await activateTemporaryUnlistedDemo({ slug, ttlDays: 7, assets })
  const qualityReport = page.quality_report && typeof page.quality_report === "object" && !Array.isArray(page.quality_report)
    ? page.quality_report as JsonRecord
    : null
  return {
    slug: access.urlSlug,
    qualityScore: typeof page.quality_score === "number" ? page.quality_score : null,
    qualityReport,
  }
}

export async function processDemoGenerationJob(
  sb: ServiceSupabase,
  job: SalesEnrichmentJob,
  company: SalesCompany,
): Promise<{ ok: boolean; error?: string }> {
  const generatedVisualMode = job.input_payload.source_policy === "list_candidate_generated_visual"
  const markGeneratedVisualFailure = async (message: string) => {
    if (!generatedVisualMode) return
    const meta = company.meta && typeof company.meta === "object" && !Array.isArray(company.meta)
      ? company.meta as Record<string, unknown>
      : {}
    const generation = meta.demo_generation && typeof meta.demo_generation === "object" && !Array.isArray(meta.demo_generation)
      ? meta.demo_generation as Record<string, unknown>
      : {}
    const { error } = await sb.from(DB_TABLES.SALES_COMPANIES).update({
      meta: { ...meta, demo_generation: { ...generation, mode: "generated_visual", status: "failed", failedAt: new Date().toISOString(), error: message } },
    }).eq("id", company.id)
    if (error) console.error("[sales-enrichment] generated visual failure state update failed:", error.message)
  }
  const sourceReview = readValidatedDemoSourceManifest(company.meta)
  if (!sourceReview.ok) {
    const error = `source manifest rejected: ${sourceReview.errors.join(", ")}`
    await markGeneratedVisualFailure(error)
    return { ok: false, error }
  }

  const locale = job.input_payload.locale === "en" ? "en" : "ja"
  const result = await generateFullStackDemo(company.id, locale, {
    publicationMode: "private_review",
    sourcePolicy: "reviewed_manifest",
    enhanceWithAI: true,
    notify: false,
  })
  const reused = !result.ok && generatedVisualMode
    ? await reuseExistingSameBusinessDemo(sb, company, result.error ?? "demo quality gate failed", sourceReview.manifest!.assets)
    : null
  if ((!result.ok || !result.slug) && !reused) {
    const error = result.error ?? "demo quality gate failed"
    await markGeneratedVisualFailure(error)
    return { ok: false, error }
  }

  const resultSlug = reused?.slug ?? result.slug!
  const resultQualityScore = reused?.qualityScore ?? result.qualityScore ?? null
  const resultQualityReport = reused?.qualityReport ?? result.qualityReport ?? null
  let canonicalUrl = reused ? `${demoSiteUrl()}/${encodeURIComponent(resultSlug)}` : result.demoUrl
  let previewExpiresAt: string | null = null
  let twentySync: JsonRecord | null = null
  if (generatedVisualMode) {
    try {
      const access = reused
        ? { urlSlug: resultSlug, expiresAt: previewExpiresAt ?? new Date(Date.now() + 7 * 86_400_000).toISOString() }
        : await activateTemporaryUnlistedDemo({ slug: resultSlug, ttlDays: 7, assets: sourceReview.manifest!.assets })
      previewExpiresAt = access.expiresAt
      canonicalUrl = `${demoSiteUrl()}/${encodeURIComponent(access.urlSlug)}`
      const sync = await syncDemoCandidateToTwenty({
        companyId: company.id,
        jobId: job.id,
        previewUrl: canonicalUrl,
        expiresAt: access.expiresAt,
        slug: resultSlug,
        qualityScore: resultQualityScore,
        sourcePolicy: "list_candidate_generated_visual",
      })
      twentySync = { ok: sync.ok, configured: sync.configured, company_id: sync.companyId ?? null, error: sync.error ?? null }
      if (!sync.ok) {
        const error = sync.error ?? "Twenty同期に失敗しました"
        await markGeneratedVisualFailure(error)
        return { ok: false, error }
      }
    } catch (error) {
      console.error("[sales-enrichment] generated visual activation/sync failed:", error)
      const message = error instanceof Error ? error.message : "generated visual activation failed"
      await markGeneratedVisualFailure(message)
      return { ok: false, error: message }
    }
  }

  const resultPayload: JsonRecord = {
    slug: resultSlug,
    canonical_url: canonicalUrl,
    preview_expires_at: previewExpiresAt,
    quality_score: resultQualityScore,
    quality_report: resultQualityReport,
    generation_candidates: result.candidates ?? [],
    publication_status: result.publicationStatus ?? "private_review",
    source_policy: typeof job.input_payload.source_policy === "string" ? job.input_payload.source_policy : "reviewed_manifest",
    sending_enabled: false,
    ...(twentySync ? { twenty_sync: twentySync } : {}),
  }
  const { error } = await sb.from(DB_TABLES.SALES_ENRICHMENT_JOBS).update({
    status: "completed",
    result_payload: resultPayload,
    completed_at: new Date().toISOString(),
    locked_at: null,
    lock_owner: null,
  }).eq("id", job.id)
  if (error) return { ok: false, error: error.message }

  if (generatedVisualMode) {
    const meta = company.meta && typeof company.meta === "object" && !Array.isArray(company.meta) ? company.meta as Record<string, unknown> : {}
    const previousGeneration = meta.demo_generation && typeof meta.demo_generation === "object" && !Array.isArray(meta.demo_generation) ? meta.demo_generation as Record<string, unknown> : {}
    const { error: metaError } = await sb.from(DB_TABLES.SALES_COMPANIES).update({
      meta: {
        ...meta,
        demo_generation: {
          ...previousGeneration,
          mode: "generated_visual",
          status: "ready",
          readyAt: new Date().toISOString(),
          qualityScore: resultQualityScore,
          previewUrl: canonicalUrl,
          expiresAt: previewExpiresAt,
          sendingEnabled: false,
        },
      },
    }).eq("id", company.id)
    if (metaError) console.error("[sales-enrichment] generated visual metadata update failed:", metaError.message)
  }

  await logDiagnosisEvent(sb, {
    companyId: company.id,
    jobId: job.id,
    eventType: "private_demo_ready",
    status: "success",
    title: "非公開デモの品質審査が完了しました",
    message: canonicalUrl ?? undefined,
    payload: resultPayload,
  })
  return { ok: true }
}
