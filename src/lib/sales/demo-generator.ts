import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"
import type { DiagnosticReportData } from "./diagnostic"
import { generateDemoWithDify } from "./dify-demo-generator"
import type { SalesCompany } from "./types"

export { buildDemoHtml } from "./demo-generator-html"
export { buildDemoPageData } from "./demo-page-builder"
export { buildDemoMultiPageData } from "./demo-multi-page-builder"
export { fetchDemoPageData, fetchDemoMultiPageData, generateFullStackDemo } from "./demo-page-service"

export async function generateReplacementDemo(
  company: SalesCompany,
  report: DiagnosticReportData,
): Promise<{ ok: boolean; demoUrl: string | null; error?: string }> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, demoUrl: null, error: "Supabase service_role not configured" }

  const rawSlug = (company.domain || company.slug || company.id)
    .replace(/^https?:\/\//, "")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 50)

  const locale = company.report_locale ?? report.report_locale
  const slug = `${rawSlug}-demo`

  // Try Dify AI-powered generation first, fall back to rules-based
  const themeJson = await generateDemoWithDify(company, report)
  console.warn(`[demo-generator] generated with ${themeJson.engine}: ${themeJson.blocks.length} blocks, theme=${themeJson.theme}`)

  // Save to theme_demo_pages (new Supabase table, Astro SSR reads from here)
  const { error: upsertError } = await sb
    .from(DB_TABLES.THEME_DEMO_PAGES)
    .upsert({
      slug,
      theme: themeJson.theme,
      title: themeJson.meta.title,
      blocks: themeJson.blocks,
      meta: themeJson.meta,
      company_id: company.id,
      is_published: true,
    }, { onConflict: "slug" })

  if (upsertError) {
    console.error("[demo-generator] theme_demo_pages upsert failed:", upsertError.message)
    return { ok: false, demoUrl: null, error: upsertError.message }
  }

  const baseUrl = process.env.ASTRO_DEMO_BASE_URL || "https://demo.paradigmjp.com"
  const demoUrl = `${baseUrl}/demo/${encodeURIComponent(slug)}?lang=${locale}`

  console.warn(`[demo-generator] saved to theme_demo_pages: ${slug} → ${demoUrl}`)

  // Write demo_site url back to sales_companies
  try {
    const { error } = await sb.rpc("sales_atomic_meta_merge", {
      p_company_id: company.id,
      p_patch: {
        demo_site: {
          url: demoUrl,
          type: "theme_astro_ssr",
          slug,
          theme: themeJson.theme,
          generated_at: new Date().toISOString(),
        },
      },
    })
    if (error) console.error("[demo-generator] atomic meta merge failed:", error.message)
  } catch (metaErr) {
    console.error("[demo-generator] meta update failed:", metaErr)
  }

  // Also save legacy web_demos entry for compatibility
  try {
    await sb.from(DB_TABLES.WEB_DEMOS).upsert({
      company_id: company.id,
      slug,
      name: `${company.company_name} Demo`,
      html_content: JSON.stringify(themeJson),
      source: "theme_demo_v2",
      is_published: true,
      meta: {
        generator: "theme_demo_v2",
        demo_url: demoUrl,
        theme: themeJson.theme,
        generated_at: new Date().toISOString(),
      },
    }, { onConflict: "slug" })
  } catch (e) {
    console.warn("[demo-generator] legacy web_demos save failed (non-critical):", e)
  }

  return { ok: true, demoUrl }
}
