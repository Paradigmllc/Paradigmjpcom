import type { GlobalConfig } from "payload"
import { isAdminOrEditor } from "../access/byRole"
import { makeGlobalAutoTranslateHook } from "../lib/cms/autoTranslateGlobal"

/**
 * Header global — サイト共通ヘッダーナビゲーション (CMS 編集可能)
 *
 * 2026-05-21 ユーザ指示「管理画面が機能少なすぎる」対応。
 * 旧 SiteHeader.tsx は NAV 配列がハードコードで admin から編集不可だった
 * (A-CONTENT / AE-PHP-7 違反)。本 global でメニュー構造そのものを DB 化し、
 * 非エンジニアが admin からリンク追加・並べ替え・CTA 変更できるようにする。
 *
 * 配信: lib/navigation.ts → ConditionalSiteChrome → SiteHeader (props)。
 * i18n: label は localized + ja 保存で 11 locale 自動翻訳 (afterChange)。
 * fallback: 未設定時は lib/navigation.ts の DEFAULT_NAV が使われるため空でも壊れない。
 */
export const Header: GlobalConfig = {
  slug: "header",
  label: "ヘッダー (ナビ)",
  admin: {
    description: "サイト上部のナビゲーション・CTA ボタン。日本語で保存すると全 12 言語に自動翻訳されます。",
    group: "ナビゲーション",
  },
  access: {
    read: () => true,
    update: isAdminOrEditor,
  },
  hooks: {
    afterChange: [makeGlobalAutoTranslateHook({ localizedKeys: ["label"] })],
  },
  fields: [
    {
      name: "navItems",
      type: "array",
      label: "ナビリンク",
      labels: { singular: "リンク", plural: "リンク" },
      admin: {
        description: "ヘッダー中央に並ぶリンク。上から順に表示。href は内部パス (/about) または外部 URL。",
        initCollapsed: true,
      },
      fields: [
        {
          type: "row",
          fields: [
            { name: "label", type: "text", label: "表示名", required: true, localized: true, admin: { width: "50%" } },
            { name: "href", type: "text", label: "リンク先 (例: /about)", required: true, admin: { width: "40%" } },
            { name: "openInNewTab", type: "checkbox", label: "新規タブ", defaultValue: false, admin: { width: "10%" } },
          ],
        },
        {
          name: "children",
          type: "array",
          label: "ドロップダウン子リンク (任意)",
          labels: { singular: "子リンク", plural: "子リンク" },
          admin: { description: "設定するとこのリンクがドロップダウンメニューになります。", initCollapsed: true },
          fields: [
            {
              type: "row",
              fields: [
                { name: "label", type: "text", label: "表示名", required: true, localized: true, admin: { width: "50%" } },
                { name: "href", type: "text", label: "リンク先", required: true, admin: { width: "40%" } },
                { name: "openInNewTab", type: "checkbox", label: "新規タブ", defaultValue: false, admin: { width: "10%" } },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "cta",
      type: "group",
      label: "CTA ボタン (右上)",
      fields: [
        { name: "enabled", type: "checkbox", label: "CTA ボタンを表示", defaultValue: true },
        { name: "label", type: "text", label: "ボタンテキスト", localized: true, admin: { description: "空のとき messages の cta.primary を使用" } },
        { name: "href", type: "text", label: "リンク先", defaultValue: "/contact" },
      ],
    },
    {
      type: "row",
      fields: [
        { name: "showLocaleSwitcher", type: "checkbox", label: "言語スイッチャーを表示", defaultValue: true, admin: { width: "50%" } },
        { name: "showThemeToggle", type: "checkbox", label: "ダーク/ライト切替を表示", defaultValue: true, admin: { width: "50%" } },
      ],
    },
  ],
}
