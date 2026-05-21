import type { CollectionConfig } from "payload"
import { isAdmin, isAdminOrEditor, isLoggedIn } from "../access/byRole"
import { makeAfterChangeAudit, makeAfterDeleteAudit } from "../hooks/auditLog"
import { makeAutoTranslateHook } from "../lib/cms/autoTranslate"
import { AVAILABLE_LOCALE_OPTIONS } from "./_localeOptions"

/**
 * TeamMembers collection — About ページのチームメンバー (CMS 編集可能)
 *
 * 2026-05-21 ユーザ指示「管理画面が機能少なすぎる」対応。
 * CLAUDE.md s5「Aboutページ（チーム写真セクション追加）」の DB 基盤。
 * 役割: 実在メンバーの顔写真・役職・bio を admin から管理 (ストックフォト禁止・
 *   実メンバーのみ = s10-1 コーディング規約 5)。
 * i18n: name/role/bio は ja 保存で 11 locale 自動翻訳。
 */
export const TeamMembers: CollectionConfig = {
  slug: "team-members",
  labels: { singular: "チームメンバー", plural: "チームメンバー" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "role", "sortOrder", "isActive"],
    description: "About ページのチームメンバー。実在メンバーのみ (ストックフォト禁止)。",
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
      makeAfterChangeAudit("team-members"),
      makeAutoTranslateHook({ text: ["name", "role", "bio"] }),
    ],
    afterDelete: [makeAfterDeleteAudit("team-members")],
  },
  fields: [
    { name: "name", type: "text", label: "氏名", required: true, localized: true },
    { name: "role", type: "text", label: "役職・肩書き", localized: true },
    { name: "bio", type: "textarea", label: "プロフィール", localized: true },
    { name: "photo", type: "upload", relationTo: "media", label: "顔写真" },
    {
      name: "socials",
      type: "array",
      label: "SNS / リンク",
      labels: { singular: "リンク", plural: "リンク" },
      admin: { initCollapsed: true },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "platform",
              type: "select",
              label: "種別",
              admin: { width: "40%" },
              options: [
                { label: "X (Twitter)", value: "twitter" },
                { label: "LinkedIn", value: "linkedin" },
                { label: "GitHub", value: "github" },
                { label: "Website", value: "website" },
                { label: "Email", value: "email" },
              ],
            },
            { name: "url", type: "text", label: "URL / mailto", required: true, admin: { width: "60%" } },
          ],
        },
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
      admin: {
        position: "sidebar",
        description: "このメンバーを表示するロケール（複数選択可・12 locale）。",
      },
    },
    {
      name: "isActive",
      type: "checkbox",
      label: "公開",
      defaultValue: true,
      admin: { position: "sidebar" },
    },
  ],
}
