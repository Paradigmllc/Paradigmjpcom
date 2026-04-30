/**
 * /api/admin/seed-services — Services seed endpoint
 *
 * 2026-04-30 ユーザ指示「/en/services⇒404、JaaSが表示されていない」対応:
 *   /[locale]/services route 自体は存在するが、Payload CMS の services collection が
 *   空 (特に EN locale) のため "No services are currently published" 表示になる。
 *   本 endpoint は 5 サービス (JaaS / Web / MEO / SEO/GEO / AI) を JA + EN 両方で seed する。
 *
 * 認証:
 *   x-admin-secret ヘッダ必須 (env ADMIN_SCRIPT_SECRET)
 *   POST { confirm: true, dryRun?: false }
 *
 * 冪等性:
 *   slug 一意制約により重複 insert はせず upsert 動作 (既存 doc は update)
 */

import { NextResponse } from "next/server"
import { getPayload } from "payload"
import config from "@payload-config"

export const dynamic = "force-dynamic"
export const maxDuration = 60

interface SeedService {
  name: { ja: string; en: string }
  slug: string
  tagline: { ja: string; en: string }
  icon: string
  features: { ja: string[]; en: string[] }
  sortOrder: number
}

const SERVICES: SeedService[] = [
  {
    name: { ja: "Japan-as-a-Service (JaaS)", en: "Japan-as-a-Service (JaaS)" },
    slug: "jaas",
    tagline: { ja: "外国企業の日本市場参入を フルスタックで支援", en: "Full-stack market entry for foreign SMBs" },
    icon: "🌏",
    features: {
      ja: [
        "市場調査・競合分析（公開データ + AI 構造化）",
        "現地法人設立支援（弁護士・司法書士コーディネート）",
        "日本語 LP / EC 構築（多言語対応 + GEO 最適化）",
        "MEO / SEO / SNS 集客の現地運用代行",
        "請求書発行・経理代行（Stripe + 国内決済）",
        "日本人カスタマーサポート 24/7",
      ],
      en: [
        "Market & competitor research (public data + AI structuring)",
        "Local entity setup (legal & tax coordinator network)",
        "Japanese LP / e-commerce build (i18n + GEO-optimized)",
        "MEO / SEO / social ops as managed service",
        "Invoicing & accounting agency (Stripe + JP payments)",
        "Japanese-speaking customer support, 24/7",
      ],
    },
    sortOrder: 1,
  },
  {
    name: { ja: "Web 制作 (HP/LP/EC)", en: "Web Development (HP/LP/EC)" },
    slug: "web",
    tagline: { ja: "集客に強いモダンなビジネスサイト", en: "Modern conversion-focused websites" },
    icon: "🌐",
    features: {
      ja: ["レスポンシブ対応", "SEO 最適化", "問い合わせフォーム", "CMS 管理画面"],
      en: ["Responsive design", "SEO-optimized", "Contact forms", "CMS admin panel"],
    },
    sortOrder: 2,
  },
  {
    name: { ja: "MEO 対策（Google Maps）", en: "MEO (Local SEO)" },
    slug: "meo",
    tagline: { ja: "地域検索で上位表示を実現", en: "Top rankings in local search" },
    icon: "📍",
    features: {
      ja: ["Google ビジネスプロフィール最適化", "口コミ返信代行", "投稿運用", "順位レポート"],
      en: ["Google Business Profile optimization", "Review reply management", "Post operations", "Ranking reports"],
    },
    sortOrder: 3,
  },
  {
    name: { ja: "SEO / GEO 対策", en: "SEO / GEO" },
    slug: "seo",
    tagline: { ja: "検索 & AI 検索からの集客最大化", en: "Maximize traffic from search and AI engines" },
    icon: "🔍",
    features: {
      ja: ["キーワード戦略", "コンテンツ SEO", "テクニカル SEO", "GEO（ChatGPT/Perplexity）最適化", "月次レポート"],
      en: ["Keyword strategy", "Content SEO", "Technical SEO", "GEO (ChatGPT/Perplexity) optimization", "Monthly reports"],
    },
    sortOrder: 4,
  },
  {
    name: { ja: "AI 導入支援 / DX", en: "AI Enablement / DX" },
    slug: "ai",
    tagline: { ja: "AI で業務を革新", en: "Transform operations with AI" },
    icon: "🤖",
    features: {
      ja: ["業務分析・自動化設計", "Dify / n8n 構築", "DeepSeek V4 統合", "社内研修"],
      en: ["Process analysis & automation design", "Dify / n8n setup", "DeepSeek V4 integration", "In-house training"],
    },
    sortOrder: 5,
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
      would_seed: SERVICES.map(s => ({ slug: s.slug, name_ja: s.name.ja, name_en: s.name.en })),
      total: SERVICES.length,
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
  const payload = await getPayload({ config })
  const results: Array<{ slug: string; action: "created" | "updated" | "error"; error?: string }> = []

  for (const svc of SERVICES) {
    try {
      // 既存チェック (slug は unique)
      const { docs: existing } = await payload.find({
        collection: "services",
        where: { slug: { equals: svc.slug } },
        limit: 1,
      })

      // ── JA を作成 or update ──
      const baseDataJa = {
        name: svc.name.ja,
        slug: svc.slug,
        tagline: svc.tagline.ja,
        icon: svc.icon,
        features: svc.features.ja.map(f => ({ feature: f })),
        sortOrder: svc.sortOrder,
        availableLocales: ["ja", "en"],
        isActive: true,
      }

      let docId: string | number
      if (existing.length > 0) {
        // Payload v3 narrows `data` against the collection slug; the seed
        // shape (string availableLocales[]) widens slightly past the
        // generated Service type — cast as `unknown` then to the parameter
        // shape to bypass without an unsafe `any`.
        const updated = (await payload.update({
          collection: "services",
          id: existing[0].id,
          data: baseDataJa,
          locale: "ja",
        } as unknown as Parameters<typeof payload.update>[0])) as { id: string | number }
        docId = updated.id
        results.push({ slug: svc.slug, action: "updated" })
      } else {
        const created = (await payload.create({
          collection: "services",
          data: baseDataJa,
          locale: "ja",
        } as unknown as Parameters<typeof payload.create>[0])) as { id: string | number }
        docId = created.id
        results.push({ slug: svc.slug, action: "created" })
      }

      // ── EN locale を update (localized fields のみ) ──
      await payload.update({
        collection: "services",
        id: docId,
        data: {
          name: svc.name.en,
          tagline: svc.tagline.en,
          features: svc.features.en.map(f => ({ feature: f })),
        },
        locale: "en",
      })
    } catch (e) {
      results.push({ slug: svc.slug, action: "error", error: (e as Error).message })
    }
  }

  return NextResponse.json({
    success: true,
    seeded: results,
    total_attempted: SERVICES.length,
    total_ok: results.filter(r => r.action !== "error").length,
    total_errors: results.filter(r => r.action === "error").length,
  })
}
