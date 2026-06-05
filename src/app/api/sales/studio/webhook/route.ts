import { NextRequest, NextResponse } from "next/server"
import { authorizeWebhookRequest } from "@/lib/admin-auth"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { captureException } from "@/lib/error-monitor"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const auth = authorizeWebhookRequest(req.headers)
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const sb = getServiceSalesSupabase()
  if (!sb) {
    return NextResponse.json({ ok: false, error: "Supabase service_role not configured" }, { status: 503 })
  }

  let body: Record<string, any>
  try {
    body = await req.json()
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
  }

  // Detect payload type (Directus vs Keystatic)
  // Directus usually sends "collection", "keys", "action"
  // Keystatic might just send a generic webhook we defined.

  try {
    const isDirectus = body.collection && body.keys && body.action
    if (isDirectus) {
      const collection = body.collection
      const action = body.action // "items.create", "items.update"
      if (collection === "agency_presentations" && (action === "items.update" || action === "items.create")) {
        // Directus modified an asset. We should pull the changes or just mark status as updated.
        // In a real scenario, we'd fetch the exact changes. For now, we update the status.
        // Directus usually sends the modified payload or keys.
        const keys = Array.isArray(body.keys) ? body.keys : [body.keys]
        for (const key of keys) {
          // If key is the UUID of presentation
          const { error } = await sb
            .from("agency_presentations")
            .update({ status: "published", updated_at: new Date().toISOString() })
            .eq("id", key)
          
          if (error) {
             console.error("[studio-webhook] Error updating presentation from Directus:", error.message)
          }
        }
      }
    } else {
      // Keystatic or other
      const isKeystatic = body.type === "keystatic_update" || body.ref === "refs/heads/main"
      if (isKeystatic && body.company_id) {
         const { error } = await sb
            .from("agency_demo_sites")
            .update({ status: "deployed", updated_at: new Date().toISOString() })
            .eq("company_id", body.company_id)
            
         if (error) {
             console.error("[studio-webhook] Error updating demo site from Keystatic:", error.message)
         }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[studio-webhook] Processing error:", error)
    await captureException(error, { source: "studio-webhook" })
    return NextResponse.json({ ok: false, error: "Internal error processing webhook" }, { status: 500 })
  }
}
