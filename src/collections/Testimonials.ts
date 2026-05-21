import type { CollectionConfig } from "payload"
import { isAdmin, isAdminOrEditor, isLoggedIn } from "../access/byRole"
import { makeAfterChangeAudit, makeAfterDeleteAudit } from "../hooks/auditLog"
import { makeAutoTranslateHook } from "../lib/cms/autoTranslate"
import { AVAILABLE_LOCALE_OPTIONS } from "./_localeOptions"

/**
 * Testimonials collection — お客様の声 (CMS 編集可能)
 *
 * 2026-05-21 ユーザ指示「管理画面が機能少なすぎる」対応。
 * 旧 TestimonialsBlock (Pages 用) は手入力だったが、複数ページで再利用できる
 * 独立コレクションとして管理可能化する。
 *
 * 🚨 誠実化ルール (CLAUDE.md s1-2 / commit ae4231c「捏造実績・架空証言を全廃」):
 *   - 実在顧客の実際の声のみ。`consentGiven` (掲載許諾) が true のものだけ公開対象。
 *   - 許諾なしで匿名にしたい場合は authorName を伏せ、isAnonymous で表現。
 * i18n: quote / authorTitle は ja 保存で 11 locale 自動翻訳。
 */
export const Testimonials: CollectionConfig = {
  slug: "testimonials",
  labels: { singular: "お客様の声", plural: "お客様の声" },
  admin: {
    useAsTitle: "authorName",
    defaultColumns: ["authorName", "company", "rating", "consentGiven", "isPublished"],
    description: "実在顧客の声のみ掲載 (捏造・架空証言禁止)。掲載許諾済みのものだけ公開されます。",
    group: "コンテンツ",
  },
  access: {
    read: isLoggedIn,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdmin,
  },
  versions: { drafts: { autosave: { interval: 1500 } }, maxPerDoc: 10 },
  hooks: {
    afterChange: [
      makeAfterChangeAudit("testimonials"),
      makeAutoTranslateHook({ text: ["quote", "authorTitle"] }),
    ],
    afterDelete: [makeAfterDeleteAudit("testimonials")],
  },
  fields: [
    {
      name: "quote",
      type: "textarea",
      label: "コメント本文",
      required: true,
      localized: true,
    },
    { name: "authorName", type: "text", label: "氏名 / イニシャル", required: true },
    { name: "authorTitle", type: "text", label: "役職", localized: true },
    { name: "company", type: "text", label: "会社名 / 業種" },
    { name: "photo", type: "upload", relationTo: "media", label: "顔写真 / ロゴ (任意)" },
    {
      name: "rating",
      type: "number",
      label: "評価 (1〜5)",
      min: 1,
      max: 5,
      defaultValue: 5,
      admin: { position: "sidebar" },
    },
    {
      name: "serviceTag",
      type: "select",
      label: "対象サービス",
      admin: { position: "sidebar" },
      options: [
        { label: "Web制作", value: "web" },
        { label: "MEO対策", value: "meo" },
        { label: "SEO・GEO", value: "seo" },
        { label: "AI導入支援", value: "ai" },
        { label: "動画サブスク", value: "video" },
        { label: "Japan Entry (JaaS)", value: "japan-entry" },
        { label: "その他", value: "other" },
      ],
    },
    {
      name: "consentGiven",
      type: "checkbox",
      label: "掲載許諾あり",
      defaultValue: false,
      admin: {
        position: "sidebar",
        description: "🚨 顧客から掲載許諾を得ている場合のみ ON。OFF のものは公開対象外。",
      },
    },
    {
      name: "isAnonymous",
      type: "checkbox",
      label: "匿名表示 (会社名のみ)",
      defaultValue: false,
      admin: { position: "sidebar", description: "氏名を伏せて業種・会社規模のみ表示する場合に ON。" },
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
      defaultValue: ["ja"],
      required: true,
      admin: { position: "sidebar", description: "この声を表示するロケール（複数選択可・12 locale）。" },
    },
    {
      name: "isPublished",
      type: "checkbox",
      label: "公開",
      defaultValue: false,
      admin: { position: "sidebar", description: "consentGiven と両方 ON で初めて公開されます。" },
    },
  ],
}
