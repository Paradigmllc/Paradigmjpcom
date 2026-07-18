import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { generateFullStackDemo } from "@/lib/sales/demo-generator"
import { z } from "zod"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const requestSchema = z.object({
  company_id: z.uuid(),
  locale: z.string().optional(),
  screenshot_data_urls: z.array(z.string().min(16).max(8_000_000).refine(
    (value) => value.startsWith("data:image/") || value.startsWith("https://"),
    "画像はdata:imageまたはHTTPS URLで指定してください",
  )).min(1).max(3).optional(),
  screenshot_prompt: z.string().max(6_000).optional(),
  screenshot_design_system: z.string().max(12_000).optional(),
})

export async function POST(req: NextRequest) {
  try {
    if (!(await isSalesApiAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const parsed = requestSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "入力が不正です" }, { status: 400 })
    const body = parsed.data

    const result = await generateFullStackDemo(body.company_id, body.locale, {
      publicationMode: "private_review",
      sourcePolicy: "reviewed_manifest",
      enhanceWithAI: true,
      notify: false,
      ...(body.screenshot_data_urls ? {
        screenshotToCode: {
          imageDataUrls: body.screenshot_data_urls,
          prompt: body.screenshot_prompt,
          designSystem: body.screenshot_design_system,
        },
      } : {}),
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
