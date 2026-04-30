/**
 * proposal/i18n.ts — 提案ページ専用ライトウェイト i18n
 *
 * 永久ルール (CLAUDE.md s10-4 提案ページ 4鉄則):
 *   ② Zero hardcoded strings — 全 UI 文字列は messages/proposal/{locale}.json 経由
 *
 * Why not next-intl directly:
 *   全アプリ routing layer に next-intl を入れるのは別 PR (大規模影響)。
 *   提案ページに限定した API-互換 hook を実装し、将来 next-intl に
 *   差し替え可能 (useTranslations(...) と同じ呼び出し感)。
 *
 * Usage:
 *   const t = useProposalT(locale)  // locale: SalesRegion ("ja"|"en"|...12種)
 *   t("hero.title")                  // → 翻訳済み文字列
 *   t("hero.metric_score", { score: 43 }) // → "{score}" を 43 に置換
 */
import type { SalesRegion } from "@/lib/stores/sales-region"

import jaMessages from "@/messages/proposal/ja.json"
import enMessages from "@/messages/proposal/en.json"

type MessageMap = Record<string, unknown>

// 全 locale 用 messages map (ja/en は実装・他は ja fallback で MVP)
// 将来 admin endpoint で DeepSeek V4 に翻訳させて補完する
const MESSAGES: Record<SalesRegion, MessageMap> = {
  ja: jaMessages as MessageMap,
  en: enMessages as MessageMap,
  ko: enMessages as MessageMap,
  zh: enMessages as MessageMap,
  europe: enMessages as MessageMap,
  es: enMessages as MessageMap,
  pt: enMessages as MessageMap,
  ru: enMessages as MessageMap,
  ar: enMessages as MessageMap,
  sea: enMessages as MessageMap,
  africa: enMessages as MessageMap,
  others: enMessages as MessageMap,
}

function getNested(obj: MessageMap, path: string): string | undefined {
  const parts = path.split(".")
  let current: unknown = obj
  for (const part of parts) {
    if (typeof current === "object" && current !== null && part in (current as object)) {
      current = (current as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }
  return typeof current === "string" ? current : undefined
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    vars[key] !== undefined ? String(vars[key]) : `{${key}}`
  )
}

/**
 * Returns a translation function `t(key, vars?)` for the given locale.
 * - Falls back to `ja` if key missing in target locale
 * - Falls back to the key itself if missing in both (visible bug indicator)
 */
export function useProposalT(locale: SalesRegion = "ja") {
  return (key: string, vars?: Record<string, string | number>): string => {
    const primary = getNested(MESSAGES[locale] ?? MESSAGES.ja, key)
    if (primary !== undefined) return interpolate(primary, vars)
    const fallback = getNested(MESSAGES.ja, key)
    if (fallback !== undefined) return interpolate(fallback, vars)
    // 開発時の missing key 可視化 (本番では英語で key そのものが出る・ESLint で防ぐ前提)
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[proposal/i18n] missing key: "${key}" (locale: ${locale})`)
    }
    return key
  }
}

export type ProposalT = ReturnType<typeof useProposalT>
