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

// H-0-6 (2026-05-01): 12 locale 完全実装
// scripts/i18n-proposal-translate.mjs で DeepSeek V4 Cache 経由で生成
import jaMessages from "@/messages/proposal/ja.json"
import enMessages from "@/messages/proposal/en.json"
import koMessages from "@/messages/proposal/ko.json"
import zhMessages from "@/messages/proposal/zh.json"
import europeMessages from "@/messages/proposal/europe.json"
import esMessages from "@/messages/proposal/es.json"
import ptMessages from "@/messages/proposal/pt.json"
import ruMessages from "@/messages/proposal/ru.json"
import arMessages from "@/messages/proposal/ar.json"
import seaMessages from "@/messages/proposal/sea.json"
import africaMessages from "@/messages/proposal/africa.json"
import othersMessages from "@/messages/proposal/others.json"

type MessageMap = Record<string, unknown>

// 全 12 locale 完全実装 (silently-JA-leak 防止規律準拠・en fallback 不要)
const MESSAGES: Record<SalesRegion, MessageMap> = {
  ja: jaMessages as MessageMap,
  en: enMessages as MessageMap,
  ko: koMessages as MessageMap,
  zh: zhMessages as MessageMap,
  europe: europeMessages as MessageMap,
  es: esMessages as MessageMap,
  pt: ptMessages as MessageMap,
  ru: ruMessages as MessageMap,
  ar: arMessages as MessageMap,
  sea: seaMessages as MessageMap,
  africa: africaMessages as MessageMap,
  others: othersMessages as MessageMap,
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
 *
 * silently-JA-leak 防止規律 (CLAUDE.md s10-5 #9):
 *   - locale === "ja" の時のみ ja → en の順で fallback OK
 *   - locale !== "ja" の時は en → key の順で fallback (JA を見せない)
 *   - 全 12 locale が直接実装されているため、通常は fallback 不要
 */
export function useProposalT(locale: SalesRegion = "ja") {
  return (key: string, vars?: Record<string, string | number>): string => {
    const primary = getNested(MESSAGES[locale] ?? MESSAGES.en, key)
    if (primary !== undefined) return interpolate(primary, vars)

    // ja は ja-self-fallback OK、それ以外は en fallback (JA leak 防止)
    const fallbackLocale: SalesRegion = locale === "ja" ? "ja" : "en"
    const fallback = getNested(MESSAGES[fallbackLocale], key)
    if (fallback !== undefined) return interpolate(fallback, vars)

    // 開発時の missing key 可視化
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[proposal/i18n] missing key: "${key}" (locale: ${locale})`)
    }
    return key
  }
}

export type ProposalT = ReturnType<typeof useProposalT>
