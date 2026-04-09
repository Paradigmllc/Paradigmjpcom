import type { CollectionConfig } from "payload"

export const Pricing: CollectionConfig = {
  slug: "pricing",
  admin: {
    useAsTitle: "planName",
    defaultColumns: ["planName", "serviceId", "price", "currency", "locale"],
    description: "料金プランの管理",
    group: "コンテンツ",
  },
  fields: [
    {
      name: "planName",
      type: "text",
      label: "プラン名",
      required: true,
      localized: true,
    },
    {
      name: "serviceId",
      type: "text",
      label: "サービスID",
      required: true,
      admin: {
        description: "例: web, meo, seo, ai, japan-entry-package",
      },
    },
    {
      name: "price",
      type: "number",
      label: "価格",
      required: true,
    },
    {
      name: "currency",
      type: "select",
      label: "通貨",
      options: [
        { label: "JPY（円）", value: "jpy" },
        { label: "USD（ドル）", value: "usd" },
      ],
      defaultValue: "jpy",
      required: true,
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "billingCycle",
      type: "select",
      label: "請求サイクル",
      options: [
        { label: "月額", value: "monthly" },
        { label: "年額", value: "yearly" },
        { label: "初期費用", value: "one-time" },
      ],
      defaultValue: "monthly",
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "description",
      type: "textarea",
      label: "プラン説明",
      localized: true,
    },
    {
      name: "features",
      type: "array",
      label: "含まれる機能",
      fields: [
        {
          name: "feature",
          type: "text",
          label: "機能",
          required: true,
          localized: true,
        },
        {
          name: "included",
          type: "checkbox",
          label: "含む",
          defaultValue: true,
        },
      ],
    },
    {
      name: "isPopular",
      type: "checkbox",
      label: "人気プラン（バッジ表示）",
      defaultValue: false,
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "ctaLabel",
      type: "text",
      label: "CTAボタンテキスト",
      localized: true,
      admin: {
        position: "sidebar",
      },
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
  ],
}
