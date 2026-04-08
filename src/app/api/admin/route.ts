import { NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"

// 認証チェック
function isAuthenticated(req: NextRequest): boolean {
  const token = req.cookies.get("paradigm_admin_token")?.value
  return token === (process.env.ADMIN_PASSWORD || "paradigm-admin-2025")
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
      const password = process.env.ADMIN_PASSWORD || "paradigm-admin-2025"
      if (params.password !== password) {
        return NextResponse.json({ error: "パスワードが違います" }, { status: 401 })
      }
      const res = NextResponse.json({ success: true })
      res.cookies.set("paradigm_admin_token", password, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      })
      return res
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
          db.from("cms_posts").select("id", { count: "exact", head: true }),
          db.from("cms_services").select("id", { count: "exact", head: true }),
          db.from("cms_faqs").select("id", { count: "exact", head: true }),
          db.from("leads").select("id", { count: "exact", head: true }).eq("source", "paradigmjp.com"),
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
        const { data, error } = await db.from("cms_posts").select("*").order("created_at", { ascending: false })
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ posts: data || [] })
      }
      case "get_post": {
        const { data, error } = await db.from("cms_posts").select("*").eq("id", params.id).single()
        if (error) return NextResponse.json({ error: error.message }, { status: 404 })
        return NextResponse.json({ post: data })
      }
      case "create_post": {
        const { data, error } = await db.from("cms_posts").insert({
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
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ post: data })
      }
      case "update_post": {
        const updates: Record<string, unknown> = { ...params, updated_at: new Date().toISOString() }
        delete updates.id
        delete updates.action
        if (updates.status === "published" && !params.published_at) {
          updates.published_at = new Date().toISOString()
        }
        const { data, error } = await db.from("cms_posts").update(updates).eq("id", params.id).select().single()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ post: data })
      }
      case "delete_post": {
        const { error } = await db.from("cms_posts").delete().eq("id", params.id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
      }

      // ═══ サービス ═══
      case "list_services": {
        const { data } = await db.from("cms_services").select("*").order("sort_order")
        return NextResponse.json({ services: data || [] })
      }
      case "update_service": {
        const updates: Record<string, unknown> = { ...params, updated_at: new Date().toISOString() }
        delete updates.id; delete updates.action
        const { data, error } = await db.from("cms_services").update(updates).eq("id", params.id).select().single()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ service: data })
      }

      // ═══ 料金 ═══
      case "list_pricing": {
        const { data } = await db.from("cms_pricing").select("*").order("service_id").order("sort_order")
        return NextResponse.json({ pricing: data || [] })
      }
      case "update_pricing": {
        const updates: Record<string, unknown> = { ...params, updated_at: new Date().toISOString() }
        delete updates.id; delete updates.action
        const { data, error } = await db.from("cms_pricing").update(updates).eq("id", params.id).select().single()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ plan: data })
      }

      // ═══ FAQ ═══
      case "list_faqs": {
        const { data } = await db.from("cms_faqs").select("*").order("sort_order")
        return NextResponse.json({ faqs: data || [] })
      }
      case "create_faq": {
        const { count } = await db.from("cms_faqs").select("id", { count: "exact", head: true })
        const { data, error } = await db.from("cms_faqs").insert({
          question: params.question,
          answer: params.answer,
          sort_order: (count || 0) + 1,
        }).select().single()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ faq: data })
      }
      case "update_faq": {
        const updates: Record<string, unknown> = { ...params, updated_at: new Date().toISOString() }
        delete updates.id; delete updates.action
        const { error } = await db.from("cms_faqs").update(updates).eq("id", params.id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
      }
      case "delete_faq": {
        const { error } = await db.from("cms_faqs").delete().eq("id", params.id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
      }
      case "reorder_faqs": {
        for (let i = 0; i < params.ids.length; i++) {
          await db.from("cms_faqs").update({ sort_order: i + 1 }).eq("id", params.ids[i])
        }
        return NextResponse.json({ success: true })
      }

      // ═══ 実績 ═══
      case "list_works": {
        const { data } = await db.from("cms_works").select("*").order("sort_order")
        return NextResponse.json({ works: data || [] })
      }
      case "create_work": {
        const { count } = await db.from("cms_works").select("id", { count: "exact", head: true })
        const { data, error } = await db.from("cms_works").insert({
          title: params.title,
          industry: params.industry,
          description: params.description,
          metrics: params.metrics,
          tags: params.tags || [],
          color: params.color || "indigo",
          sort_order: (count || 0) + 1,
        }).select().single()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ work: data })
      }
      case "update_work": {
        const updates: Record<string, unknown> = { ...params, updated_at: new Date().toISOString() }
        delete updates.id; delete updates.action
        const { error } = await db.from("cms_works").update(updates).eq("id", params.id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
      }
      case "delete_work": {
        const { error } = await db.from("cms_works").delete().eq("id", params.id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
      }

      // ═══ リード（問い合わせ） ═══
      case "list_leads": {
        const { data } = await db.from("leads").select("*")
          .eq("source", "paradigmjp.com")
          .order("created_at", { ascending: false })
          .limit(100)
        return NextResponse.json({ leads: data || [] })
      }
      case "update_lead_status": {
        const { error } = await db.from("leads").update({ pipeline_stage: params.status }).eq("id", params.id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
      }

      // ═══ 設定 ═══
      case "get_settings": {
        const { data } = await db.from("cms_settings").select("*")
        const settings: Record<string, unknown> = {}
        data?.forEach(row => { settings[row.key] = row.value })
        return NextResponse.json({ settings })
      }
      case "save_setting": {
        const { error } = await db.from("cms_settings").upsert(
          { key: params.key, value: params.value, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        )
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: `不明なアクション: ${action}` }, { status: 400 })
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// ═══ GET: 認証不要のログインチェック ═══
export async function GET(req: NextRequest) {
  // 認証チェック（ログイン状態確認用）
  if (isAuthenticated(req)) {
    return NextResponse.json({ authenticated: true })
  }
  // ログイン用パスワード認証
  const pw = req.nextUrl.searchParams.get("password")
  if (pw) {
    const password = process.env.ADMIN_PASSWORD || "paradigm-admin-2025"
    if (pw === password) {
      const res = NextResponse.json({ authenticated: true })
      res.cookies.set("paradigm_admin_token", password, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      })
      return res
    }
  }
  return NextResponse.json({ authenticated: false }, { status: 401 })
}
