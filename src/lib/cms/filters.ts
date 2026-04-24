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
export function filterByLocale(locale: AppLocale, extraWhere?: Where): Where {
  const localeCondition: Where = {
    or: [
      { availableLocales: { contains: locale } },
      { locale: { equals: locale } },
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
 * ロケール検証ヘルパー。
 * URL セグメントから受け取った string を AppLocale に安全に絞り込む。
 * 未知値は "ja" にフォールバック（defaultLocale と揃える）。
 */
export function coerceLocale(raw: string | undefined | null): AppLocale {
  return raw === "en" ? "en" : "ja"
}

/**
 * PayloadCMS localized フィールドを指定ロケールで取得するときの共通オプション。
 *
 * - `locale`: text/richText の localized フィールドを指定言語で返す
 * - `fallbackLocale: false`: 翻訳が無い場合に defaultLocale に落ちるのを禁止する
 *   （「ロケール分けしたのに en ページで ja が出る」事故を予防）
 */
export function localeFindOptions(locale: AppLocale) {
  return {
    locale,
    fallbackLocale: false as const,
  }
}
