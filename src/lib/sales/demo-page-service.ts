import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { buildDemoMultiPageData } from "./demo-multi-page-builder"
import type { DemoGenerateOutput } from "./demo-site-types"
import type { ReportLocale } from "./types"
import { selectTemplate, type CompanyProfile } from "./demo-template-selector"
import { buildPersonalizedDemoData } from "./demo-personalized-builder"
import type { DiagnosticReportData } from "./diagnostic"
import { enhanceDemoWithDeepSeek } from "./demo-deepseek-enhancer"
import { mergeDeepSeekOutput } from "./demo-deepseek-merge"
export { fetchDemoMultiPageData, fetchDemoPageData } from "./demo-page-fetch"

/**
 * Generate a full-stack Next.js demo site for a given company.
 * Saves to theme_demo_pages and updates the company's demo_site meta.
 * Returns the new demo URL in the format: demo.paradigmjp.com/[slug]
 */
export async function generateFullStackDemo(
  companyId: string,
  locale?: string,
  options?: { enhanceWithAI?: boolean },
): Promise<DemoGenerateOutput> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, demoUrl: null, slug: null, error: "Supabase service_role not configured" }

  const enhanceWithAI = options?.enhanceWithAI ?? true;

  try {
    // Fetch company
    const { data: company, error: companyError } = await sb
      .from(DB_TABLES.SALES_COMPANIES)
      .select("id, company_name, domain, slug, industry, prefecture, report_locale, tech_stack, pain_diagnosis, dify_result, visual_evidence, demo_site, meta")
      .eq("id", companyId)
      .maybeSingle()

    if (companyError || !company) {
      return { ok: false, demoUrl: null, slug: null, error: `Company not found: ${companyError?.message ?? "no rows"}` }
    }

    // Fetch diagnostic report
    const { fetchDiagnosticReport } = await import("./diagnostic")
    const { localeToRegion } = await import("./types")

    const effectiveLocale = locale ?? (company.report_locale ?? "ja")
    const region = localeToRegion(effectiveLocale)
    const diagnostic = await fetchDiagnosticReport({
      slug: company.slug ?? "",
      region,
      reportLocale: effectiveLocale,
    })

    if (!diagnostic) {
      return { ok: false, demoUrl: null, slug: null, error: "No diagnostic report found for this company" }
    }

    // Build page data with template selection + personalization
    const companyProfile: CompanyProfile = {
      industry: (company.industry ?? "consulting") as string,
      company_name: company.company_name,
      report_locale: effectiveLocale,
      tech_stack: company.tech_stack as Record<string, unknown> | null,
      meta: company.meta as Record<string, unknown> | null,
    }
    const template = selectTemplate(companyProfile, diagnostic)
    const pageData = buildPersonalizedDemoData(
      company as Record<string, unknown> as Parameters<typeof buildDemoMultiPageData>[0],
      diagnostic,
      template,
    )

    const slug = pageData.slug
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.ASTRO_DEMO_BASE_URL || "https://demo.paradigmjp.com"
    const cleanBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
    const demoUrl = `${cleanBase}/${slug}`

    // Attempt AI enhancement via DeepSeek
    let enhancedPageData = pageData
    if (enhanceWithAI) {
      try {
        const aiOutput = await enhanceDemoWithDeepSeek(
          company as Record<string, unknown> as Parameters<typeof enhanceDemoWithDeepSeek>[0],
          diagnostic,
          template,
          effectiveLocale as ReportLocale,
        )
        if (aiOutput) {
          enhancedPageData = mergeDeepSeekOutput(pageData, aiOutput, effectiveLocale)
          console.warn(
            `[demo-generator] DeepSeek AI enhancement applied for ${slug}`,
          )
        }
      } catch (aiErr) {
        console.error(
          "[demo-generator] DeepSeek enhancement failed, using rules-based:",
          aiErr instanceof Error ? aiErr.message : String(aiErr),
        )
      }
    }

    // Save to theme_demo_pages — store full multi-page data
    const { error: upsertError } = await sb
      .from(DB_TABLES.THEME_DEMO_PAGES)
      .upsert({
        slug,
        theme: template.id,
        title: enhancedPageData.meta.title,
        blocks: enhancedPageData.pages as unknown as Record<string, unknown>[],
        meta: { ...enhancedPageData.meta, templateId: template.id } as unknown as Record<string, unknown>,
        company_id: companyId,
        is_published: true,
      }, { onConflict: "slug" })

    if (upsertError) {
      console.error("[demo-generator] generateFullStackDemo upsert failed:", upsertError.message)
      return { ok: false, demoUrl: null, slug: null, error: upsertError.message }
    }

    console.warn(`[demo-generator] full-stack demo saved: ${slug} → ${demoUrl} (engine=${enhancedPageData.meta.engine})`)

    // Update company demo_site meta
    try {
      const { error: metaError } = await sb.rpc("sales_atomic_meta_merge", {
        p_company_id: companyId,
        p_patch: {
          demo_site: {
            url: demoUrl,
            type: "nextjs_fullstack",
            slug,
            generated_at: new Date().toISOString(),
          },
        },
      })
      if (metaError) console.error("[demo-generator] generateFullStackDemo meta merge failed:", metaError.message)
    } catch (metaErr) {
      console.error("[demo-generator] generateFullStackDemo meta update failed:", metaErr)
    }

    // Also save to web_demos for compatibility
    try {
      await sb.from(DB_TABLES.WEB_DEMOS).upsert({
        company_id: companyId,
        slug,
        name: `${company.company_name} Full-Stack Demo`,
        html_content: JSON.stringify(enhancedPageData),
        source: "nextjs_fullstack",
        is_published: true,
        meta: {
          generator: "nextjs_fullstack",
          engine: enhancedPageData.meta.engine,
          demo_url: demoUrl,
          generated_at: new Date().toISOString(),
        },
      }, { onConflict: "slug" })
    } catch (e) {
      console.warn("[demo-generator] generateFullStackDemo web_demos save failed (non-critical):", e)
    }

    return { ok: true, demoUrl, slug }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[demo-generator] generateFullStackDemo failed:", message)
    return { ok: false, demoUrl: null, slug: null, error: message }
  }
}
