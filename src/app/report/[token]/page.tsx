/**
 * Legacy /report/[token] — 308 permanent redirect to /ja/report/[token]
 *
 * なぜこのファイルが必要か:
 *   - appexx.me 側から配信された過去のメール・LP・ブックマークは
 *     ロケールプレフィックスなしの paradigmjp.com/report/{token} を指している。
 *   - next-intl v4 の localePrefix: "always" により新規URLは必ず
 *     /ja/... または /en/... になったため、旧URLを 308 で吸収する。
 *   - 308（Permanent Redirect）を使う理由: クローラに「恒久的に移動した」と伝え
 *     被リンクの価値を /ja/report/{token} に集約させる。
 *     301 ではなく 308 を選ぶのは、HTTP methodを保持してくれるから
 *     （将来 POST beacon が legacy URL に来たときも /ja/ に引き継がれる）。
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
