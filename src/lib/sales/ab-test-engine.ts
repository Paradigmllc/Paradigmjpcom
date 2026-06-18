/**
 * A/B Testing Engine — generates multiple demo variants and tracks performance.
 *
 * Creates two demo variants per company:
 *   Variant A: Primary theme (industry default)
 *   Variant B: Secondary theme (alternative for comparison)
 *
 * Tracks views, CTA clicks, and bookings per variant.
 * After 10+ visits, auto-selects the winning variant.
 */
import type { SalesCompany } from "./types"
import type { DiagnosticReportData } from "./diagnostic"
import { generateDemoWithDify, type DemoJsonBlueprint } from "./dify-demo-generator"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"

export interface ABVariant {
  slug: string
  theme: string
  variant: "A" | "B"
  blueprint: DemoJsonBlueprint
  url: string
}

export interface ABTestResult {
  companyId: string
  variants: ABVariant[]
  winner?: ABVariant
  stats?: { variantA: TestStats; variantB: TestStats }
}

interface TestStats {
  views: number
  ctaClicks: number
  bookings: number
}

const SECONDARY_THEMES: Record<string, string> = {
  astrowind: "screwfast",
  screwfast: "astroship",
  astroship: "astrowind",
}

/**
 * Generate A/B test variants for a company.
 * Returns 2 variants (A = primary theme, B = secondary theme).
 */
export async function generateABVariants(
  company: SalesCompany,
  report: DiagnosticReportData,
): Promise<{ variants: ABVariant[]; error?: string }> {
  const baseUrl = process.env.ASTRO_DEMO_BASE_URL || "https://demo.paradigmjp.com"
  const rawSlug = company.slug || company.domain?.replace(/[^a-zA-Z0-9-]/g, "-")?.slice(0, 30) || company.id.slice(0, 8)

  try {
    // Variant A: Primary theme (from Dify or rules)
    const blueprintA = await generateDemoWithDify(company, report)
    const slugA = `${rawSlug}-a`

    // Variant B: Secondary theme (rules-based only, different theme)
    const themeB = SECONDARY_THEMES[blueprintA.theme] || "astrowind"
    const blueprintB: DemoJsonBlueprint = {
      ...blueprintA,
      theme: themeB as "astrowind" | "screwfast" | "astroship",
      engine: "rules",
      meta: { ...blueprintA.meta, generator: "rules_ab", variant: "B" },
    }
    const slugB = `${rawSlug}-b`

    const variants: ABVariant[] = [
      { slug: slugA, theme: blueprintA.theme, variant: "A", blueprint: blueprintA, url: `${baseUrl}/${slugA}` },
      { slug: slugB, theme: themeB, variant: "B", blueprint: blueprintB, url: `${baseUrl}/${slugB}` },
    ]

    return { variants }
  } catch (e) {
    return { variants: [], error: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * Evaluate A/B test results and select a winner.
 * Uses CTA click rate as the primary metric.
 * Auto-selects after 10+ total views OR if one variant has 3x+ more clicks.
 */
export async function evaluateABTest(companyId: string): Promise<ABTestResult | null> {
  const sb = getServiceSalesSupabase()
  if (!sb) return null

  // Fetch company meta with visit/click data
  const { data: company } = await sb
    .from(DB_TABLES.SALES_COMPANIES)
    .select("id, meta, demo_site")
    .eq("id", companyId)
    .maybeSingle()

  if (!company) return null

  const meta = (company.meta as Record<string, unknown>) ?? {}
  const visits = (meta.demo_visits as Array<Record<string, unknown>>) ?? []

  // Count events per variant slug
  const statsA: TestStats = { views: 0, ctaClicks: 0, bookings: 0 }
  const statsB: TestStats = { views: 0, ctaClicks: 0, bookings: 0 }

  for (const v of visits) {
    const slug = (v.slug as string) || ""
    const event = (v.event as string) || ""
    if (slug.endsWith("-a")) {
      if (event === "view") statsA.views++
      else if (event === "cta_click") statsA.ctaClicks++
      else if (event === "booking") statsA.bookings++
    } else if (slug.endsWith("-b")) {
      if (event === "view") statsB.views++
      else if (event === "cta_click") statsB.ctaClicks++
      else if (event === "booking") statsB.bookings++
    }
  }

  const totalViews = statsA.views + statsB.views
  const clickRateA = statsA.views > 0 ? statsA.ctaClicks / statsA.views : 0
  const clickRateB = statsB.views > 0 ? statsB.ctaClicks / statsB.views : 0

  let winner: string | undefined
  if (totalViews >= 10) {
    winner = clickRateA >= clickRateB ? "A" : "B"
  } else if (statsA.ctaClicks >= 3 && statsB.ctaClicks === 0) {
    winner = "A"
  } else if (statsB.ctaClicks >= 3 && statsA.ctaClicks === 0) {
    winner = "B"
  }

  return {
    companyId,
    variants: [], // Populated by caller
    winner: winner ? { slug: winner === "A" ? `${company.demo_site}-a` : `${company.demo_site}-b`, theme: "", variant: winner as "A" | "B", blueprint: {} as DemoJsonBlueprint, url: "" } : undefined,
    stats: { variantA: statsA, variantB: statsB },
  }
}

/**
 * Write A/B variant blueprints to Supabase.
 */
export async function persistABVariants(
  companyId: string,
  variants: ABVariant[],
): Promise<void> {
  const sb = getServiceSalesSupabase()
  if (!sb) return

  for (const v of variants) {
    await sb.from(DB_TABLES.THEME_DEMO_PAGES).upsert({
      slug: v.slug,
      theme: v.theme,
      title: v.blueprint.title,
      blocks: v.blueprint.blocks,
      meta: { ...v.blueprint.meta, variant: v.variant, ab_test: true },
      company_id: companyId,
      is_published: true,
    }, { onConflict: "slug" })
  }

  // Store AB metadata on company
  const demoSiteMeta = {
    ab_test: true,
    variant_a: variants[0]?.url,
    variant_b: variants[1]?.url,
    generated_at: new Date().toISOString(),
  }

  await sb.rpc("sales_atomic_meta_merge", {
    p_company_id: companyId,
    p_patch: { demo_site: demoSiteMeta },
  })
}
