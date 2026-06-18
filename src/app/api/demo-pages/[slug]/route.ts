/**
 * /api/demo-pages/[slug] — Theme Demo Pages CRUD
 *
 * GET  — Fetch a single demo page by slug (public, with caching)
 * POST — Create a new demo page (Dify integration, admin-secret auth)
 * PATCH — Update blocks/meta (admin-secret auth)
 *
 * This replaces the old /api/content-blocks/[slug] flow for demo pages.
 * Dify outputs JSON with { theme, blocks, meta } and POSTs here.
 * Astro [slug].astro fetches from here at SSR time.
 */
import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  try {
    const sb = getServiceSupabase()
    if (!sb) return NextResponse.json({ error: "supabase not configured" }, { status: 500 })

    const { data, error } = await sb
      .from("theme_demo_pages")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle()

    if (error) {
      console.error(`[demo-pages/${slug}] fetch error:`, error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: "not found" }, { status: 404 })
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    })
  } catch (e) {
    console.error(`[demo-pages/${slug}] unexpected:`, e)
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

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
  const body = await req.json().catch(() => ({}))
  const { theme, blocks, meta, title, company_id } = body

  if (!theme || !blocks) {
    return NextResponse.json({ error: "theme and blocks are required" }, { status: 400 })
  }

  // Validate theme
  const validThemes = ["astrowind", "screwfast", "astroship"]
  if (!validThemes.includes(theme)) {
    return NextResponse.json({ error: `theme must be one of: ${validThemes.join(", ")}` }, { status: 400 })
  }

  try {
    const sb = getServiceSupabase()
    if (!sb) return NextResponse.json({ error: "supabase not configured" }, { status: 500 })

    const row: Record<string, unknown> = {
      slug,
      theme,
      blocks: blocks || [],
      meta: meta || {},
      is_published: body.is_published !== false,
    }
    if (title !== undefined) row.title = title
    if (company_id !== undefined) row.company_id = company_id

    const { data, error } = await sb
      .from("theme_demo_pages")
      .upsert(row, { onConflict: "slug" })
      .select()
      .maybeSingle()

    if (error) {
      console.error(`[demo-pages/${slug}] upsert error:`, error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    console.error(`[demo-pages/${slug}] unexpected:`, e)
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const expected = process.env.ADMIN_SCRIPT_SECRET
  if (!expected) return NextResponse.json({ error: "secret not set" }, { status: 500 })
  if (req.headers.get("x-admin-secret") !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { slug } = await params
  const body = await req.json().catch(() => ({}))
  const updates: Record<string, unknown> = {}

  if (body.theme !== undefined) {
    const validThemes = ["astrowind", "screwfast", "astroship"]
    if (!validThemes.includes(body.theme)) {
      return NextResponse.json({ error: `theme must be one of: ${validThemes.join(", ")}` }, { status: 400 })
    }
    updates.theme = body.theme
  }
  if (body.title !== undefined) updates.title = body.title
  if (body.blocks !== undefined) updates.blocks = body.blocks
  if (body.meta !== undefined) updates.meta = body.meta
  if (body.is_published !== undefined) updates.is_published = body.is_published
  if (body.company_id !== undefined) updates.company_id = body.company_id

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 })
  }

  try {
    const sb = getServiceSupabase()
    if (!sb) return NextResponse.json({ error: "supabase not configured" }, { status: 500 })

    const { data, error } = await sb
      .from("theme_demo_pages")
      .update(updates)
      .eq("slug", slug)
      .select()
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: "not found" }, { status: 404 })

    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
