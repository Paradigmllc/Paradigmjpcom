import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { buildDemoMultiPageData } from "./demo-multi-page-builder"
import { buildPersonalizedDemoData } from "./demo-personalized-builder"
import { enhanceDemoWithDeepSeek } from "./demo-deepseek-enhancer"
import { mergeDeepSeekOutput } from "./demo-deepseek-merge"
import {
  buildDesignRecipe,
  buildProposalRightsManifest,
  evaluateDemoQuality,
  summarizeCandidate,
} from "./demo-quality-gate"
import { selectTemplateCandidates, type CompanyProfile } from "./demo-template-selector"
import type { DemoCandidateSummary, DemoGenerateOutput, DemoMultiPageData } from "./demo-site-types"
import type { ReportLocale } from "./types"
import { buildDemoUrl } from "./routing"
import { readValidatedDemoSourceManifest } from "./demo-source-policy"

export { fetchDemoMultiPageData, fetchDemoPageData } from "./demo-page-fetch"

interface GeneratedCandidate {
  page: DemoMultiPageData
  summary: DemoCandidateSummary
}

export interface DemoGenerationOptions {
  enhanceWithAI?: boolean
  publicationMode?: "public" | "private_review"
  sourcePolicy?: "legacy" | "reviewed_manifest"
  notify?: boolean
}

/**
 * Generate three complete candidates and publish only the highest-scoring one
 * that passes evidence, rights, completeness, and collision checks.
 */
