/**
 * Seed the English Japan Entry editorial set.
 *
 * This is an authenticated, idempotent admin action. It is intentionally
 * separate from the legacy all-content seed so publishing these articles
 * cannot reintroduce unrelated low-price or generic agency copy.
 */

import { NextResponse } from "next/server"
import { JAPAN_ENTRY_BLOG_POSTS, textToLexical } from "@/lib/japan-entry-blog"

export const dynamic = "force-dynamic"
export const maxDuration = 60

type SeedRequest = { confirm?: boolean; dryRun?: boolean }

export async function POST(req: Request) {
  const expected = process.env.ADMIN_SCRIPT_SECRET
  const provided = req.headers.get("x-admin-secret")
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const body = (await req.json().catch((error: unknown) => {
    console.error("[seed-japan-entry-blog] invalid request body", error)
    return {}
  })) as SeedRequest

  if (body.dryRun) {
    return NextResponse.json({
      dryRun: true,
      total: JAPAN_ENTRY_BLOG_POSTS.length,
      posts: JAPAN_ENTRY_BLOG_POSTS.map(({ slug, title }) => ({ slug, title })),
    })
  }

  if (body.confirm !== true) {
    return NextResponse.json({ error: "confirm: true required" }, { status: 400 })
  }

  try {
    const [{ getPayload }, { default: config }] = await Promise.all([
      import("payload"),
      import("@payload-config"),
    ])
    const payload = await getPayload({ config })
    const results: Array<{ slug: string; action: "created" | "updated" | "error"; error?: string }> = []

    for (const post of JAPAN_ENTRY_BLOG_POSTS) {
      try {
        const existing = await payload.find({
          collection: "posts",
          where: { slug: { equals: post.slug } },
          limit: 1,
        })
        const data = {
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: textToLexical(post.content),
          category: post.category,
          readTime: post.readTime,
          tags: post.tags.map((tag) => ({ tag })),
          status: "published" as const,
          _status: "published" as const,
          publishedAt: new Date(post.publishedAt).toISOString(),
          availableLocales: ["ja", "en"],
        }

        if (existing.docs.length > 0) {
          await payload.update({
            collection: "posts",
            id: existing.docs[0].id,
            data,
            locale: "ja",
          } as unknown as Parameters<typeof payload.update>[0])
          await payload.update({
            collection: "posts",
            id: existing.docs[0].id,
            data,
            locale: "en",
          } as unknown as Parameters<typeof payload.update>[0])
          results.push({ slug: post.slug, action: "updated" })
        } else {
          const created = await payload.create({
            collection: "posts",
            data,
            locale: "ja",
          } as unknown as Parameters<typeof payload.create>[0])
          await payload.update({
            collection: "posts",
            id: created.id,
            data,
            locale: "en",
          } as unknown as Parameters<typeof payload.update>[0])
          results.push({ slug: post.slug, action: "created" })
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`[seed-japan-entry-blog] ${post.slug} failed`, error)
        results.push({ slug: post.slug, action: "error", error: message })
      }
    }

    const errors = results.filter((result) => result.action === "error")
    return NextResponse.json({
      success: errors.length === 0,
      total: JAPAN_ENTRY_BLOG_POSTS.length,
      created: results.filter((result) => result.action === "created").length,
      updated: results.filter((result) => result.action === "updated").length,
      errors,
    }, { status: errors.length === 0 ? 200 : 500 })
  } catch (error: unknown) {
    console.error("[seed-japan-entry-blog] fatal", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "fatal" }, { status: 500 })
  }
}
