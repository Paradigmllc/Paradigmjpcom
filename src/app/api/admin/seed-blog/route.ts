/**
 * /api/admin/seed-blog — Migrate legacy BLOG_POSTS into PayloadCMS Posts collection
 *
 * 役割: lib/blog.ts BLOG_POSTS (4 件・JP-only seed) を PayloadCMS Posts に
 *       冪等 upsert する 1 回限りの管理エンドポイント。
 *
 * 認証: x-admin-secret ヘッダ必須 (env ADMIN_SCRIPT_SECRET)
 *
 * リクエスト:
 *   POST /api/admin/seed-blog
 *   Headers: { "x-admin-secret": "<env value>", "content-type": "application/json" }
 *   Body:    { confirm: true, dryRun?: false }
 *
 * 冪等性: slug 一意制約により既存 doc は update。新規は create。
 *
 * 永久ルール (AE-PHP-7): 新規記事は /admin → Posts collection で作成する
 *   フローへ完全移行。本 endpoint は legacy 移行フェーズの 1 回限りの bridge。
 */

import { NextRequest, NextResponse } from "next/server"
import { getPayload } from "payload"
import config from "@payload-config"
import { BLOG_POSTS } from "@/lib/blog"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

interface SeedRequest {
  confirm?: boolean
  dryRun?: boolean
}

export async function POST(req: NextRequest) {
  // Auth: x-admin-secret header check
  const secret = req.headers.get("x-admin-secret")
  const expected = process.env.ADMIN_SCRIPT_SECRET
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as SeedRequest
  if (!body.confirm) {
    return NextResponse.json(
      { error: "confirm: true required to execute seed" },
      { status: 400 },
    )
  }

  const dryRun = Boolean(body.dryRun)
  const results: Array<{ slug: string; action: "create" | "update" | "skip" | "error"; error?: string }> = []

  try {
    const payload = await getPayload({
      config: config as Parameters<typeof getPayload>[0]["config"],
    })

    for (const post of BLOG_POSTS) {
      try {
        // Check existing doc by slug
        const existing = await payload.find({
          collection: "posts",
          where: { slug: { equals: post.slug } },
          limit: 1,
        } as Parameters<typeof payload.find>[0])

        const tags = post.tags.map((t) => ({ tag: t }))
        const data = {
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          // content: richText を直接 JSON 形式で投入する代わりに excerpt のみ
          // (legacy の markdown 文字列は richText に変換が必要・P19 で実施)
          category: post.category,
          readTime: post.readTime,
          tags,
          status: "published" as const,
          publishedAt: new Date(post.date).toISOString(),
          availableLocales: ["ja"] as const,
        }

        if (dryRun) {
          results.push({ slug: post.slug, action: existing.docs[0] ? "update" : "create" })
          continue
        }

        if (existing.docs[0]) {
          await payload.update({
            collection: "posts",
            id: (existing.docs[0] as { id: string | number }).id,
            data: data as unknown as Parameters<typeof payload.update>[0]["data"],
          } as Parameters<typeof payload.update>[0])
          results.push({ slug: post.slug, action: "update" })
        } else {
          await payload.create({
            collection: "posts",
            data: data as unknown as Parameters<typeof payload.create>[0]["data"],
          } as Parameters<typeof payload.create>[0])
          results.push({ slug: post.slug, action: "create" })
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error(`[seed-blog] ${post.slug} failed:`, e)
        results.push({ slug: post.slug, action: "error", error: msg })
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      results,
      summary: {
        total: BLOG_POSTS.length,
        created: results.filter((r) => r.action === "create").length,
        updated: results.filter((r) => r.action === "update").length,
        errors: results.filter((r) => r.action === "error").length,
      },
    })
  } catch (e) {
    console.error("[seed-blog] fatal:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "fatal" },
      { status: 500 },
    )
  }
}
