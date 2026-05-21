import type { GlobalConfig } from "payload"
import { isAdminOrEditor } from "../access/byRole"
import { makeGlobalAutoTranslateHook } from "../lib/cms/autoTranslateGlobal"

/**
 * Footer global — サイト共通フッター (CMS 編集可能)
 *
 * 2026-05-21 ユーザ指示「管理画面が機能少なすぎる」対応。
 * 旧 SiteFooter.tsx は SERVICE_LINKS / company links がハードコードだった。
 * 本 global でフッターのリンク列・SNS・法的リンク・コピーライトを DB 化する。
 *
 * i18n: heading / label / tagline / copyright / studioLocation は localized。
 *   ja 保存で 11 locale 自動翻訳 (makeGlobalAutoTranslateHook が再帰収集)。
 * fallback: 未設定なら lib/navigation.ts の DEFAULT_FOOTER を使用 (空でも壊れない)。
 */
export const Footer: GlobalConfig = {
  slug: "footer",
  label: "フッター",
  admin: {
    description: "サイト下部のリンク列・SNS・法的リンク。日本語で保存すると全 12 言語に自動翻訳されます。",
    group: "ナビゲーション",
  },
  access: {
    read: () => true,
    update: isAdminOrEditor,
  },
  hooks: {
    afterChange: [
      makeGlobalAutoTranslateHook({
        localizedKeys: ["heading", "label", "tagline", "copyright", "studioLocation"],
      }),
    ],
  },
  fields: [
    {
      name: "tagline",
      type: "textarea",
      label: "見出し下の説明文",
      localized: true,
      admin: { description: "フッター上部の editorial 見出し横に出る一文。" },
    },
    {
      name: "studioLocation",
      type: "textarea",
      label: "スタジオ所在地・一言",
      localized: true,
    },
    {
      name: "columns",
      type: "array",
      label: "リンク列",
      labels: { singular: "列", plural: "列" },
      maxRows: 4,
      admin: { description: "フッター中段のリンク列 (最大 4 列)。", initCollapsed: true },
      fields: [
        { name: "heading", type: "text", label: "列見出し", required: true, localized: true },
        {
          name: "links",
          type: "array",
          label: "リンク",
          labels: { singular: "リンク", plural: "リンク" },
          fields: [
            {
              type: "row",
              fields: [
                { name: "label", type: "text", label: "表示名", required: true, localized: true, admin: { width: "45%" } },
                { name: "href", type: "text", label: "リンク先", required: true, admin: { width: "45%" } },
                { name: "openInNewTab", type: "checkbox", label: "新規タブ", defaultValue: false, admin: { width: "10%" } },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "socialLinks",
      type: "array",
      label: "SNS リンク",
      labels: { singular: "SNS", plural: "SNS" },
      admin: { description: "フッターに表示する SNS アイコン。", initCollapsed: true },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "platform",
              type: "select",
              label: "プラットフォーム",
              required: true,
              admin: { width: "40%" },
              options: [
                { label: "X (Twitter)", value: "twitter" },
                { label: "Instagram", value: "instagram" },
                { label: "Facebook", value: "facebook" },
                { label: "LinkedIn", value: "linkedin" },
                { label: "LINE", value: "line" },
                { label: "YouTube", value: "youtube" },
                { label: "GitHub", value: "github" },
              ],
            },
            { name: "url", type: "text", label: "URL", required: true, admin: { width: "60%" } },
          ],
        },
      ],
    },
    {
      name: "legalLinks",
      type: "array",
      label: "法的リンク (最下部)",
      labels: { singular: "リンク", plural: "リンク" },
      admin: { description: "コピーライト行の横に出るリンク (プライバシー / 特商法 等)。", initCollapsed: true },
      fields: [
        {
          type: "row",
          fields: [
            { name: "label", type: "text", label: "表示名", required: true, localized: true, admin: { width: "50%" } },
            { name: "href", type: "text", label: "リンク先", required: true, admin: { width: "50%" } },
          ],
        },
      ],
    },
    {
      name: "copyright",
      type: "text",
      label: "コピーライト表記",
      localized: true,
      admin: { description: "例: Paradigm合同会社 · All rights reserved (年は自動付与)。" },
    },
  ],
}
