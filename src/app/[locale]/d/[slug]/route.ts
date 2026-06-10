import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; slug: string }> },
) {
  const { slug } = await params
  return NextResponse.redirect(
    `https://paradigm-astro-demo.pages.dev/?slug=${encodeURIComponent(slug)}`,
    { status: 307 },
  )
}
