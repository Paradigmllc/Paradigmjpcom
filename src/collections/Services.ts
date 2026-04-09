import type { CollectionConfig } from "payload"

export const Services: CollectionConfig = {
  slug: "services",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "slug", "sortOrder", "locale"],
    description: "サービスの管理",
    group: "コンテンツ",
  },
  fields: [
    {
      name: "name",
      type: "text",
      label: "サービス名",
      required: true,
      localized: true,
    },
    {
      name: "slug",
      type: "text",
      label: "スラッグ",
      required: true,
      unique: true,
    },
    {
      name: "tagline",
      type: "text",
      label: "キャッチコピー",
      localized: true,
    },
    {
      name: "description",
      type: "richText",
      label: "説明",
      localized: true,
    },
    {
      name: "icon",
      type: "text",
      label: "アイコン名（lucide-react）",
      admin: {
        description: "例: Globe, Search, Bot, MapPin",
      },
    },
    {
      name: "features",
      type: "array",
      label: "機能・特徴",
      fields: [
        {
          name: "feature",
          type: "text",
          label: "特徴",
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
      name: "isActive",
      type: "checkbox",
      label: "有効",
      defaultValue: true,
      admin: {
        position: "sidebar",
      },
    },
  ],
}
