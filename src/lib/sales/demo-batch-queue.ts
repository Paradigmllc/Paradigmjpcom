import { createHash } from "node:crypto"
import { findCompanyById, upsertCompanyByDomain } from "./companies"
import { enqueueCompanyEnrichment } from "./enrichment-jobs"
import type { DemoSourceManifest } from "./demo-source-policy"
import { sourceManifestToCompanyMeta, validateDemoSourceManifest } from "./demo-source-policy"
import type { Industry } from "./types"

export interface ReviewedDemoQueueItem {
  companyId?: string
  companyName?: string
  industry: Industry
  prefecture?: string
  locale: "ja" | "en"
  manifest: DemoSourceManifest
  waveId?: string
}

export interface ReviewedDemoQueueResult {
  ok: boolean
  companyId?: string
  companyName?: string
  jobId?: string
  status?: string
  reused?: boolean
  error?: string
}

function syntheticDomain(companyName: string, manifest: DemoSourceManifest): string {
  const seed = `${companyName}:${manifest.sources.map((source) => source.url).sort().join("|")}`
  const hash = createHash("sha256").update(seed).digest("hex").slice(0, 16)
  return `demo-only-${hash}.invalid`
}

function generationKey(companyId: string, manifest: DemoSourceManifest): string {
  return createHash("sha256")
    .update(`${companyId}:${JSON.stringify(manifest)}`)
    .digest("hex")
}

export async function queueReviewedDemoItem(
  item: ReviewedDemoQueueItem,
  triggeredBy: string,
): Promise<ReviewedDemoQueueResult> {
  const review = validateDemoSourceManifest(item.manifest)
  if (!review.ok || !review.manifest) return { ok: false, error: review.errors.join(", ") }

  const existing = item.companyId ? await findCompanyById(item.companyId) : null
  if (item.companyId && !existing) return { ok: false, error: "company not found" }
  const companyName = existing?.company_name ?? item.companyName ?? ""
  if (!companyName.trim()) return { ok: false, error: "company name is required" }

  const saved = await upsertCompanyByDomain({
    domain: existing?.domain ?? syntheticDomain(companyName, review.manifest),
    company_name: companyName,
    region: item.locale === "ja" ? "jp" : "global",
    report_locale: item.locale,
    industry: existing?.source === "reviewed_demo_manifest" ? item.industry : (existing?.industry ?? item.industry),
    prefecture: existing?.prefecture ?? item.prefecture ?? null,
    pipeline_status: "manual_queue",
    source: "reviewed_demo_manifest",
    meta: sourceManifestToCompanyMeta(review.manifest),
  })
  if (!saved.ok || !saved.company) return { ok: false, error: saved.error ?? "company save failed" }

  const queued = await enqueueCompanyEnrichment({
    companyId: saved.company.id,
    jobType: "demo_generate",
    source: "reviewed_demo_manifest",
    triggeredBy,
    priority: 60,
    payload: {
      locale: item.locale,
      source_policy: "reviewed_manifest",
      generation_key: generationKey(saved.company.id, review.manifest),
      ...(item.waveId ? { wave_id: item.waveId } : {}),
      sending_enabled: false,
    },
  })
  return {
    ok: queued.ok,
    companyId: saved.company.id,
    companyName: saved.company.company_name,
    jobId: queued.job?.id,
    status: queued.job?.status,
    reused: queued.job?.status === "completed",
    error: queued.error,
  }
}
