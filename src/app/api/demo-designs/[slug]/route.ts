/**
 * /api/demo-designs/[slug] — Hyper-personalized demo design spec API
 *
 * GET  — Returns cached DemoDesignSpec JSON (public, cached)
 * POST — Triggers DeepSeek generation of a new design spec (admin auth)
 */
import { NextRequest, NextResponse } from "next/server"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { generateDemoDesign, buildDesignInput } from "@/lib/sales/demo-design-generator"
import type { DesignPromptInput } from "@/lib/sales/demo-design-prompts"

export const dynamic = "force-dynamic"

// ── GET — return cached design spec ──

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  try {
    const sb = getServiceSalesSupabase()
    if (!sb) return NextResponse.json({ error: "supabase not configured" }, { status: 500 })

    const { data, error } = await sb
      .from("theme_demo_pages")
      .select("meta, company_id")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle()

    if (error) {
      console.error(`[demo-designs/${slug}] fetch error:`, error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: "not found" }, { status: 404 })
    }

    const meta = (data.meta ?? {}) as Record<string, unknown>
    const spec = meta.design_spec
    if (!spec) {
      return NextResponse.json({ error: "design spec not yet generated" }, { status: 404 })
    }

    return NextResponse.json(spec, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    })
  } catch (e) {
    console.error(`[demo-designs/${slug}] unexpected:`, e)
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

// ── POST — generate new design spec (admin auth) ──

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const expected = process.env.ADMIN_SCRIPT_SECRET
  if (!expected) return NextResponse.json({ error: "secret not set" }, { status: 500 })
  if (req.headers.get("x-admin-secret") !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { slug } = await params
  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const locale = (typeof body.locale === "string" ? body.locale : "ja") as "ja" | "en"

  try {
    const sb = getServiceSalesSupabase()
    if (!sb) return NextResponse.json({ error: "supabase not configured" }, { status: 500 })

    // Fetch company data
    const companyId = typeof body.company_id === "string" ? body.company_id : null

    let companyData: Record<string, unknown> | null = null
    if (companyId) {
      const { data: company } = await sb
        .from("sales_companies")
        .select("company_name, domain, industry, prefecture, meta, pain_diagnosis, dify_result, tech_stack, pagespeed_mobile, pagespeed_desktop, detected_issues")
        .eq("id", companyId)
        .maybeSingle()
      companyData = company ?? null
    }

    if (!companyData) {
      return NextResponse.json({ error: "company not found" }, { status: 404 })
    }

    const websiteAssets = companyData.meta
      ? ((companyData.meta as Record<string, unknown>).website_assets as Record<string, unknown>)
      : null

    const input = buildDesignInput({
      company_name: String(companyData.company_name ?? ""),
      domain: String(companyData.domain ?? ""),
      industry: typeof companyData.industry === "string" ? companyData.industry : null,
      location: typeof companyData.prefecture === "string" ? companyData.prefecture : null,
      locale,
      website_assets: websiteAssets,
      diagnosis: {
        pain_summary: companyData.pain_diagnosis ?? companyData.dify_result ?? {},
        detected_issues: companyData.detected_issues,
        pagespeed_mobile: companyData.pagespeed_mobile,
        pagespeed_desktop: companyData.pagespeed_desktop,
        tech_stack: companyData.tech_stack,
        improvement_actions: [],
      } as Record<string, unknown>,
    })

    if (!input) {
      return NextResponse.json({ error: "insufficient company data" }, { status: 400 })
    }

    const result = await generateDemoDesign(input, slug)
    if (!result.ok || !result.spec) {
      return NextResponse.json({ error: result.error ?? "generation failed" }, { status: 500 })
    }

    // Store the generated spec in theme_demo_pages
    const { error: upsertErr } = await sb
      .from("theme_demo_pages")
      .upsert(
        {
          slug,
          theme: "hyper-personalized",
          title: result.spec.pages.home?.title ?? `${companyData.company_name} Demo`,
          blocks: result.spec,
          meta: {
            ...((typeof companyData.meta === "object" && companyData.meta !== null) ? companyData.meta as Record<string, unknown> : {}),
            design_spec: result.spec,
            design_philosophy: result.spec.design_philosophy,
            generated_at: new Date().toISOString(),
          },
          is_published: true,
          company_id: companyId,
        },
        { onConflict: "slug" },
      )

    if (upsertErr) {
      console.error(`[demo-designs/${slug}] upsert error:`, upsertErr.message)
    }

    return NextResponse.json(result.spec, { status: 201 })
  } catch (e) {
    console.error(`[demo-designs/${slug}] unexpected:`, e)
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
