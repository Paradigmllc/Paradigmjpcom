import { NextResponse } from "next/server"
import { authorizePayloadAdminRequest } from "@/lib/admin-auth"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { getAiPrompt } from "@/lib/sales/ai-prompts"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(req: Request) {
  try {
    const auth = await authorizePayloadAdminRequest({ headers: req.headers })
    if (!auth.ok) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const sb = getServiceSalesSupabase()
    if (!sb) {
      return NextResponse.json({ error: "supabase not configured" }, { status: 500 })
    }

    // fallback mapping if DB fails
    const defaultIds = ["dify_diagnosis_system", "sales_form_message_system"]
    
    const { data, error } = await sb.from("sales_ai_prompts").select("*").order("updated_at", { ascending: false })
    
    if (error && error.code !== "42P01") {
      throw new Error(error.message)
    }

    // Merge with fallbacks so UI always sees them
    const rows = data ?? []
    const mapped = await Promise.all(
      defaultIds.map(async (id) => {
        const row = rows.find((r) => r.id === id)
        if (row) return row
        return {
          id,
          prompt_text: await getAiPrompt(id),
          description: "Database table not found or row missing.",
          updated_at: new Date().toISOString(),
        }
      })
    )

    // Add any extra prompts found in DB
    for (const row of rows) {
      if (!defaultIds.includes(row.id)) {
        mapped.push(row)
      }
    }

    return NextResponse.json(mapped)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[sales-ai-prompts GET] failed:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await authorizePayloadAdminRequest({ headers: req.headers })
    if (!auth.ok) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const { id, prompt_text, description } = await req.json()
    if (typeof id !== "string" || typeof prompt_text !== "string") {
      return NextResponse.json({ error: "invalid input" }, { status: 400 })
    }

    const sb = getServiceSalesSupabase()
    if (!sb) {
      return NextResponse.json({ error: "supabase not configured" }, { status: 500 })
    }

    const { data, error } = await sb
      .from("sales_ai_prompts")
      .upsert({ id, prompt_text, description, updated_at: new Date().toISOString() }, { onConflict: "id" })
      .select("*")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[sales-ai-prompts PUT] failed:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
