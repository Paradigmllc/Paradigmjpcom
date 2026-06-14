/**
 * /api/admin/seed-posts — Additional blog post seed endpoint
 *
 * Payload `posts` collection に追加の5記事（JA+EN）を投入。
 * 既存の seed-blog が4件を seed 済みの前提で、不足トピックを補完。
 * content (richText) は admin UI での手動編集を前提にスキップ。
 *
 * 認証: x-admin-secret ヘッダ必須 (env ADMIN_SCRIPT_SECRET)
 * 冪等性: slug で既存チェック → upsert
 */

import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const maxDuration = 60

interface SeedPost {
  slug: string
  title: { ja: string; en: string }
  excerpt: { ja: string; en: string }
  category: { ja: string; en: string }
  readTime: { ja: string; en: string }
  tags: string[]
  date: string
  sortOrder: number
}

const POSTS: SeedPost[] = [
  {
    slug: "web-production-pitfalls",
    title: {
      ja: "Web制作で失敗しないための5つのポイント",
      en: "5 Tips to Avoid Web Development Pitfalls",
    },
    excerpt: {
      ja: "Webサイト制作でありがちな失敗パターン5つとその回避方法を解説。業者選び・要件定義・SEO・保守に至るまで、発注前に知っておくべきポイントをまとめました。",
      en: "Five common web development pitfalls and how to avoid them. From vendor selection to requirements, SEO, and maintenance — everything you need to know before commissioning a site.",
    },
    category: { ja: "Web制作", en: "Web Dev" },
    readTime: { ja: "6分", en: "6 min" },
    tags: ["Web制作", "発注", "失敗しない", "比較", "CMS"],
    date: "2025-05-10",
    sortOrder: 5,
  },
  {
    slug: "smb-digital-strategy-2025",
    title: {
      ja: "2025年 中小企業のためのデジタルマーケティング戦略",
      en: "2025 Digital Marketing Strategy for SMBs",
    },
    excerpt: {
      ja: "人手不足・コスト高の時代に中小企業が取るべきデジタルマーケティング戦略を解説。Web・MEO・SEO・AIを組み合わせた「少人数でも成果を出す」方法をお伝えします。",
      en: "How SMBs can thrive with digital marketing in an era of labour shortages and rising costs. A lean-team approach combining web, MEO, SEO, and AI for outsized results.",
    },
    category: { ja: "マーケティング", en: "Marketing" },
    readTime: { ja: "8分", en: "8 min" },
    tags: ["デジタルマーケティング", "中小企業", "戦略", "DX", "2025"],
    date: "2025-05-20",
    sortOrder: 6,
  },
  {
    slug: "seo-content-marketing-synergy",
    title: {
      ja: "SEOとコンテンツマーケティングの相乗効果を最大化する方法",
      en: "How to Maximise the Synergy of SEO and Content Marketing",
    },
    excerpt: {
      ja: "SEOとコンテンツマーケティングは別物ではありません。両者を組み合わせることで検索流入と成約率を最大化する方法を、具体的な手順とともに解説します。",
      en: "SEO and content marketing aren't separate disciplines. Here's how to combine them for maximum search traffic and conversion rates — with concrete, step-by-step guidance.",
    },
    category: { ja: "SEO/GEO", en: "SEO/GEO" },
    readTime: { ja: "7分", en: "7 min" },
    tags: ["SEO", "コンテンツマーケティング", "キーワード戦略", "ブログ"],
    date: "2025-06-01",
    sortOrder: 7,
  },
  {
    slug: "ai-chatbot-roi",
    title: {
      ja: "AIチャットボット導入の費用対効果（ROI）を試算する",
      en: "Calculating the ROI of AI Chatbot Deployment",
    },
    excerpt: {
      ja: "AIチャットボット導入にかかるコストと期待できるリターンを具体的な数字で試算。人件費削減・機会損失防止・顧客満足度向上の3軸で評価します。",
      en: "A concrete ROI breakdown of AI chatbot deployment costs vs. expected returns. Evaluated across three dimensions: labour cost savings, missed-opportunity prevention, and CSAT improvement.",
    },
    category: { ja: "AI", en: "AI" },
    readTime: { ja: "5分", en: "5 min" },
    tags: ["AI", "チャットボット", "ROI", "コスト削減", "自動化"],
    date: "2025-06-10",
    sortOrder: 8,
  },
  {
    slug: "video-marketing-cvr",
    title: {
      ja: "動画マーケティングでWebサイトの成約率を2倍にする方法",
      en: "How Video Marketing Can Double Your Website Conversion Rate",
    },
    excerpt: {
      ja: "LPやサービスページに動画を組み込むことで成約率がどう変わるのか。導入コスト・制作フロー・具体的な効果データを交えて解説します。月額サブスクリプション型動画制作の活用法も紹介。",
      en: "How embedding video on landing and service pages impacts conversion rates — with cost data, production workflows, and real effectiveness metrics. Plus, how subscription-based video production fits in.",
    },
    category: { ja: "動画マーケティング", en: "Video Marketing" },
    readTime: { ja: "6分", en: "6 min" },
    tags: ["動画", "CVR", "LP", "動画制作", "サブスク"],
    date: "2025-06-15",
    sortOrder: 9,
  },
]

