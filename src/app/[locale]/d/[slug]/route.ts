import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * Demo site proxy redirect.
 * Redirects /{locale}/d/{slug} → Next.js full-stack demo page.
 *
 * Post-migration (2026-06-22): now routes to the Next.js demo page
 * instead of the Astro SSR container. The Astro container (astro-demo)
 * has been replaced by the full-stack Next.js demo at /[locale]/demo/[slug].
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; slug: string }> },
) {
  const { locale, slug } = await params
  // Strip the "-demo" suffix if present to match the demo page slug
  const cleanSlug = slug.replace(/-demo$/, "")
  return NextResponse.redirect(
    new URL(`/${locale}/demo/${encodeURIComponent(cleanSlug)}`, _request.url),
    { status: 307 },
  )
}
