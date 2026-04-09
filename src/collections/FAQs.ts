import type { CollectionConfig } from "payload"

export const FAQs: CollectionConfig = {
  slug: "faqs",
  admin: {
    useAsTitle: "question",
    defaultColumns: ["question", "sortOrder", "locale"],
    description: "よくある質問の管理",
    group: "コンテンツ",
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
      name: "locale",
      type: "select",
      label: "言語",
      options: [
        { label: "日本語 (/ja)", value: "ja" },
        { label: "English (/en)", value: "en" },
        { label: "両方", value: "both" },
      ],
      defaultValue: "ja",
      required: true,
      admin: {
        position: "sidebar",
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
