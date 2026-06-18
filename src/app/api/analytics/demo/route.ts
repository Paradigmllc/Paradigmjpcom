/**
 * Analytics Dashboard API — real-time demo site metrics
 *
 * GET /api/analytics/demo — overview metrics
 * GET /api/analytics/demo?detail=true — per-company breakdown
 */
import { NextRequest, NextResponse } from "next/server"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const detail = url.searchParams.get("detail") === "true"

  try {
    const sb = getServiceSalesSupabase()
    if (!sb) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
    }

    // Total demo pages generated
    const { count: totalGenerated } = await sb
      .from(DB_TABLES.THEME_DEMO_PAGES)
      .select("*", { count: "exact", head: true })
      .eq("is_published", true)

    // Companies with demos
    const { count: companiesWithDemos } = await sb
      .from(DB_TABLES.THEME_DEMO_PAGES)
      .select("company_id", { count: "exact", head: true })
      .eq("is_published", true)
      .not("company_id", "is", null)

    // Active A/B tests
    const { count: abTestsActive } = await sb
      .from(DB_TABLES.THEME_DEMO_PAGES)
      .select("*", { count: "exact", head: true })
      .eq("is_published", true)
      .filter("meta->>ab_test", "eq", "true")

    // Theme distribution
    const { data: themeData } = await sb
      .from(DB_TABLES.THEME_DEMO_PAGES)
      .select("theme")
      .eq("is_published", true)

    const themeDistribution: Record<string, number> = {}
    for (const row of (themeData ?? [])) {
      themeDistribution[row.theme] = (themeDistribution[row.theme] || 0) + 1
    }

    // Industry distribution
    const { data: industryData } = await sb
      .from(DB_TABLES.THEME_DEMO_PAGES)
      .select("meta")
      .eq("is_published", true)
      .not("meta->>industry", "is", null)

    const industryDistribution: Record<string, number> = {}
    for (const row of (industryData ?? [])) {
      const ind = (row.meta as Record<string, unknown>)?.industry as string
      if (ind) industryDistribution[ind] = (industryDistribution[ind] || 0) + 1
    }

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { count: recentGenerated } = await sb
      .from(DB_TABLES.THEME_DEMO_PAGES)
      .select("*", { count: "exact", head: true })
      .eq("is_published", true)
      .gte("created_at", sevenDaysAgo)

    // Engine distribution (dify vs rules)
    const { data: engineData } = await sb
      .from(DB_TABLES.THEME_DEMO_PAGES)
      .select("meta")
      .eq("is_published", true)
      .not("meta->>generator", "is", null)

    const engineDistribution: Record<string, number> = {}
    for (const row of (engineData ?? [])) {
      const gen = (row.meta as Record<string, unknown>)?.generator as string
      if (gen) {
        const engine = gen.includes("dify") ? "dify" : gen.includes("rules") ? "rules" : "other"
        engineDistribution[engine] = (engineDistribution[engine] || 0) + 1
      }
    }

    const overview = {
      totalGenerated: totalGenerated ?? 0,
      companiesWithDemos: companiesWithDemos ?? 0,
      abTestsActive: abTestsActive ?? 0,
      recentGenerated: recentGenerated ?? 0,
      themeDistribution,
      industryDistribution,
      engineDistribution,
      lastUpdated: new Date().toISOString(),
    }

    if (!detail) {
      return NextResponse.json(overview, {
        headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
      })
    }

    // Detailed breakdown
    const { data: details } = await sb
      .from(DB_TABLES.THEME_DEMO_PAGES)
      .select("slug, theme, title, meta, company_id, created_at, updated_at")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(100)

    const enriched = (details ?? []).map(row => ({
      slug: row.slug,
      theme: row.theme,
      title: row.title,
      industry: (row.meta as Record<string, unknown>)?.industry || "unknown",
      locale: (row.meta as Record<string, unknown>)?.locale || "ja",
      engine: (row.meta as Record<string, unknown>)?.generator || "unknown",
      visits: Array.isArray((row.meta as Record<string, unknown>)?.visits) ? ((row.meta as Record<string, unknown>).visits as Array<unknown>).length : 0,
      created: row.created_at,
      updated: row.updated_at,
    }))

    return NextResponse.json({ overview, details: enriched }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    })
  } catch (e) {
    console.error("[analytics] error:", e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
