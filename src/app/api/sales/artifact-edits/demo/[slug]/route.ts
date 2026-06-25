import { NextRequest, NextResponse } from "next/server"
import { authorizePayloadAdminRequest } from "@/lib/admin-auth"
import { sanitizeDemoAdminFields } from "@/lib/sales/artifact-admin-overrides"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { getServiceSalesSupabase } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

type RouteContext = {
  params: Promise<{ slug: string }>
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function compactRecord(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined))
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const auth = await authorizePayloadAdminRequest({
      headers: req.headers,
      legacyToken: req.cookies.get("paradigm_admin_token")?.value,
    })
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const { slug } = await params
    const body = readRecord(await req.json().catch((error: unknown) => {
      console.error("[artifact-demo-edit] invalid JSON:", error)
      return {}
    }))
    const reset = body.reset === true
    const dryRun = body.dryRun === true
    const supabase = getServiceSalesSupabase()
    if (!supabase) {
      console.error("[artifact-demo-edit] Supabase is not configured")
      return NextResponse.json({ ok: false, error: "Supabase is not configured" }, { status: 500 })
    }

    const { data: themePage, error: fetchError } = await supabase
      .from(DB_TABLES.THEME_DEMO_PAGES)
      .select("slug, title, meta, company_id")
      .eq("slug", slug)
      .maybeSingle()

    if (fetchError) {
      console.error("[artifact-demo-edit] page fetch failed:", fetchError.message)
      return NextResponse.json({ ok: false, error: "Demo lookup failed" }, { status: 500 })
    }
    if (!themePage) {
      return NextResponse.json({ ok: false, error: "Demo not found" }, { status: 404 })
    }

    const editedAt = new Date().toISOString()
    if (dryRun) {
      return NextResponse.json({ ok: true, dryRun: true, editedAt, slug, reset })
    }

    const currentMeta = readRecord(themePage.meta)
    const currentArtifactAdmin = readRecord(currentMeta.artifact_admin)
    const overrides = reset ? {} : compactRecord(sanitizeDemoAdminFields(body.fields) as Record<string, unknown>)
    const nextMeta = {
      ...currentMeta,
      artifact_admin: {
        ...currentArtifactAdmin,
        demo_overrides: overrides,
        demo_edited_at: editedAt,
        demo_edited_by: auth.userEmail,
        demo_editor: "inline_admin",
      },
    }
    const title = typeof overrides.metaTitle === "string" && overrides.metaTitle.length > 0
      ? overrides.metaTitle
      : themePage.title

    const { error: updateError } = await supabase
      .from(DB_TABLES.THEME_DEMO_PAGES)
      .update({ meta: nextMeta, title })
      .eq("slug", slug)

    if (updateError) {
      console.error("[artifact-demo-edit] page update failed:", updateError.message)
      return NextResponse.json({ ok: false, error: "Demo update failed" }, { status: 500 })
    }

    try {
      const { notifyBothChannels } = await import("@/lib/notify")
      await notifyBothChannels("sales", {
        title: reset ? "デモサイト編集をリセット" : "デモサイトを手動編集",
        message: slug,
        link: `/ja/demo/${slug}`,
        type: reset ? "artifact_demo_reset" : "artifact_demo_edit",
      })
    } catch (notifyError) {
      console.warn("[artifact-demo-edit] notification failed:", notifyError instanceof Error ? notifyError.message : String(notifyError))
    }

    return NextResponse.json({ ok: true, editedAt, slug, reset })
  } catch (error) {
    console.error("[artifact-demo-edit] unexpected error:", error)
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 })
  }
}
