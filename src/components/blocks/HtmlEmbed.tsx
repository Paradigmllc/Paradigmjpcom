// ─── HtmlEmbedBlock — Block 構造に legacy HTML を埋め込む ──────────
// Phase 3-A (2026-05-01)
//
// 用途:
//   - web_demos.html_content 等の既存 GrapeJS 生成 HTML を 1:1 で migrate
//   - 将来 LLM で semantic block (Hero/FeatureGrid 等) に分解する前提のブリッジ
//
// 注意:
//   - dangerouslySetInnerHTML を使うため、書き込み源は admin (service-role) 経由のみ
//   - cms_content_blocks RLS は anon SELECT (is_active=true) を許可しているが
//     INSERT/UPDATE は admin-secret API 経由のみ → 信頼境界はサーバ側
//   - cssScope を指定すると外側 div に class="<cssScope>" が付与され
//     CSS 衝突を回避できる (web_demos.css_content をローカル化する場合)

import type { HtmlEmbedProps } from "./types"

export function HtmlEmbedBlock({ html, cssScope }: HtmlEmbedProps) {
  return (
    <div
      className={cssScope || "block-html-embed"}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
