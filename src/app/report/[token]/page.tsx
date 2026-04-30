/**
 * /report/[token] — 308 permanent redirect to /ja/report/[token]
 *
 * 2026-04-30 拡張: 「顧客向けページ canonical = /[locale]/report/[slug]」永久ルール
 * (Appexxme CLAUDE.md s10-4) 準拠。本 shim は token (legacy diagnostic_reports) と
 * slug (proposal_pages) の両形式を /ja/ にリダイレクトする (param 名は便宜上 token)。
 *
 * 役割:
 *   - appexx.me 側から配信されるロケールプレフィックスなし URL の正規化
 *     (paradigmjp.com/report/{slug-or-token} → /ja/report/{slug-or-token})
 *   - next-intl v4 の localePrefix: "always" 配下に統合
 *   - 308 (Permanent Redirect) で被リンクの価値を /ja/ に集約
 *   - HTTP method を保持 (POST beacon も /ja/ に引き継がれる)
 */

import { permanentRedirect } from "next/navigation"

export default async function LegacyReportRedirect({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  permanentRedirect(`/ja/report/${token}`)
}
