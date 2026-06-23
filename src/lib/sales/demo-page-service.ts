import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { buildDemoPageData } from "./demo-page-builder"
import { buildDemoMultiPageData } from "./demo-multi-page-builder"
import type { DemoBlock, DemoGenerateOutput, DemoMultiPageData, DemoPageData } from "./demo-site-types"
import type { Industry, ReportLocale } from "./types"

/**
 * Fetch demo page data by slug from the theme_demo_pages table,
 * falling back to building from sales_companies data.
 */
export async function fetchDemoPageData(slug: string): Promise<DemoPageData | null> {
  const sb = getServiceSalesSupabase()
  if (!sb) {
    console.error("[demo-generator] fetchDemoPageData: Supabase not configured")
    return null
  }

  try {
    // Try theme_demo_pages first
    const { data: themePage, error: themeError } = await sb
      .from(DB_TABLES.THEME_DEMO_PAGES)
      .select("slug, company_id, title, blocks, meta")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle()

    if (themePage && !themeError) {
      const meta = (themePage.meta ?? {}) as Record<string, unknown>
      const blocks = (themePage.blocks ?? []) as Array<{ id: string; type: string; props: Record<string, unknown> }>

      // Fetch associated company for full data
      const { data: company } = await sb
        .from(DB_TABLES.SALES_COMPANIES)
        .select("id, company_name, domain, slug, industry, prefecture, report_locale, tech_stack, pain_diagnosis, dify_result, visual_evidence, demo_site, meta")
        .eq("id", themePage.company_id)
        .maybeSingle()

      if (company) {
        // Build from theme data + company data using the existing builder
        const { fetchDiagnosticReport } = await import("./diagnostic")
        const { localeToRegion } = await import("./types")

        const locale = (company.report_locale ?? meta.locale ?? "ja") as string
        const region = localeToRegion(locale)
        let diagnostic = null
        try {
          diagnostic = await fetchDiagnosticReport({ slug: company.slug ?? themePage.slug, region, reportLocale: locale })
        } catch (diagErr) {
          console.error("[demo-generator] fetchDiagnosticReport threw:", diagErr instanceof Error ? diagErr.message : String(diagErr))
        }

        if (diagnostic) {
          return buildDemoPageData(
            company as Record<string, unknown> as Parameters<typeof buildDemoPageData>[0],
            diagnostic,
          )
        }

        // Fallback: build minimal data from meta
        const isJa = locale === "ja"
        const name = String(meta.company_name ?? company.company_name ?? "Company")
        const ctaUrl = String(meta.calBookingUrl ?? "https://cal.com/paradigm-jp/15min")
        const accentColor = String(meta.accentColor ?? "#7c3aed")
        const accentColorDark = String(meta.accentColorDark ?? "#5b21b6")

        return {
          slug,
          companyId: String(themePage.company_id),
          companyName: name,
          locale: locale as ReportLocale,
          industry: (meta.industry ?? company.industry ?? "consulting") as Industry,
          industryLabel: isJa ? "改善デモ" : "Improvement Demo",
          locationLabel: "",
          hero: {
            title: String(meta.title ?? `${name} Web改善デモ`),
            subtitle: String(meta.description ?? ""),
            tagline: isJa ? "改善デモ" : "Improvement Demo",
            companyName: name,
            industryLabel: isJa ? "改善デモ" : "Improvement Demo",
            locationLabel: "",
            primaryCta: { text: isJa ? "無料相談を予約" : "Book free consult", href: ctaUrl },
            secondaryCta: { text: isJa ? "改善ポイントを見る" : "See improvements", href: "#features" },
            accentColor,
            accentColorDark,
          },
          navigation: isJa
            ? [{ label: "特徴", href: "#features" }, { label: "お問い合わせ", href: "#contact" }]
            : [{ label: "Features", href: "#features" }, { label: "Contact", href: "#contact" }],
          features: [],
          stats: [],
          beforeAfter: [],
          cta: {
            title: isJa ? "無料相談を予約" : "Book free consult",
            subtitle: isJa ? "詳しくはお問い合わせください" : "Contact us for details",
            buttonText: isJa ? "15分無料相談を予約" : "Book 15min Free Consult",
            buttonHref: ctaUrl,
            accentColor,
            accentColorDark,
          },
          totalLoss: "",
          meta: {
            title: String(meta.title ?? `${name} | Web改善デモ`),
            description: String(meta.description ?? ""),
            ogImage: "",
            industry: (meta.industry as Industry) ?? "consulting",
            locale: locale as ReportLocale,
            companyName: name,
            accentColor,
            accentColorDark,
            calBookingUrl: ctaUrl,
            generatedAt: String(meta.generated_at ?? new Date().toISOString()),
            engine: "theme_demo_pages",
          },
          blocks: blocks as DemoBlock[],
        }
      }
    }

    // Fallback: try direct sales_companies lookup
    const { data: companyBySlug } = await sb
      .from(DB_TABLES.SALES_COMPANIES)
      .select("id, company_name, domain, slug, industry, prefecture, report_locale, tech_stack, pain_diagnosis, dify_result, visual_evidence, demo_site, meta")
      .eq("slug", slug.replace(/-demo$/, ""))
      .maybeSingle()

    if (companyBySlug) {
      const { fetchDiagnosticReport } = await import("./diagnostic")
      const { localeToRegion } = await import("./types")

      const locale = (companyBySlug.report_locale ?? "ja") as string
      const region = localeToRegion(locale)
      let diagnostic = null
      try {
        diagnostic = await fetchDiagnosticReport({
          slug: companyBySlug.slug ?? slug.replace(/-demo$/, ""),
          region,
          reportLocale: locale,
        })
      } catch (diagErr) {
        console.error("[demo-generator] fetchDiagnosticReport (fallback) threw:", diagErr instanceof Error ? diagErr.message : String(diagErr))
      }

      if (diagnostic) {
        return buildDemoPageData(
          companyBySlug as Record<string, unknown> as Parameters<typeof buildDemoPageData>[0],
          diagnostic,
        )
      }
    }

    return null
  } catch (err) {
    console.error("[demo-generator] fetchDemoPageData failed:", err instanceof Error ? err.message : String(err))
    if (err instanceof Error && err.stack) console.error("[demo-generator] stack:", err.stack.slice(0, 1000))
    return null
  }
}

