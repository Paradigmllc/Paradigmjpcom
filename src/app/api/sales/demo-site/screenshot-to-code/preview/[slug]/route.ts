import { NextRequest, NextResponse } from "next/server"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { getServiceSalesSupabase } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const token = request.nextUrl.searchParams.get("token")
  if (!token || token.length > 100) return new NextResponse("Not found", { status: 404 })
  const sb = getServiceSalesSupabase()
  if (!sb) return new NextResponse("Preview unavailable", { status: 503 })

  const { data, error } = await sb
    .from(DB_TABLES.THEME_DEMO_PAGES)
    .select("meta")
    .eq("slug", slug)
    .maybeSingle()
  if (error) {
    console.error("[screenshot-to-code-preview] lookup failed:", error.message)
    return new NextResponse("Preview unavailable", { status: 503 })
  }
  const meta = data?.meta && typeof data.meta === "object" && !Array.isArray(data.meta) ? data.meta as Record<string, unknown> : {}
  const artifact = meta.screenshot_to_code && typeof meta.screenshot_to_code === "object" && !Array.isArray(meta.screenshot_to_code)
    ? meta.screenshot_to_code as Record<string, unknown>
    : null
  const expiresAt = artifact && typeof artifact.expires_at === "string" ? artifact.expires_at : null
  if (!artifact || artifact.preview_token !== token || typeof artifact.code !== "string" || artifact.status !== "review" || (expiresAt !== null && Date.parse(expiresAt) <= Date.now())) {
    return new NextResponse("Not found", { status: 404 })
  }

  return new NextResponse(artifact.code, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline' https:; img-src data: https:; font-src data: https:; script-src https://cdn.tailwindcss.com 'unsafe-inline'; connect-src 'none'; base-uri 'none'; form-action 'none'",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  })
}
