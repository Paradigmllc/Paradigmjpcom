/**
 * paradigmjp.com /d/[slug] — 顧客向けデモページ (canonical)
 *
 * H-2-6 (2026-05-01): /d/[slug] デモを Paradigm-HP 単一所有化
 *   - 旧: appexx.me/d/[slug] → ユーザ制約 "appexx.me 顧客表示禁止" 違反
 *   - 新: paradigmjp.com/d/[slug] (Server Component で web_demos 直読・appexx.me 通信ゼロ)
 *
 * 2-layer 構成:
 *   - 本ファイル (Server Component): Supabase から html_content + name を server-side fetch
 *   - DemoClient (Client Component): iframe 描画 + ?name パーソナライズ + 滞在トラッキング
 */

import { createClient } from "@supabase/supabase-js"
import { notFound } from "next/navigation"
import DemoClient from "./DemoClient"

export const dynamic = "force-dynamic"
export const revalidate = 60 // SWR 60s — デモ更新後 1 分以内に反映

interface Demo {
  id: string
  slug: string
  name: string
  html_content: string | null
  html: string | null
  is_published: boolean
}

async function getDemo(slug: string): Promise<Demo | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  const sb = createClient(url, key, { auth: { persistSession: false } })
  const { data } = await sb
    .from("web_demos")
    .select("id, slug, name, html_content, html, is_published")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle()
  return data as Demo | null
}

export default async function PublicDemoPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const demo = await getDemo(slug)
  if (!demo) notFound()

  const html = demo.html_content || demo.html || ""
  if (!html) notFound()

  return (
    <DemoClient
      demoId={demo.id}
      slug={demo.slug}
      name={demo.name || "Demo"}
      html={html}
    />
  )
}
