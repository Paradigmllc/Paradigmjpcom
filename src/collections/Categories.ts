import type { CollectionConfig } from "payload"
import { isAdmin, isAdminOrEditor, isLoggedIn } from "../access/byRole"
import { makeAfterChangeAudit, makeAfterDeleteAudit } from "../hooks/auditLog"
import { makeAutoTranslateHook } from "../lib/cms/autoTranslate"
import { AVAILABLE_LOCALE_OPTIONS } from "./_localeOptions"

/**
 * Categories collection — ブログ記事のカテゴリー分類 (CMS 編集可能)
 *
 * 2026-05-21 ユーザ指示「管理画面が機能少なすぎる」対応。
 * 旧 Posts.category は自由テキストで表記揺れ・絞り込み不可だった。
 * 本コレクションで taxonomy として一元管理し、Posts から relationship 参照する
 * (Posts.categoryRef・後方互換のため旧 free-text category も残置)。
 * i18n: name/description は ja 保存で 11 locale 自動翻訳。
 */
export const Categories: CollectionConfig = {
  slug: "categories",
  labels: { singular: "カテゴリー", plural: "カテゴリー" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "slug", "sortOrder"],
    description: "ブログ記事のカテゴリー分類。Posts から参照されます。",
    group: "コンテンツ",
  },
  access: {
    read: isLoggedIn,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdmin,
  },
  hooks: {
    afterChange: [
      makeAfterChangeAudit("categories"),
      makeAutoTranslateHook({ text: ["name", "description"] }),
    ],
    afterDelete: [makeAfterDeleteAudit("categories")],
  },
  fields: [
    { name: "name", type: "text", label: "カテゴリー名", required: true, localized: true },
    {
      name: "slug",
      type: "text",
      label: "スラッグ (URL)",
      required: true,
      unique: true,
      admin: { description: "英数字とハイフンのみ。例: japan-business, ai-automation" },
    },
    { name: "description", type: "textarea", label: "説明", localized: true },
    {
      name: "color",
      type: "select",
      label: "カラーテーマ",
      defaultValue: "indigo",
      admin: { position: "sidebar" },
      options: [
        { label: "インディゴ", value: "indigo" },
        { label: "エメラルド", value: "emerald" },
        { label: "ローズ", value: "rose" },
        { label: "アンバー", value: "amber" },
        { label: "バイオレット", value: "violet" },
        { label: "ティール", value: "teal" },
      ],
    },
    {
      name: "sortOrder",
      type: "number",
      label: "表示順",
      defaultValue: 0,
      admin: { position: "sidebar" },
    },
    {
      name: "availableLocales",
      type: "select",
      label: "配信ロケール",
      hasMany: true,
      options: AVAILABLE_LOCALE_OPTIONS,
      defaultValue: ["ja", "en"],
      required: true,
      admin: { position: "sidebar", description: "このカテゴリーを表示するロケール（複数選択可・12 locale）。" },
    },
  ],
}
