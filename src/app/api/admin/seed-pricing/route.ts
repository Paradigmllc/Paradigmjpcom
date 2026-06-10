/**
 * /api/admin/seed-pricing — Pricing seed endpoint
 *
 * Payload `pricing` collection に web/meo/seo/ai 各3プランのシードデータを投入。
 * 既存の seed-services / seed-blog と同じパターンで実装。
 *
 * 認証: x-admin-secret ヘッダ必須 (env ADMIN_SCRIPT_SECRET)
 * 冪等性: serviceId + planName で既存チェック → upsert
 */

import { NextResponse } from "next/server"
import { getPayload } from "payload"
import config from "@payload-config"

export const dynamic = "force-dynamic"
export const maxDuration = 60

interface SeedPlan {
  serviceId: string
  planName: { ja: string; en: string }
  price: number
  currency: "jpy" | "usd"
  billingCycle: "monthly" | "yearly" | "one-time"
  description: { ja: string; en: string }
  features: { ja: string[]; en: string[] }
  isPopular: boolean
  ctaLabel: { ja: string; en: string }
  sortOrder: number
}

const PLANS: SeedPlan[] = [
  // ── Web ──
  {
    serviceId: "web", planName: { ja: "ライトプラン", en: "Light" },
    price: 298000, currency: "jpy", billingCycle: "one-time",
    description: { ja: "小規模サイト（5ページ以内）", en: "Small site (≤5 pages)" },
    features: {
      ja: ["トップページ+4ページ", "レスポンシブ対応", "SEO基本対策", "お問い合わせフォーム", "公開後1ヶ月サポート"],
      en: ["Home + 4 pages", "Responsive", "On-page SEO", "Contact form", "1 month support"],
    },
    isPopular: false, ctaLabel: { ja: "お問い合わせ", en: "Contact us" }, sortOrder: 1,
  },
  {
    serviceId: "web", planName: { ja: "スタンダード", en: "Standard" },
    price: 598000, currency: "jpy", billingCycle: "one-time",
    description: { ja: "中規模サイト（10ページ以内）", en: "Mid-size site (≤10 pages)" },
    features: {
      ja: ["トップページ+9ページ", "CMS導入（WordPress）", "SEO内部対策", "アニメーション実装", "写真撮影代行", "公開後3ヶ月サポート"],
      en: ["Home + 9 pages", "WordPress CMS", "On-page SEO", "Animations", "Photography", "3 month support"],
    },
    isPopular: true, ctaLabel: { ja: "お問い合わせ", en: "Contact us" }, sortOrder: 2,
  },
  {
    serviceId: "web", planName: { ja: "プレミアム", en: "Premium" },
    price: 980000, currency: "jpy", billingCycle: "one-time",
    description: { ja: "本格的なコーポレートサイト", en: "Full corporate site" },
    features: {
      ja: ["ページ数無制限", "Next.js/カスタム開発", "デザインカンプ3案", "多言語対応", "アクセス解析設定", "公開後6ヶ月サポート"],
      en: ["Unlimited pages", "Next.js custom dev", "3 design variants", "i18n", "Analytics setup", "6 month support"],
    },
    isPopular: false, ctaLabel: { ja: "お問い合わせ", en: "Contact us" }, sortOrder: 3,
  },
  // ── MEO ──
  {
    serviceId: "meo", planName: { ja: "エントリー", en: "Entry" },
    price: 29800, currency: "jpy", billingCycle: "monthly",
    description: { ja: "まず始めてみたい方", en: "Get started" },
    features: {
      ja: ["GBP初期最適化", "月2回投稿代行", "順位レポート（月次）", "口コミ返信テンプレ"],
      en: ["GBP setup", "2 posts/mo", "Monthly rank report", "Review reply templates"],
    },
    isPopular: false, ctaLabel: { ja: "お問い合わせ", en: "Contact us" }, sortOrder: 4,
  },
  {
    serviceId: "meo", planName: { ja: "スタンダード", en: "Standard" },
    price: 49800, currency: "jpy", billingCycle: "monthly",
    description: { ja: "本格的にMEOに取り組む方", en: "Serious about MEO" },
    features: {
      ja: ["GBP完全最適化", "月4回投稿代行", "写真最適化", "口コミ獲得施策", "週次レポート", "競合分析"],
      en: ["Full GBP optimisation", "4 posts/mo", "Photo curation", "Review playbook", "Weekly reports", "Competitor analysis"],
    },
    isPopular: true, ctaLabel: { ja: "お問い合わせ", en: "Contact us" }, sortOrder: 5,
  },
  {
    serviceId: "meo", planName: { ja: "プロ", en: "Pro" },
    price: 79800, currency: "jpy", billingCycle: "monthly",
    description: { ja: "複数店舗・エリア制覇", en: "Multi-store / regional" },
    features: {
      ja: ["複数店舗対応（3店舗まで）", "毎日投稿", "口コミ管理ツール", "SNS連携", "電話コンバージョン計測", "専任担当者"],
      en: ["Up to 3 stores", "Daily posts", "Review management tool", "Social sync", "Call conversion tracking", "Dedicated PM"],
    },
    isPopular: false, ctaLabel: { ja: "お問い合わせ", en: "Contact us" }, sortOrder: 6,
  },
  // ── SEO ──
  {
    serviceId: "seo", planName: { ja: "SEOベーシック", en: "SEO Basic" },
    price: 49800, currency: "jpy", billingCycle: "monthly",
    description: { ja: "内部SEO+コンテンツ", en: "On-page + content" },
    features: {
      ja: ["サイト診断・改善", "月2本記事作成", "キーワード調査", "月次レポート"],
      en: ["Site audit & fixes", "2 articles/mo", "Keyword research", "Monthly report"],
    },
    isPopular: false, ctaLabel: { ja: "お問い合わせ", en: "Contact us" }, sortOrder: 7,
  },
  {
    serviceId: "seo", planName: { ja: "SEO+GEO", en: "SEO + GEO" },
    price: 79800, currency: "jpy", billingCycle: "monthly",
    description: { ja: "SEO+AI検索対策", en: "SEO + AI-search" },
    features: {
      ja: ["SEOベーシック全機能", "AI検索最適化（GEO）", "構造化データ実装", "月4本記事作成", "競合分析"],
      en: ["All SEO Basic", "AI-search (GEO)", "Structured data", "4 articles/mo", "Competitor analysis"],
    },
    isPopular: true, ctaLabel: { ja: "お問い合わせ", en: "Contact us" }, sortOrder: 8,
  },
  {
    serviceId: "seo", planName: { ja: "フルパッケージ", en: "Full Package" },
    price: 148000, currency: "jpy", billingCycle: "monthly",
    description: { ja: "SEO+GEO+コンテンツ戦略", en: "SEO + GEO + strategy" },
    features: {
      ja: ["SEO+GEO全機能", "コンテンツ戦略設計", "月8本記事作成", "被リンク施策", "週次ミーティング", "Slack即対応"],
      en: ["All SEO+GEO", "Content strategy", "8 articles/mo", "Backlink campaigns", "Weekly meeting", "Slack response"],
    },
    isPopular: false, ctaLabel: { ja: "お問い合わせ", en: "Contact us" }, sortOrder: 9,
  },
  // ── AI ──
  {
    serviceId: "ai", planName: { ja: "AIスタート", en: "AI Start" },
    price: 198000, currency: "jpy", billingCycle: "one-time",
    description: { ja: "チャットボット1つ導入", en: "1 chatbot deployment" },
    features: {
      ja: ["AIチャットボット構築", "FAQ学習（100問）", "サイト埋め込み", "1ヶ月運用サポート"],
      en: ["AI chatbot build", "FAQ training (100 Qs)", "Site embed", "1 month support"],
    },
    isPopular: false, ctaLabel: { ja: "お問い合わせ", en: "Contact us" }, sortOrder: 10,
  },
  {
    serviceId: "ai", planName: { ja: "AI業務改革", en: "AI Transform" },
    price: 498000, currency: "jpy", billingCycle: "one-time",
    description: { ja: "業務プロセスのAI化", en: "Operations transformation" },
    features: {
      ja: ["業務フロー分析", "自動化ワークフロー3本", "AIチャットボット", "社内研修（2時間）", "3ヶ月サポート"],
      en: ["Workflow analysis", "3 automation flows", "AI chatbot", "2-hour training", "3 month support"],
    },
    isPopular: true, ctaLabel: { ja: "お問い合わせ", en: "Contact us" }, sortOrder: 11,
  },
  {
    serviceId: "ai", planName: { ja: "AIフル導入", en: "AI Full" },
    price: 980000, currency: "jpy", billingCycle: "one-time",
    description: { ja: "全社AI戦略+開発", en: "Org-wide AI strategy + build" },
    features: {
      ja: ["AI戦略コンサル", "カスタムAI開発", "自動化ワークフロー無制限", "データ分析基盤", "6ヶ月サポート", "専任エンジニア"],
      en: ["AI strategy consulting", "Custom AI dev", "Unlimited flows", "Analytics platform", "6 month support", "Dedicated engineer"],
    },
    isPopular: false, ctaLabel: { ja: "お問い合わせ", en: "Contact us" }, sortOrder: 12,
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
      would_seed: PLANS.map(p => ({ serviceId: p.serviceId, name_ja: p.planName.ja, name_en: p.planName.en })),
      total: PLANS.length,
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
  const results: Array<{ plan: string; action: "created" | "updated" | "error"; error?: string }> = []

  for (const plan of PLANS) {
    try {
      // 既存チェック (serviceId + planName で一意判定)
      const { docs: existing } = await payload.find({
        collection: "pricing",
        where: {
          and: [
            { serviceId: { equals: plan.serviceId } },
            { planName: { equals: plan.planName.ja } },
          ],
        },
        limit: 1,
        locale: "ja",
      })

      const baseData = {
        planName: plan.planName.ja,
        serviceId: plan.serviceId,
        price: plan.price,
        currency: plan.currency,
        billingCycle: plan.billingCycle,
        description: plan.description.ja,
        features: plan.features.ja.map(f => ({ feature: f, included: true })),
        isPopular: plan.isPopular,
        ctaLabel: plan.ctaLabel.ja,
        sortOrder: plan.sortOrder,
        availableLocales: ["ja", "en"],
      }

      const label = `${plan.serviceId}/${plan.planName.ja}`

      let docId: string | number
      if (existing.length > 0) {
        const updated = await payload.update({
          collection: "pricing",
          id: existing[0].id,
          data: baseData,
          locale: "ja",
        } as unknown as Parameters<typeof payload.update>[0]) as { id: string | number }
        docId = updated.id
        results.push({ plan: label, action: "updated" })
      } else {
        const created = await payload.create({
          collection: "pricing",
          data: baseData,
          locale: "ja",
        } as unknown as Parameters<typeof payload.create>[0]) as { id: string | number }
        docId = created.id
        results.push({ plan: label, action: "created" })
      }

      // ── EN locale を update ──
      await payload.update({
        collection: "pricing",
        id: docId,
        data: {
          planName: plan.planName.en,
          description: plan.description.en,
          features: plan.features.en.map(f => ({ feature: f, included: true })),
          ctaLabel: plan.ctaLabel.en,
        },
        locale: "en",
      })
    } catch (e) {
      results.push({ plan: `${plan.serviceId}/${plan.planName.ja}`, action: "error", error: (e as Error).message })
    }
  }

  return NextResponse.json({
    success: true,
    seeded: results,
    total_attempted: PLANS.length,
    total_ok: results.filter(r => r.action !== "error").length,
    total_errors: results.filter(r => r.action === "error").length,
  })
}
