import { NextResponse } from "next/server"
import { seedAllContent } from "./seed-data"

export const dynamic = "force-dynamic"
export const maxDuration = 300

export async function POST(req: Request) {
  const secret = req.headers.get("x-admin-secret")
  const expected = process.env.ADMIN_SCRIPT_SECRET
  if (!expected) return NextResponse.json({ error: "ADMIN_SCRIPT_SECRET not configured" }, { status: 500 })
  if (secret !== expected) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  if (body.dryRun) {
    const { CATEGORIES, ALL_POSTS, SERVICES, PRICING_PLANS, WORKS, FAQS, TESTIMONIALS, TEAM_MEMBERS } = await import("./seed-data")
    return NextResponse.json({ dryRun: true, would_seed: { categories: CATEGORIES.length, posts: ALL_POSTS.length, services: SERVICES.length, pricing: PRICING_PLANS.length, works: WORKS.length, faqs: FAQS.length, testimonials: TESTIMONIALS.length, team: TEAM_MEMBERS.length, pages: 1 }, hint: "{ confirm: true } で実行" })
  }
  if (!body.confirm) return NextResponse.json({ error: "Send { confirm: true } to execute", hint: "{ dryRun: true } で内容確認" }, { status: 400 })

  try {
    const result = await seedAllContent()
    return NextResponse.json({ success: true, summary: result })
  } catch (e) {
    console.error("[seed-all-content] fatal:", e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
