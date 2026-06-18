/**
 * /api/track — Demo page visit + CTA click tracking
 *
 * Records anonymous view and click events for demo pages.
 * Called by [slug].astro's inline tracking script.
 *
 * GET /api/track?event=view&slug={slug}&page={page}
 * GET /api/track?event=cta_click&slug={slug}&type=cal_booking
 *
 * Events are stored in sales_companies.meta.demo_visits[]
 * for correlation with the sales pipeline.
 */
import { NextRequest, NextResponse } from "next/server"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const event = url.searchParams.get("event") || "view"
  const slug = url.searchParams.get("slug")
  const page = url.searchParams.get("page") || "/"
  const type = url.searchParams.get("type") || ""

  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 })
  }

  const visit = {
    event,
    slug,
    page,
    type: type || undefined,
    timestamp: new Date().toISOString(),
    user_agent: req.headers.get("user-agent")?.slice(0, 200) || "",
    referer: req.headers.get("referer")?.slice(0, 300) || "",
  }

  try {
    const sb = getServiceSalesSupabase()
    if (!sb) {
      // Silently fail — tracking should never block page rendering
      console.warn("[track] Supabase not configured, skipping")
      return new Response("ok", { status: 200, headers: { "Cache-Control": "no-store" } })
    }

    // Find company by demo slug (stored in theme_demo_pages)
    const { data: demoPage } = await sb
      .from(DB_TABLES.THEME_DEMO_PAGES)
      .select("company_id, slug")
      .eq("slug", slug)
      .maybeSingle()

    if (demoPage?.company_id) {
      // Record visit on the company via atomic append
      const { error } = await sb.rpc("sales_atomic_meta_merge", {
        p_company_id: demoPage.company_id,
        p_patch: {
          demo_visits: [visit], // Will be merged as array
        },
      })

      if (error) {
        // Fallback: store in theme_demo_pages meta
        const existingMeta = (demoPage as any)?.meta || {}
        const visits = Array.isArray(existingMeta.visits) ? existingMeta.visits : []
        visits.push(visit)
        await sb
          .from(DB_TABLES.THEME_DEMO_PAGES)
          .update({ meta: { ...existingMeta, visits } })
          .eq("slug", slug)
      }

      // If CTA click (booking), update pipeline status
      if (event === "cta_click" && type === "cal_booking") {
        await sb.rpc("sales_atomic_meta_merge", {
          p_company_id: demoPage.company_id,
          p_patch: {
            demo_booked_at: new Date().toISOString(),
            pipeline_auto_advance: "demo_booked",
          },
        })
      }
    }

    return new Response("ok", { status: 200, headers: { "Cache-Control": "no-store" } })
  } catch (e) {
    console.error("[track] error:", e instanceof Error ? e.message : String(e))
    return new Response("ok", { status: 200, headers: { "Cache-Control": "no-store" } })
  }
}
