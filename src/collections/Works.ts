import type { CollectionConfig } from "payload"

export const Works: CollectionConfig = {
  slug: "works",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "industry", "sortOrder", "locale"],
    description: "制作実績・事例の管理",
    group: "コンテンツ",
  },
  fields: [
    {
      name: "title",
      type: "text",
      label: "タイトル",
      required: true,
      localized: true,
    },
    {
      name: "industry",
      type: "text",
      label: "業種",
      required: true,
      localized: true,
    },
    {
      name: "description",
      type: "textarea",
      label: "概要",
      localized: true,
    },
    {
      name: "challenge",
      type: "textarea",
      label: "課題",
      localized: true,
    },
    {
      name: "solution",
      type: "textarea",
      label: "解決策",
      localized: true,
    },
    {
      name: "metrics",
      type: "text",
      label: "成果（数値）",
      localized: true,
      admin: {
        description: "例: 売上150%増加、SEO流入3倍",
      },
    },
    {
      name: "tags",
      type: "array",
      label: "タグ・使用技術",
      fields: [
        {
          name: "tag",
          type: "text",
          label: "タグ",
        },
      ],
    },
    {
      name: "color",
      type: "select",
      label: "カラーテーマ",
      options: [
        { label: "インディゴ", value: "indigo" },
        { label: "エメラルド", value: "emerald" },
        { label: "ローズ", value: "rose" },
        { label: "アンバー", value: "amber" },
        { label: "バイオレット", value: "violet" },
        { label: "ティール", value: "teal" },
      ],
      defaultValue: "indigo",
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "coverImage",
      type: "upload",
      label: "カバー画像",
      relationTo: "media",
    },
    {
      name: "gallery",
      type: "array",
      label: "ギャラリー",
      fields: [
        {
          name: "image",
          type: "upload",
          label: "画像",
          relationTo: "media",
          required: true,
        },
        {
          name: "caption",
          type: "text",
          label: "キャプション",
          localized: true,
        },
      ],
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
      name: "isPublished",
      type: "checkbox",
      label: "公開",
      defaultValue: true,
      admin: {
        position: "sidebar",
      },
    },
  ],
}
