import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { createAdminSessionToken, verifyAdminSessionToken } from "@/lib/admin-auth"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

// 認証チェック
function getAdminPassword(): string | null {
  const pw = process.env.ADMIN_PASSWORD
  if (!pw || pw.length < 16) {
    console.error("[admin] ADMIN_PASSWORD must be configured with at least 16 characters")
    return null
  }
  return pw
}

function isAuthenticated(req: NextRequest): boolean {
  const password = getAdminPassword()
  if (!password) return false
  const token = req.cookies.get("paradigm_admin_token")?.value
  return Boolean(password && verifyAdminSessionToken(token))
}

function setAdminSession(res: NextResponse): NextResponse {
  const token = createAdminSessionToken()
  if (!token) return NextResponse.json({ error: "管理者セッションが設定されていません" }, { status: 500 })
  res.cookies.set("paradigm_admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  })
  return res
}

// 認証ミドルウェア
function unauthorized() {
  return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
}

// ═══ POST: 管理CRUD API ═══
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, ...params } = body

    // ─── 認証不要アクション（login / logout）───
    if (action === "login") {
      const rateLimit = checkRateLimit({ ip: getClientIp(req), key: "admin-login", max: 5, windowMs: 60_000 })
      if (!rateLimit.ok) {
        return NextResponse.json({ error: "ログイン試行が多すぎます" }, { status: 429, headers: { "Retry-After": "60" } })
      }
      const password = getAdminPassword()
      if (!password) {
        return NextResponse.json({ error: "管理者認証が設定されていません" }, { status: 500 })
      }
      if (params.password !== password) {
        return NextResponse.json({ error: "パスワードが違います" }, { status: 401 })
      }
      return setAdminSession(NextResponse.json({ success: true }))
    }

    if (action === "logout") {
      const res = NextResponse.json({ success: true })
      res.cookies.delete("paradigm_admin_token")
      return res
    }

    // ─── 以降は認証必須 ───
    if (!isAuthenticated(req)) return unauthorized()

    const db = getServiceSupabase()
    if (!db) return NextResponse.json({ error: "DB接続エラー" }, { status: 500 })

    switch (action) {

      // ═══ ダッシュボード統計 ═══
      case "dashboard_stats": {
        const [posts, services, faqs, leads] = await Promise.all([
          db.from(DB_TABLES.CMS_POSTS).select("id", { count: "exact", head: true }),
          db.from(DB_TABLES.CMS_SERVICES).select("id", { count: "exact", head: true }),
          db.from(DB_TABLES.CMS_FAQS).select("id", { count: "exact", head: true }),
          db.from(DB_TABLES.LEADS).select("id", { count: "exact", head: true }).eq("source", "paradigmjp.com"),
        ])
        return NextResponse.json({
          posts: posts.count || 0,
          services: services.count || 0,
          faqs: faqs.count || 0,
          leads: leads.count || 0,
        })
      }

      // ═══ ブログ記事 ═══
      case "list_posts": {
        const { data, error } = await db.from(DB_TABLES.CMS_POSTS).select("*").order("created_at", { ascending: false }).limit(500)
        if (error) {
          console.error("[admin] list_posts failed:", error.message)
          return NextResponse.json({ error: "Internal server error" }, { status: 500 })
        }
        return NextResponse.json({ posts: data || [] })
      }
      case "get_post": {
        const { data, error } = await db.from(DB_TABLES.CMS_POSTS).select("*").eq("id", params.id).single()
        if (error) {
          console.error("[admin] get_post failed:", error.message)
          return NextResponse.json({ error: "Internal server error" }, { status: 500 })
        }
        return NextResponse.json({ post: data })
      }
      case "create_post": {
        const { data, error } = await db.from(DB_TABLES.CMS_POSTS).insert({
          slug: params.slug,
          title: params.title,
          excerpt: params.excerpt || "",
          content: params.content || "",
          category: params.category || "",
          tags: params.tags || [],
          read_time: params.read_time || "5分",
          status: params.status || "draft",
          published_at: params.status === "published" ? new Date().toISOString() : null,
        }).select().single()
        if (error) {
          console.error("[admin] create_post failed:", error.message)
          return NextResponse.json({ error: "Internal server error" }, { status: 500 })
        }
        return NextResponse.json({ post: data })
      }
      case "update_post": {
        const updates: Record<string, unknown> = { ...params, updated_at: new Date().toISOString() }
        delete updates.id
        delete updates.action
        if (updates.status === "published" && !params.published_at) {
          updates.published_at = new Date().toISOString()
        }
        const { data, error } = await db.from(DB_TABLES.CMS_POSTS).update(updates).eq("id", params.id).select().single()
        if (error) {
          console.error("[admin] update_post failed:", error.message)
          return NextResponse.json({ error: "Internal server error" }, { status: 500 })
        }
        return NextResponse.json({ post: data })
      }
      case "delete_post": {
        const { error } = await db.from(DB_TABLES.CMS_POSTS).delete().eq("id", params.id)
        if (error) {
          console.error("[admin] delete_post failed:", error.message)
          return NextResponse.json({ error: "Internal server error" }, { status: 500 })
        }
        return NextResponse.json({ success: true })
      }

      // ═══ サービス ═══
      case "list_services": {
        const { data } = await db.from(DB_TABLES.CMS_SERVICES).select("*").order("sort_order").limit(500)
        return NextResponse.json({ services: data || [] })
      }
      case "update_service": {
        const updates: Record<string, unknown> = { ...params, updated_at: new Date().toISOString() }
        delete updates.id; delete updates.action
        const { data, error } = await db.from(DB_TABLES.CMS_SERVICES).update(updates).eq("id", params.id).select().single()
        if (error) {
          console.error("[admin] update_service failed:", error.message)
          return NextResponse.json({ error: "Internal server error" }, { status: 500 })
        }
        return NextResponse.json({ service: data })
      }

      // ═══ 料金 ═══
      case "list_pricing": {
        const { data } = await db.from(DB_TABLES.CMS_PRICING).select("*").order("service_id").order("sort_order").limit(500)
        return NextResponse.json({ pricing: data || [] })
      }
      case "update_pricing": {
        const updates: Record<string, unknown> = { ...params, updated_at: new Date().toISOString() }
        delete updates.id; delete updates.action
        const { data, error } = await db.from(DB_TABLES.CMS_PRICING).update(updates).eq("id", params.id).select().single()
        if (error) {
          console.error("[admin] update_pricing failed:", error.message)
          return NextResponse.json({ error: "Internal server error" }, { status: 500 })
        }
        return NextResponse.json({ plan: data })
      }

      // ═══ FAQ ═══
      case "list_faqs": {
        const { data } = await db.from(DB_TABLES.CMS_FAQS).select("*").order("sort_order").limit(500)
        return NextResponse.json({ faqs: data || [] })
      }
      case "create_faq": {
        const { count } = await db.from(DB_TABLES.CMS_FAQS).select("id", { count: "exact", head: true })
        const { data, error } = await db.from(DB_TABLES.CMS_FAQS).insert({
          question: params.question,
          answer: params.answer,
          sort_order: (count || 0) + 1,
        }).select().single()
        if (error) {
          console.error("[admin] create_faq failed:", error.message)
          return NextResponse.json({ error: "Internal server error" }, { status: 500 })
        }
        return NextResponse.json({ faq: data })
      }
      case "update_faq": {
        const updates: Record<string, unknown> = { ...params, updated_at: new Date().toISOString() }
        delete updates.id; delete updates.action
        const { error } = await db.from(DB_TABLES.CMS_FAQS).update(updates).eq("id", params.id)
        if (error) {
          console.error("[admin] update_faq failed:", error.message)
          return NextResponse.json({ error: "Internal server error" }, { status: 500 })
        }
        return NextResponse.json({ success: true })
      }
      case "delete_faq": {
        const { error } = await db.from(DB_TABLES.CMS_FAQS).delete().eq("id", params.id)
        if (error) {
          console.error("[admin] delete_faq failed:", error.message)
          return NextResponse.json({ error: "Internal server error" }, { status: 500 })
        }
        return NextResponse.json({ success: true })
      }
      case "reorder_faqs": {
        const updates = params.ids.map((id: string, idx: number) => ({
          id,
          sort_order: idx + 1,
          updated_at: new Date().toISOString(),
        }))
        const { error } = await db.from(DB_TABLES.CMS_FAQS).upsert(updates)
        if (error) {
          console.error("[admin] reorder_faqs failed:", error.message)
          return NextResponse.json({ error: "Internal server error" }, { status: 500 })
        }
        return NextResponse.json({ success: true })
      }

      // ═══ 実績 ═══
      case "list_works": {
        const { data } = await db.from(DB_TABLES.CMS_WORKS).select("*").order("sort_order").limit(500)
        return NextResponse.json({ works: data || [] })
      }
      case "create_work": {
        const { count } = await db.from(DB_TABLES.CMS_WORKS).select("id", { count: "exact", head: true })
        const { data, error } = await db.from(DB_TABLES.CMS_WORKS).insert({
          title: params.title,
          industry: params.industry,
          description: params.description,
          metrics: params.metrics,
          tags: params.tags || [],
          color: params.color || "indigo",
          sort_order: (count || 0) + 1,
        }).select().single()
        if (error) {
          console.error("[admin] create_work failed:", error.message)
          return NextResponse.json({ error: "Internal server error" }, { status: 500 })
        }
        return NextResponse.json({ work: data })
      }
      case "update_work": {
        const updates: Record<string, unknown> = { ...params, updated_at: new Date().toISOString() }
        delete updates.id; delete updates.action
        const { error } = await db.from(DB_TABLES.CMS_WORKS).update(updates).eq("id", params.id)
        if (error) {
          console.error("[admin] update_work failed:", error.message)
          return NextResponse.json({ error: "Internal server error" }, { status: 500 })
        }
        return NextResponse.json({ success: true })
      }
      case "delete_work": {
        const { error } = await db.from(DB_TABLES.CMS_WORKS).delete().eq("id", params.id)
        if (error) {
          console.error("[admin] delete_work failed:", error.message)
          return NextResponse.json({ error: "Internal server error" }, { status: 500 })
        }
        return NextResponse.json({ success: true })
      }

      // ═══ リード（問い合わせ） ═══
      case "list_leads": {
        const { data } = await db.from(DB_TABLES.LEADS).select("*")
          .eq("source", "paradigmjp.com")
          .order("created_at", { ascending: false })
          .limit(100)
        return NextResponse.json({ leads: data || [] })
      }
      case "update_lead_status": {
        const { error } = await db.from(DB_TABLES.LEADS).update({ pipeline_stage: params.status }).eq("id", params.id)
        if (error) {
          console.error("[admin] update_lead_status failed:", error.message)
          return NextResponse.json({ error: "Internal server error" }, { status: 500 })
        }
        return NextResponse.json({ success: true })
      }

      // ═══ 設定 ═══
      case "get_settings": {
        const { data } = await db.from(DB_TABLES.CMS_SETTINGS).select("*").limit(500)
        const settings: Record<string, unknown> = {}
        data?.forEach(row => { settings[row.key] = row.value })
        return NextResponse.json({ settings })
      }
      case "save_setting": {
        const { error } = await db.from(DB_TABLES.CMS_SETTINGS).upsert(
          { key: params.key, value: params.value, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        )
        if (error) {
          console.error("[admin] save_setting failed:", error.message)
          return NextResponse.json({ error: "Internal server error" }, { status: 500 })
        }
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: `不明なアクション: ${action}` }, { status: 400 })
    }
  } catch (e) {
    console.error("[admin] POST error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ═══ GET: 認証不要のログインチェック ═══
export async function GET(req: NextRequest) {
  // 認証チェック（ログイン状態確認用）
  if (isAuthenticated(req)) {
    return NextResponse.json({ authenticated: true })
  }
  return NextResponse.json({ authenticated: false }, { status: 401 })
}
