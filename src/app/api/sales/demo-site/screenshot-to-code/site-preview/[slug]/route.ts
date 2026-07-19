import { NextRequest, NextResponse } from "next/server"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { getServiceSalesSupabase } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function pageCode(value: unknown, pageId: string | null): string | null {
  if (!Array.isArray(value)) return null
  const pages = value.filter((page): page is Record<string, unknown> => page && typeof page === "object" && !Array.isArray(page))
  const selected = pageId ? pages.find((page) => page.id === pageId) : pages[0]
  return selected && typeof selected.code === "string" ? selected.code : null
}

function withPreviewNavigation(code: string, pages: Array<Record<string, unknown>>, token: string, slug: string): string {
  const pathMap = Object.fromEntries(pages.flatMap((page) => typeof page.path === "string" && typeof page.id === "string" ? [[page.path, page.id]] : []))
  const safeMap = JSON.stringify(pathMap).replace(/</gu, "\\u003c")
  const safeToken = JSON.stringify(token).replace(/</gu, "\\u003c")
  const safeSlug = JSON.stringify(slug).replace(/</gu, "\\u003c")
  const script = `<script>(function(){const map=${safeMap},token=${safeToken},slug=${safeSlug};document.addEventListener('click',function(event){const anchor=event.target instanceof Element?event.target.closest('a'):null;if(!anchor||anchor.target==='_blank')return;try{const url=new URL(anchor.href,location.href);const page=map[url.pathname];if(!page)return;event.preventDefault();location.href='/api/sales/demo-site/screenshot-to-code/site-preview/'+encodeURIComponent(slug)+'?token='+encodeURIComponent(token)+'&page='+encodeURIComponent(page)}catch(error){console.error('[site-preview] navigation failed',error)}})})()</script>`
  return code.includes("</body>") ? code.replace("</body>", `${script}</body>`) : `${code}${script}`
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const token = request.nextUrl.searchParams.get("token")
  const pageId = request.nextUrl.searchParams.get("page")
  if (!token || token.length > 100) return new NextResponse("Not found", { status: 404 })
  const sb = getServiceSalesSupabase()
  if (!sb) return new NextResponse("Preview unavailable", { status: 503 })
  const { data, error } = await sb.from(DB_TABLES.THEME_DEMO_PAGES).select("meta").eq("slug", slug).maybeSingle()
  if (error) {
    console.error("[site-reproduction-preview] lookup failed:", error.message)
    return new NextResponse("Preview unavailable", { status: 503 })
  }
  const artifact = asRecord(asRecord(data?.meta).screenshot_to_code_site)
  const expiresAt = typeof artifact.expires_at === "string" ? artifact.expires_at : null
  const code = pageCode(artifact.pages, pageId)
  if (!artifact || artifact.preview_token !== token || !code || !["review", "quality_review"].includes(String(artifact.status)) || (expiresAt !== null && Date.parse(expiresAt) <= Date.now())) {
    return new NextResponse("Not found", { status: 404 })
  }
  const pages = Array.isArray(artifact.pages) ? artifact.pages.filter((page): page is Record<string, unknown> => page && typeof page === "object" && !Array.isArray(page)) : []
  const renderedCode = withPreviewNavigation(code, pages, token, slug)
  return new NextResponse(renderedCode, {
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
