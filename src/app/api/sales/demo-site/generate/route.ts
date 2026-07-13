import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { generateFullStackDemo } from "@/lib/sales/demo-generator"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

interface GenerateRequest {
  company_id: string
  locale?: string
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isSalesApiAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = (await req.json()) as GenerateRequest

    if (!body.company_id || typeof body.company_id !== "string") {
      return NextResponse.json(
        { ok: false, error: "company_id is required and must be a string" },
        { status: 400 },
      )
    }

    const result = await generateFullStackDemo(body.company_id, body.locale, {
      publicationMode: "private_review",
      sourcePolicy: "reviewed_manifest",
      enhanceWithAI: true,
      notify: false,
    })

    if (!result.ok) {
      return NextResponse.json(result, { status: 422 })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error"
    console.error("[demo-site/generate] failed:", message)
    return NextResponse.json(
      { ok: false, demoUrl: null, slug: null, error: message },
      { status: 500 },
    )
  }
}
