import { NextRequest, NextResponse } from "next/server"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

interface ContactRequestBody {
  name: string
  email: string
  company: string
  message: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ContactRequestBody

    // Validate required fields
    if (!body.email || !body.email.trim()) {
      return NextResponse.json(
        { ok: false, error: "Email is required" },
        { status: 400 },
      )
    }

    if (!body.message || !body.message.trim()) {
      return NextResponse.json(
        { ok: false, error: "Message is required" },
        { status: 400 },
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email.trim())) {
      return NextResponse.json(
        { ok: false, error: "Invalid email format" },
        { status: 400 },
      )
    }

    // Sanitize input lengths
    const name = body.name?.trim().slice(0, 200) ?? ""
    const email = body.email.trim().slice(0, 254)
    const company = body.company?.trim().slice(0, 200) ?? "Unknown"
    const message = body.message.trim().slice(0, 5000)

    // Try to save to Supabase
    const supabase = getServiceSalesSupabase()
    if (supabase) {
      const { error: dbError } = await supabase
        .from(DB_TABLES.DEMO_CONTACT_SUBMISSIONS)
        .insert({
          name,
          email,
          company,
          message,
          created_at: new Date().toISOString(),
        })

      if (dbError) {
        // Table might not exist yet — log and continue
        console.error("[demo-contact] DB insert error:", dbError.message)
      }
    } else {
      console.warn("[demo-contact] Supabase not configured — submission logged only")
    }

    // Log structured submission
    console.log("[demo-contact] New submission:", JSON.stringify({
      name,
      email,
      company,
      messageLength: message.length,
      timestamp: new Date().toISOString(),
    }))

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[demo-contact] Unexpected error:", e)
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    )
  }
}