export async function POST(req: Request) {
  // ─── 認証 ─────────────────────────────────────────
  const secret = req.headers.get("x-admin-secret")
  const expected = process.env.ADMIN_SCRIPT_SECRET
  if (!expected) {
    return NextResponse.json({ error: "ADMIN_SCRIPT_SECRET not configured" }, { status: 500 })
  }
  if (secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const dryRun = body.dryRun === true

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      would_seed: POSTS.map(p => ({ slug: p.slug, title_ja: p.title.ja, title_en: p.title.en })),
      total: POSTS.length,
      hint: "{ confirm: true } で実行",
    })
  }

  if (!body.confirm) {
    return NextResponse.json({
      error: "Send { confirm: true } to execute",
      hint: "{ dryRun: true } で内容確認・{ confirm: true } で seed 実行",
    }, { status: 400 })
  }

  // ─── 実行 ─────────────────────────────────────────
  const [{ getPayload }, { default: config }] = await Promise.all([
    import("payload"),
    import("@payload-config"),
  ])
  const payload = await getPayload({ config })
  const results: Array<{ slug: string; action: "created" | "updated" | "error"; error?: string }> = []

  for (const post of POSTS) {
    try {
      const { docs: existing } = await payload.find({
        collection: "posts",
        where: { slug: { equals: post.slug } },
        limit: 1,
      })

      const baseData = {
        title: post.title.ja,
        slug: post.slug,
        excerpt: post.excerpt.ja,
        category: post.category.ja,
        readTime: post.readTime.ja,
        tags: post.tags.map(t => ({ tag: t })),
        status: "published" as const,
        publishedAt: new Date(post.date).toISOString(),
        availableLocales: ["ja", "en"],
      }

      let docId: string | number
      if (existing.length > 0) {
        const updated = (await payload.update({
          collection: "posts",
          id: existing[0].id,
          data: baseData,
          locale: "ja",
        } as unknown as Parameters<typeof payload.update>[0])) as { id: string | number }
        docId = updated.id
        results.push({ slug: post.slug, action: "updated" })
      } else {
        const created = (await payload.create({
          collection: "posts",
          data: baseData,
          locale: "ja",
        } as unknown as Parameters<typeof payload.create>[0])) as { id: string | number }
        docId = created.id
        results.push({ slug: post.slug, action: "created" })
      }

      // ── EN locale を update ──
      await payload.update({
        collection: "posts",
        id: docId,
        data: {
          title: post.title.en,
          excerpt: post.excerpt.en,
          category: post.category.en,
          readTime: post.readTime.en,
        },
        locale: "en",
      } as unknown as Parameters<typeof payload.update>[0])
    } catch (e) {
      results.push({ slug: post.slug, action: "error", error: (e as Error).message })
    }
  }

  return NextResponse.json({
    success: true,
    seeded: results,
    total_attempted: POSTS.length,
    total_ok: results.filter(r => r.action !== "error").length,
    total_errors: results.filter(r => r.action === "error").length,
  })
}