/**
 * Generate a full-stack Next.js demo site for a given company.
 * Saves to theme_demo_pages and updates the company's demo_site meta.
 * Returns the new demo URL in the format: demo.paradigmjp.com/[slug]
 */
export async function generateFullStackDemo(
  companyId: string,
  locale?: string,
): Promise<DemoGenerateOutput> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, demoUrl: null, slug: null, error: "Supabase service_role not configured" }

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

    // Build page data
    const pageData = buildDemoPageData(
      company as Record<string, unknown> as Parameters<typeof buildDemoPageData>[0],
      diagnostic,
    )

    const slug = pageData.slug
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.ASTRO_DEMO_BASE_URL || "https://demo.paradigmjp.com"
    const demoUrl = `${baseUrl.replace(/\/+$/, "")}/${slug}`

    // Save to theme_demo_pages
    const blocks = [
      { id: "hero", type: "Hero", props: pageData.hero as unknown as Record<string, unknown> },
      { id: "features", type: "Features", props: { items: pageData.features } as unknown as Record<string, unknown> },
      { id: "stats", type: "Stats", props: { stats: pageData.stats } as unknown as Record<string, unknown> },
      { id: "before-after", type: "BeforeAfter", props: { items: pageData.beforeAfter } as unknown as Record<string, unknown> },
      { id: "cta", type: "CallToAction", props: pageData.cta as unknown as Record<string, unknown> },
    ]

    const { error: upsertError } = await sb
      .from(DB_TABLES.THEME_DEMO_PAGES)
      .upsert({
        slug,
        theme: "nextjs-fullstack",
        title: pageData.meta.title,
        blocks,
        meta: pageData.meta as unknown as Record<string, unknown>,
        company_id: companyId,
        is_published: true,
      }, { onConflict: "slug" })

    if (upsertError) {
      console.error("[demo-generator] generateFullStackDemo upsert failed:", upsertError.message)
      return { ok: false, demoUrl: null, slug: null, error: upsertError.message }
    }

    console.warn(`[demo-generator] full-stack demo saved: ${slug} → ${demoUrl}`)

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
        html_content: JSON.stringify(pageData),
        source: "nextjs_fullstack",
        is_published: true,
        meta: {
          generator: "nextjs_fullstack",
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

/**
 * Fetch multi-page demo data by slug. Reuses the same Supabase lookup
 * logic as fetchDemoPageData but returns DemoMultiPageData for the
 * multi-page website (Home/About/Services/Contact).
 */
export async function fetchDemoMultiPageData(slug: string): Promise<DemoMultiPageData | null> {
  const sb = getServiceSalesSupabase()
  if (!sb) {
    console.error("[demo-generator] fetchDemoMultiPageData: Supabase not configured")
    return null
  }

  try {
    // Try theme_demo_pages first
    const { data: themePage, error: themeError } = await sb
      .from(DB_TABLES.THEME_DEMO_PAGES)
      .select("slug, company_id, title, blocks, meta")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle()

    if (themePage && !themeError) {
      const meta = (themePage.meta ?? {}) as Record<string, unknown>

      const { data: company } = await sb
        .from(DB_TABLES.SALES_COMPANIES)
        .select("id, company_name, domain, slug, industry, prefecture, report_locale, tech_stack, pain_diagnosis, dify_result, visual_evidence, demo_site, meta")
        .eq("id", themePage.company_id)
        .maybeSingle()

      if (company) {
        const { fetchDiagnosticReport } = await import("./diagnostic")
        const { localeToRegion } = await import("./types")

        const locale = (company.report_locale ?? meta.locale ?? "ja") as string
        const region = localeToRegion(locale)
        let diagnostic = null
        try {
          diagnostic = await fetchDiagnosticReport({ slug: company.slug ?? themePage.slug, region, reportLocale: locale })
        } catch (diagErr) {
          console.error("[demo-generator] fetchDiagnosticReport threw:", diagErr instanceof Error ? diagErr.message : String(diagErr))
        }

        if (diagnostic) {
          return buildDemoMultiPageData(
            company as Record<string, unknown> as Parameters<typeof buildDemoMultiPageData>[0],
            diagnostic,
          )
        }
      }
    }

    // Fallback: try direct sales_companies lookup
    const { data: companyBySlug } = await sb
      .from(DB_TABLES.SALES_COMPANIES)
      .select("id, company_name, domain, slug, industry, prefecture, report_locale, tech_stack, pain_diagnosis, dify_result, visual_evidence, demo_site, meta")
      .eq("slug", slug.replace(/-demo$/, ""))
      .maybeSingle()

    if (companyBySlug) {
      const { fetchDiagnosticReport } = await import("./diagnostic")
      const { localeToRegion } = await import("./types")

      const locale = (companyBySlug.report_locale ?? "ja") as string
      const region = localeToRegion(locale)
      let diagnostic = null
      try {
        diagnostic = await fetchDiagnosticReport({
          slug: companyBySlug.slug ?? slug.replace(/-demo$/, ""),
          region,
          reportLocale: locale,
        })
      } catch (diagErr) {
        console.error("[demo-generator] fetchDiagnosticReport (fallback) threw:", diagErr instanceof Error ? diagErr.message : String(diagErr))
      }

      if (diagnostic) {
        return buildDemoMultiPageData(
          companyBySlug as Record<string, unknown> as Parameters<typeof buildDemoMultiPageData>[0],
          diagnostic,
        )
      }
    }

    return null
  } catch (err) {
    console.error("[demo-generator] fetchDemoMultiPageData failed:", err instanceof Error ? err.message : String(err))
    if (err instanceof Error && err.stack) console.error("[demo-generator] stack:", err.stack.slice(0, 1000))
    return null
  }
}
