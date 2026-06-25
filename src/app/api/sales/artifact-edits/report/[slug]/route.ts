import { NextRequest, NextResponse } from "next/server"
import { authorizePayloadAdminRequest, authorizeWebhookRequest } from "@/lib/admin-auth"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { sanitizeReportAdminFields } from "@/lib/sales/artifact-admin-overrides"
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

function personalizePatch(fields: ReturnType<typeof sanitizeReportAdminFields>) {
  return {
    personalized_hook: fields.hook ?? null,
    personalized_pain: fields.pain ?? null,
    personalized_fear: fields.fear ?? null,
    personalized_loss: fields.loss ?? null,
    personalized_cta: fields.cta ?? null,
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { slug } = await params
    const body = readRecord(await req.json().catch((error: unknown) => {
      console.error("[artifact-report-edit] invalid JSON:", error)
      return {}
    }))
    const reset = body.reset === true
    const dryRun = body.dryRun === true
    const webhookAuth = dryRun ? authorizeWebhookRequest(req.headers) : { ok: false }
    const auth = webhookAuth.ok
      ? { ok: true, userEmail: null }
      : await authorizePayloadAdminRequest({
          headers: req.headers,
          legacyToken: req.cookies.get("paradigm_admin_token")?.value,
        })
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }
    const fields = reset ? {} : sanitizeReportAdminFields(body.fields)
    const supabase = getServiceSalesSupabase()
    if (!supabase) {
      console.error("[artifact-report-edit] Supabase is not configured")
      return NextResponse.json({ ok: false, error: "Supabase is not configured" }, { status: 500 })
    }

    const { data: company, error: companyError } = await supabase
      .from(DB_TABLES.SALES_COMPANIES)
      .select("id, company_name, slug")
      .eq("slug", slug)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (companyError) {
      console.error("[artifact-report-edit] company fetch failed:", companyError.message)
      return NextResponse.json({ ok: false, error: "Company lookup failed" }, { status: 500 })
    }
    if (!company) {
      return NextResponse.json({ ok: false, error: "Company not found" }, { status: 404 })
    }

    const editedAt = new Date().toISOString()
    if (dryRun) {
      return NextResponse.json({ ok: true, dryRun: true, editedAt, slug, reset })
    }

    const personalizedCopy = reset
      ? {
          personalized_hook: null,
          personalized_pain: null,
          personalized_fear: null,
          personalized_loss: null,
          personalized_cta: null,
        }
      : personalizePatch(fields)

    const { error: updateError } = await supabase.rpc("sales_atomic_meta_merge", {
      p_company_id: company.id,
      p_patch: {
        personalized_copy: personalizedCopy,
        artifact_admin: {
          report_edited_at: editedAt,
          report_edited_by: auth.userEmail,
          report_editor: "inline_admin",
        },
      },
    })

    if (updateError) {
      console.error("[artifact-report-edit] meta merge failed:", updateError.message)
      return NextResponse.json({ ok: false, error: "Report update failed" }, { status: 500 })
    }

    try {
      const { notifyBothChannels } = await import("@/lib/notify")
      await notifyBothChannels("sales", {
        title: reset ? "診断レポート編集をリセット" : "診断レポートを手動編集",
        message: `${company.company_name ?? slug} / ${slug}`,
        link: `/ja/report/${slug}`,
        type: reset ? "artifact_report_reset" : "artifact_report_edit",
      })
    } catch (notifyError) {
      console.warn("[artifact-report-edit] notification failed:", notifyError instanceof Error ? notifyError.message : String(notifyError))
    }

    return NextResponse.json({ ok: true, editedAt, slug, reset })
  } catch (error) {
    console.error("[artifact-report-edit] unexpected error:", error)
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 })
  }
}