export async function generateFullStackDemo(
  companyId: string,
  locale?: string,
  options: DemoGenerationOptions = {},
): Promise<DemoGenerateOutput> {
  const sb = getServiceSalesSupabase()
  if (!sb) return failure("Supabase service_role not configured")

  try {
    const { data: company, error: companyError } = await sb
      .from(DB_TABLES.SALES_COMPANIES)
      .select("id, company_name, domain, slug, industry, prefecture, report_locale, tech_stack, pain_diagnosis, dify_result, visual_evidence, demo_site, pagespeed_mobile, pagespeed_desktop, meta")
      .eq("id", companyId)
      .maybeSingle()

    if (companyError || !company) {
      return failure(`Company not found: ${companyError?.message ?? "no rows"}`)
    }

    if (options.sourcePolicy === "reviewed_manifest") {
      const sourceReview = readValidatedDemoSourceManifest(company.meta)
      if (!sourceReview.ok) return failure(`Source manifest rejected: ${sourceReview.errors.join(", ")}`)
    }

    const { fetchDiagnosticReport } = await import("./diagnostic")
    const { localeToRegion } = await import("./types")
    const effectiveLocale = (locale ?? company.report_locale ?? "ja") as ReportLocale
    const diagnostic = await fetchDiagnosticReport({
      slug: company.slug ?? "",
      region: localeToRegion(effectiveLocale),
      reportLocale: effectiveLocale,
    })
    if (!diagnostic) return failure("No diagnostic report found for this company")

    const profile: CompanyProfile = {
      industry: company.industry ?? "consulting",
      company_name: company.company_name,
      prefecture: company.prefecture,
      pagespeed_mobile: company.pagespeed_mobile,
      pagespeed_desktop: company.pagespeed_desktop,
      report_locale: effectiveLocale,
      tech_stack: company.tech_stack as Record<string, unknown> | null,
      meta: company.meta as Record<string, unknown> | null,
    }
    const templates = selectTemplateCandidates(profile, diagnostic, 3)
    const existingFingerprints = await fetchExistingFingerprints(sb, companyId)
    const companyMeta = company.meta as Record<string, unknown> | null
    const rights = buildProposalRightsManifest(companyMeta?.demo_media)
    const sharedEnhancement = (options.enhanceWithAI ?? true) && templates[0]
      ? await enhanceDemoWithDeepSeek(
          company as Parameters<typeof enhanceDemoWithDeepSeek>[0],
          diagnostic,
          templates[0],
          effectiveLocale,
        )
      : null
    const candidates: GeneratedCandidate[] = templates.map((template) => {
      let page = buildPersonalizedDemoData(
        company as unknown as Parameters<typeof buildDemoMultiPageData>[0],
        diagnostic,
        template,
      )
      if (sharedEnhancement) page = mergeDeepSeekOutput(page, sharedEnhancement, effectiveLocale)
      const recipe = buildDesignRecipe(template, page)
      const quality = evaluateDemoQuality(page, recipe, rights, existingFingerprints)
      page = { ...page, designRecipe: recipe, quality, rightsManifest: rights }
      return { page, summary: summarizeCandidate(page, recipe, quality) }
    })

    candidates.sort((left, right) => right.summary.score - left.summary.score)
    const selected = candidates[0]
    if (!selected) return failure("No demo candidates were generated")

    const qualityPassed = selected.summary.passed
    const published = qualityPassed && options.publicationMode !== "private_review"
    const publicationStatus = qualityPassed
      ? (published ? "published" : "private_review")
      : "quality_review"
    selected.page.publicationStatus = publicationStatus
    const slug = selected.page.slug
    const demoUrl = qualityPassed ? buildDemoUrl(effectiveLocale === "en" ? "en" : "ja", slug) : null

    const { data: slugOwner, error: slugOwnerError } = await sb
      .from(DB_TABLES.THEME_DEMO_PAGES)
      .select("company_id")
      .eq("slug", slug)
      .maybeSingle()
    if (slugOwnerError) return failure(`Clean URL ownership check failed: ${slugOwnerError.message}`)
    if (slugOwner?.company_id && slugOwner.company_id !== companyId) {
      return failure(`Clean URL conflict: /${slug} is already assigned to another company`)
    }

    const { error: upsertError } = await sb.from(DB_TABLES.THEME_DEMO_PAGES).upsert({
      slug,
      theme: selected.page.templateId,
      title: selected.page.meta.title,
      blocks: [],
      meta: {
        ...selected.page.meta,
        templateId: selected.page.templateId,
        industry: company.industry,
        prefecture: company.prefecture,
      },
      company_id: companyId,
      site_payload: selected.page,
      design_recipe: selected.page.designRecipe,
      design_fingerprint: selected.summary.designFingerprint,
      structural_fingerprint: selected.summary.structuralFingerprint,
      quality_score: selected.summary.score,
      quality_report: selected.page.quality,
      rights_manifest: rights,
      generation_candidates: candidates.map(({ summary }) => summary),
      quality_gate_version: selected.page.quality?.version,
      publication_status: publicationStatus,
      is_published: published,
      reviewed_at: published ? new Date().toISOString() : null,
    }, { onConflict: "slug" })

    if (upsertError) {
      console.error("[demo-generator] quality-gated upsert failed:", upsertError.message)
      return failure(upsertError.message)
    }

    const duplicateCleanup = await sb
      .from(DB_TABLES.THEME_DEMO_PAGES)
      .delete()
      .eq("company_id", companyId)
      .neq("slug", slug)
    if (duplicateCleanup.error) {
      console.error("[demo-generator] obsolete slug cleanup failed:", duplicateCleanup.error.message)
    }

    if (published && demoUrl) {
      await persistPublishedReferences(sb, companyId, company.company_name, selected.page, demoUrl)
    }
    if (options.notify !== false && options.publicationMode !== "private_review") {
      await notifyGenerationResult({
        companyId,
        companyName: company.company_name,
        slug,
        score: selected.summary.score,
        published,
        demoUrl,
        blockers: selected.summary.hardBlockers,
      })
    }

    return {
      ok: qualityPassed,
      demoUrl,
      slug,
      qualityScore: selected.summary.score,
      publicationStatus,
      candidates: candidates.map(({ summary }) => summary),
      error: qualityPassed ? undefined : `Quality gate failed: ${selected.summary.hardBlockers.join(", ")}`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[demo-generator] generateFullStackDemo failed:", message)
    return failure(message)
  }
}

async function fetchExistingFingerprints(
  sb: NonNullable<ReturnType<typeof getServiceSalesSupabase>>,
  companyId: string,
): Promise<Set<string>> {
  const { data, error } = await sb
    .from(DB_TABLES.THEME_DEMO_PAGES)
    .select("structural_fingerprint")
    .eq("is_published", true)
    .neq("company_id", companyId)
    .not("structural_fingerprint", "is", null)
    .limit(1000)
  if (error) {
    console.error("[demo-generator] fingerprint lookup failed:", error.message)
    return new Set()
  }
  return new Set((data ?? []).map((row) => row.structural_fingerprint).filter((value): value is string => Boolean(value)))
}

async function persistPublishedReferences(
  sb: NonNullable<ReturnType<typeof getServiceSalesSupabase>>,
  companyId: string,
  companyName: string,
  page: DemoMultiPageData,
  demoUrl: string,
): Promise<void> {
  const generatedAt = new Date().toISOString()
  const { error: metaError } = await sb.rpc("sales_atomic_meta_merge", {
    p_company_id: companyId,
    p_patch: { demo_site: { url: demoUrl, type: "quality_gated_fullstack", slug: page.slug, generated_at: generatedAt } },
  })
  if (metaError) console.error("[demo-generator] company meta merge failed:", metaError.message)

  const { error: compatibilityError } = await sb.from(DB_TABLES.WEB_DEMOS).upsert({
    company_id: companyId,
    slug: page.slug,
    name: `${companyName} Full-Stack Demo`,
    html_content: JSON.stringify(page),
    source: "quality_gated_fullstack",
    is_published: true,
    meta: { generator: "quality_gate", engine: page.meta.engine, demo_url: demoUrl, generated_at: generatedAt },
  }, { onConflict: "slug" })
  if (compatibilityError) console.error("[demo-generator] compatibility save failed:", compatibilityError.message)
}

function failure(error: string): DemoGenerateOutput {
  return { ok: false, demoUrl: null, slug: null, error }
}

async function notifyGenerationResult(input: {
  companyId: string
  companyName: string
  slug: string
  score: number
  published: boolean
  demoUrl: string | null
  blockers: string[]
}): Promise<void> {
  try {
    const { notifyBothChannels } = await import("@/lib/notify")
    const result = await notifyBothChannels("sales", {
      title: input.published ? "SMBデモ公開基準通過" : "SMBデモ品質レビュー待ち",
      message: `${input.companyName} / ${input.score}点 / ${input.blockers.join(", ") || "blockerなし"}`,
      link: input.demoUrl ?? `/api/sales/demo-site/quality/${input.slug}`,
      type: input.published ? "demo_quality_passed" : "demo_quality_blocked",
      leadId: input.companyId,
      idempotencyKey: `demo-quality:${input.slug}:${input.score}`,
    })
    if (!result.ok) console.error("[demo-generator] quality notification incomplete:", result)
  } catch (error) {
    console.error("[demo-generator] quality notification failed:", error)
  }
}
