import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * Demo site proxy redirect.
 * Redirects /{locale}/d/{slug} → Astro SSR demo server.
 *
 * Post-migration (2026-06-18): points to Hetzner-hosted Astro SSR
 * instead of Cloudflare Pages. Env ASTRO_DEMO_BASE_URL controls target.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; slug: string }> },
) {
  const { locale, slug } = await params
  const baseUrl = process.env.ASTRO_DEMO_BASE_URL || "https://demo.paradigmjp.com"
  return NextResponse.redirect(
    `${baseUrl}/demo/${encodeURIComponent(slug)}?lang=${locale}`,
    { status: 307 },
  )
}
