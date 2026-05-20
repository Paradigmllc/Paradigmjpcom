/**
 * CMS Locale Filter Helper
 *
 * 目的:
 *   PayloadCMS コレクションを「このロケールで配信すべきアイテムだけ」に絞り込む
 *   共通述語（Where clause）を生成する。
 *
 * 背景:
 *   - 新スキーマ: `availableLocales: string[]` （例: ["ja","en"] / ["ja"] / ["en"]）
 *   - 旧スキーマ: `locale: "ja" | "en" | "both"` （後方互換のため残置）
 *   両方のスキーマを持つアイテムが DB 内に混在するため、ORで合成する必要がある。
 *
 * なぜコレクション別に書かないのか:
 *   Services / Posts / FAQs / Works / Pricing の5コレクションで同じパターンを繰り返すのは
 *   DRY 違反になり、かつ将来ロケールが増えた（ko, zh など）ときに全コレクションを
 *   書き換える羽目になる。1箇所に集約しておけば追加時は `resolveLocaleFilter` だけ触れば済む。
 *
 * 使い方:
 *   ```ts
 *   import { filterByLocale } from "@/lib/cms/filters"
 *   const payload = await getPayload({ config })
 *   const services = await payload.find({
 *     collection: "services",
 *     where: filterByLocale("ja", { isActive: { equals: true } }),
 *     sort: "sortOrder",
 *   })
 *   ```
 */

import type { Where } from "payload"
import { routing, type Locale } from "@/i18n/routing"

/**
 * CMS の「コンテンツ配信ロケール」。
 *
 * サイトは 12 locale (ja/en/ko/zh/de/fr/es/pt/ru/ar/vi/id) を持つが、
 * 動的コンテンツ (記事/サービス/料金/実績/FAQ) は **ja / en の 2 言語のみ** 制作する。
 * 残り 10 locale は **英語フォールバック**（2026-05-20 ユーザ決定）。
 *
 * 静的 UI (next-intl messages) は 12 locale 完全対応なので、
 * 「静的 UI = 実 locale」「動的 content = AppLocale (ja/en)」と明確に分離すること。
 */
export type AppLocale = "ja" | "en"

/**
 * Locale-scoped Where clause.
 *
 * 返り値の構造（"ja" を渡した場合）:
 * ```
 * {
 *   and: [
 *     extraWhere,  // 呼び出し側が追加したい条件（例: isActive=true）
 *     {
 *       or: [
 *         { availableLocales: { contains: "ja" } },  // 新スキーマ優先
 *         { locale: { equals: "ja" } },              // 旧スキーマ: 単一ロケール
 *         { locale: { equals: "both" } },            // 旧スキーマ: 両方
 *       ]
 *     }
 *   ]
 * }
 * ```
 *
 * @param locale  有効化したいロケール（"ja" | "en"）
 * @param extraWhere  呼び出し側の追加フィルタ（optional）
 */
export function filterByLocale(locale: Locale | AppLocale, extraWhere?: Where): Where {
  // 12-locale 配信 (2026-05-20 B): availableLocales が当 locale を含む doc を配信。
  // en も含めることで「未翻訳でも en で marked された doc は全 locale に出る」graceful
  // fallback を実現 (field 値は localeFindOptions の fallbackLocale="en" で補完)。
  // 自動翻訳フック (A) が保存時に availableLocales を全 12 に設定するため、翻訳済 doc は
  // 各 locale でネイティブ表示される。
  const localeCondition: Where = {
    or: [
      { availableLocales: { contains: locale } },
      { availableLocales: { contains: "en" } },
      { locale: { equals: locale } }, // 旧スキーマ後方互換
      { locale: { equals: "both" } },
    ],
  }

  if (!extraWhere || Object.keys(extraWhere).length === 0) {
    return localeCondition
  }

  return {
    and: [extraWhere, localeCondition],
  }
}

/**
 * 実 locale 検証ヘルパー（静的 UI / metadata / 日付フォーマット用）。
 * URL セグメントを 12 locale のいずれかに絞り込む。未知値は defaultLocale (ja)。
 *
 * 用途: `getTranslations({ locale })` には必ずこちらを渡す。
 *   coerceLocale を渡すと ko/zh/de... の静的 UI まで ja/en に潰れてしまう。
 */
export function assertLocale(raw: string | undefined | null): Locale {
  return (routing.locales as readonly string[]).includes(raw ?? "")
    ? (raw as Locale)
    : routing.defaultLocale
}

/**
 * コンテンツ配信ロケール解決ヘルパー（CMS クエリ専用）。
 * 12 locale → 2 content locale (ja/en) にマップする。
 *
 * - "ja"            → "ja"（日本語コンテンツ）
 * - "en" 及びその他 → "en"（**英語フォールバック**・2026-05-20 ユーザ決定）
 *
 * 旧実装は `raw === "en" ? "en" : "ja"`（非en→日本語）で、ko/zh/de... 訪問者に
 * 日本語の動的コンテンツが配信される silently-JA-leak バグだった。本実装で
 * 「ja 以外は英語」に反転し、国際訪問者へ英語を配信する。
 */
export function coerceLocale(raw: string | undefined | null): AppLocale {
  return raw === "ja" ? "ja" : "en"
}

/**
 * PayloadCMS localized フィールドを指定ロケールで取得するときの共通オプション。
 *
 * 12-locale 配信 (2026-05-20 B):
 * - `locale`: 実 locale (12種) を渡す。当 locale の localized フィールド値を返す。
 * - `fallbackLocale: "en"`: 当 locale に翻訳が無いフィールドは **英語で補完**。
 *   日本語起点の自動翻訳フック (A) が ja → 全 locale を埋めるため通常は fallback 不要だが、
 *   翻訳漏れ・新規フィールドでも日本語 leak せず英語にフォールバックする安全網。
 *   (ja 自身は source なので常に値があり fallback は発火しない。)
 */
export function localeFindOptions(locale: Locale | AppLocale) {
  return {
    locale,
    fallbackLocale: "en" as const,
  }
}
