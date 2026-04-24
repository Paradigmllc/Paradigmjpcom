import type { CollectionConfig } from "payload"
import { isAdmin, isAdminOrEditor, isLoggedIn } from "../access/byRole"
import { makeAfterChangeAudit, makeAfterDeleteAudit } from "../hooks/auditLog"

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
    afterChange: [makeAfterChangeAudit("faqs")],
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
      options: [
        { label: "日本語 (/ja)", value: "ja" },
        { label: "English (/en)", value: "en" },
      ],
      defaultValue: ["ja"],
      required: true,
      admin: {
        position: "sidebar",
        description: "このFAQを表示するロケール（複数選択可）。",
      },
    },
    {
      name: "locale",
      type: "select",
      label: "[legacy] 言語",
      options: [
        { label: "日本語 (/ja)", value: "ja" },
        { label: "English (/en)", value: "en" },
        { label: "両方", value: "both" },
      ],
      admin: {
        position: "sidebar",
        description: "非推奨: availableLocalesを使用。",
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
