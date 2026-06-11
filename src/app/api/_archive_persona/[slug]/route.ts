/**
 * GET /api/persona/[slug] — Persona-as-Data layer (B36-P7B).
 *
 * 背景 (2026-05-10 ユーザー指示 + ElizaOS 研究結果):
 *   ElizaOS は autonomous chat agent runtime であり character file registry ではない
 *   (GET /api/agents/{id} は metadata のみ返却・bio/system 不在). RAM 1.5-4GB 占有 +
 *   Coolify 29+ サービス間でメモリ不足再発確実. → ElizaOS 不採用 → Persona-as-Data に pivot.
 *
 * 用途:
 *   Dify Cloud workflow が HTTP node で本 endpoint を fetch → workflow の system prompt
 *   テンプレ変数 ({{persona.system}} / {{persona.tone}} / {{persona.vocab_banned}} 等) に
 *   inject. これにより 全 customer-facing LLM output (診断レポート / 営業資料 / フォーム文面 /
 *   Stage 2 brief) で Paradigm シニアアドバイザー persona が一貫.
 *
 * 5 layer architecture (2026-05-10 確定):
 *   Memory   = Supabase (paradigm_personas + leads + cms_content_blocks)
 *   Brain    = Dify Cloud (workflow + DeepSeek V4)
 *   Persona  = 本 endpoint (Supabase row + Dify HTTP fetch + system prompt inject)
 *   Tool-use = Hermes Agent
 *   Execute  = n8n + Playwright + Crawlee/Crawl4AI
 *
 * 設計原則 (永久ルール A-CONTENT):
 *   - persona は DB 化 (admin が CMS で編集可能・hardcode 禁止)
 *   - vocab_banned は LLM に「禁止語彙」として inject (主訴/処方箋/経過観察 等)
 *   - vocab_allowed は「使うべき語彙」として hint
 *   - locale 必須 (ja=日本語 advisor / en=English advisor / etc.)
 */

import { NextResponse } from "next/server";
import { getMvpSupabase } from "@/lib/mvp/supabase";
import { DB_TABLES } from "@/lib/sales/db-tables"

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface PersonaRow {
  slug: string;
  name: string;
  locale: string;
  system_prompt: string;
  tone: string;
  vocab_allowed: string[];
  vocab_banned: string[];
  style_examples: Array<{ paragraph: string; why_good: string }>;
  is_active: boolean;
  version: number;
  updated_at: string;
}

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!slug || slug.length > 80 || !/^[a-z0-9_-]+$/.test(slug)) {
    return NextResponse.json({ ok: false, error: "invalid slug" }, { status: 400 });
  }

  const sb = getMvpSupabase();
  const { data, error } = await sb
    .from(DB_TABLES.PARADIGM_PERSONAS)
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "persona not found" }, { status: 404 });
  }

  const row = data as PersonaRow;

  // Cache 60s — persona changes are rare (admin edit), Dify cache 効率向上
  return NextResponse.json(
    {
      ok: true,
      slug: row.slug,
      name: row.name,
      locale: row.locale,
      version: row.version,
      // Dify HTTP node が直接 inject できる shape
      system: row.system_prompt,
      tone: row.tone,
      vocab_allowed: row.vocab_allowed,
      vocab_banned: row.vocab_banned,
      style_examples: row.style_examples,
      // Composite: Dify が 1 変数で済むよう連結プロンプトも提供
      injection_payload: buildInjectionPayload(row),
      updated_at: row.updated_at,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}

/**
 * Dify workflow が `{{persona.injection_payload}}` 1 変数を system prompt に貼るだけで
 * 全 persona 制約が effective になるよう、4 部品を整形した文字列を生成.
 */
function buildInjectionPayload(row: PersonaRow): string {
  const banned = row.vocab_banned.length
    ? row.vocab_banned.map((v) => `「${v}」`).join("・")
    : "(なし)";
  const allowed = row.vocab_allowed.length
    ? row.vocab_allowed.slice(0, 12).map((v) => `「${v}」`).join("・")
    : "(なし)";
  return [
    `# Persona: ${row.name} (locale=${row.locale}, version=${row.version})`,
    "",
    row.system_prompt,
    "",
    `## トーン: ${row.tone}`,
    "",
    `## 🚨 禁止語彙 (使用厳禁・違反時は server-side で reject):`,
    banned,
    "",
    `## ✅ 推奨語彙 (積極的に使う):`,
    allowed,
    "",
    `## スタイル例 (参考):`,
    ...row.style_examples.slice(0, 2).map((ex, i) => `(例 ${i + 1}) ${ex.paragraph}`),
  ].join("\n");
}
