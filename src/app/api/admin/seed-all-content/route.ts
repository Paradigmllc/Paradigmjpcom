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
  const scope = body.scope === "homepage" ? "homepage" : "all"
  if (body.dryRun) {
    const { CATEGORIES, ALL_POSTS, SERVICES, PRICING_PLANS, WORKS, FAQS, TESTIMONIALS, TEAM_MEMBERS } = await import("./seed-data")
    const allCounts = { categories: CATEGORIES.length, posts: ALL_POSTS.length, services: SERVICES.length, pricing: PRICING_PLANS.length, works: WORKS.length, faqs: FAQS.length, testimonials: TESTIMONIALS.length, team: TEAM_MEMBERS.length, pages: 2 }
    return NextResponse.json({ dryRun: true, scope, would_seed: scope === "homepage" ? { pages: 2 } : allCounts, hint: "{ confirm: true, scope: 'homepage' } でホームページのみ実行" })
  }
  if (!body.confirm) return NextResponse.json({ error: "Send { confirm: true } to execute", hint: "{ dryRun: true } で内容確認" }, { status: 400 })

  try {
    const result = await seedAllContent(scope)
    const errors = Object.values(result).reduce((total, item) => total + item.errors, 0)
    return NextResponse.json({ success: errors === 0, scope, summary: result }, { status: errors === 0 ? 200 : 500 })
  } catch (e) {
    console.error("[seed-all-content] fatal:", e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
