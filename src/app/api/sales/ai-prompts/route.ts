import { NextRequest, NextResponse } from "next/server"
import { authorizePayloadAdminRequest } from "@/lib/admin-auth"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { DEFAULT_AI_PROMPT_IDS, getFallbackAiPromptRows, type SalesAiPrompt } from "@/lib/sales/ai-prompts"

export const dynamic = "force-dynamic"
export const revalidate = 0

type PromptRow = {
  id: string
  prompt_text: string
  description: string | null
  updated_at: string | null
}

function normalizePromptRows(rows: PromptRow[]): SalesAiPrompt[] {
  const fallbackRows = getFallbackAiPromptRows()
  const merged = fallbackRows.map((fallback) => {
    const row = rows.find((item) => item.id === fallback.id)
    return {
      ...fallback,
      ...row,
      description: row?.description ?? fallback.description,
      updated_at: row?.updated_at ?? fallback.updated_at,
    }
  })

  for (const row of rows) {
    if (!DEFAULT_AI_PROMPT_IDS.includes(row.id as (typeof DEFAULT_AI_PROMPT_IDS)[number])) {
      merged.push({
        id: row.id,
        prompt_text: row.prompt_text,
        description: row.description,
        updated_at: row.updated_at ?? new Date().toISOString(),
      })
    }
  }

  return merged
}

async function authorizeSalesPromptRequest(req: NextRequest) {
  return authorizePayloadAdminRequest({
    headers: req.headers,
    legacyToken: req.cookies.get("paradigm_admin_token")?.value,
  })
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeSalesPromptRequest(req)
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
    }

    const sb = getServiceSalesSupabase()
    if (!sb) {
      console.warn("[sales-ai-prompts GET] Supabase is not configured; returning fallback prompts")
      return NextResponse.json({
        ok: true,
        prompts: getFallbackAiPromptRows(),
        warning: "Supabase is not configured. Fallback prompts are shown.",
      })
    }

    const { data, error } = await sb
      .from("sales_ai_prompts")
      .select("id,prompt_text,description,updated_at")
      .order("updated_at", { ascending: false })

    if (error) {
      console.warn("[sales-ai-prompts GET] DB prompt load failed; returning fallback prompts:", error.message)
      return NextResponse.json({
        ok: true,
        prompts: getFallbackAiPromptRows(),
        warning: "Prompt table is not available. Fallback prompts are shown.",
      })
    }

    return NextResponse.json({ ok: true, prompts: normalizePromptRows(data ?? []) })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[sales-ai-prompts GET] failed:", message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await authorizeSalesPromptRequest(req)
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
    }

    const body = (await req.json()) as { id?: unknown; prompt_text?: unknown; description?: unknown }
    if (typeof body.id !== "string" || typeof body.prompt_text !== "string" || !body.prompt_text.trim()) {
      return NextResponse.json({ ok: false, error: "invalid input" }, { status: 400 })
    }

    const sb = getServiceSalesSupabase()
    if (!sb) {
      console.error("[sales-ai-prompts PUT] Supabase is not configured")
      return NextResponse.json({ ok: false, error: "supabase not configured" }, { status: 503 })
    }

    const { data, error } = await sb
      .from("sales_ai_prompts")
      .upsert(
        {
          id: body.id,
          prompt_text: body.prompt_text,
          description: typeof body.description === "string" ? body.description : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      )
      .select("id,prompt_text,description,updated_at")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ ok: true, prompt: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[sales-ai-prompts PUT] failed:", message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
