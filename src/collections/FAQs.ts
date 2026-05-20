import type { CollectionConfig } from "payload"
import { isAdmin, isAdminOrEditor, isLoggedIn } from "../access/byRole"
import { makeAfterChangeAudit, makeAfterDeleteAudit } from "../hooks/auditLog"
import { makeAutoTranslateHook } from "../lib/cms/autoTranslate"
import { AVAILABLE_LOCALE_OPTIONS } from "./_localeOptions"

export const FAQs: CollectionConfig = {
  slug: "faqs",
  admin: {
    useAsTitle: "question",
    defaultColumns: ["question", "sortOrder", "locale"],
    description: "よくある質問の管理",
    group: "コンテンツ",
  },
  access: {
    read: isLoggedIn,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdmin,
  },
  versions: {
    drafts: { autosave: { interval: 1500 } },
    maxPerDoc: 10,
  },
  hooks: {
    afterChange: [
      makeAfterChangeAudit("faqs"),
      makeAutoTranslateHook({ text: ["question", "category"], rich: ["answer"] }),
    ],
    afterDelete: [makeAfterDeleteAudit("faqs")],
  },
  fields: [
    {
      name: "question",
      type: "text",
      label: "質問",
      required: true,
      localized: true,
    },
    {
      name: "answer",
      type: "richText",
      label: "回答",
      required: true,
      localized: true,
    },
    {
      name: "sortOrder",
      type: "number",
      label: "表示順",
      defaultValue: 0,
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "availableLocales",
      type: "select",
      label: "配信ロケール",
      hasMany: true,
      options: AVAILABLE_LOCALE_OPTIONS,
      defaultValue: ["ja"],
      required: true,
      admin: {
        position: "sidebar",
        description: "この FAQ を表示するロケール（複数選択可・12 locale）。",
      },
    },
    // 2026-05-12 [DEPRECATED soft removal] — availableLocales (12-locale) に統合済み
    {
      name: "locale",
      type: "select",
      label: "⚠️ [DEPRECATED 2026-05-12] 旧言語フィールド",
      options: [
        { label: "日本語 (/ja)", value: "ja" },
        { label: "English (/en)", value: "en" },
        { label: "両方", value: "both" },
      ],
      admin: {
        position: "sidebar",
        disabled: true,
        description:
          "⚠️ このフィールドは 2026-05-12 に廃止されました。availableLocales を使用してください。",
        condition: (data) => Boolean(data?.locale),
      },
    },
    {
      name: "category",
      type: "text",
      label: "カテゴリー",
      localized: true,
      admin: {
        position: "sidebar",
      },
    },
  ],
}
