/**
 * blocks/Pricing.ts — 料金テーブルブロック（admin-editable）
 *
 * 役割: Pages collection 内で料金ティアを管理。Aesop voice。
 */
import type { Block } from "payload"

export const PricingBlock: Block = {
  slug: "pricing",
  labels: { singular: "料金テーブル", plural: "料金テーブル" },
  fields: [
    { name: "title", type: "text", label: "見出し", localized: true },
    { name: "subtitle", type: "textarea", label: "リード文", localized: true },
    {
      name: "tiers",
      type: "array",
      label: "料金ティア",
      labels: { singular: "ティア", plural: "ティア" },
      minRows: 1,
      maxRows: 5,
      fields: [
        { name: "name", type: "text", label: "プラン名", required: true, localized: true },
        { name: "price", type: "text", label: "価格 (例: ¥0 / $3,500)", localized: true },
        { name: "period", type: "text", label: "期間 (例: mo / yr / once)", localized: true },
        { name: "description", type: "textarea", label: "説明", localized: true },
        { name: "features", type: "textarea", label: "特徴（1行1項目）", localized: true },
        { name: "ctaLabel", type: "text", label: "CTAラベル", localized: true },
        { name: "ctaHref", type: "text", label: "CTAリンク" },
        { name: "highlighted", type: "checkbox", label: "強調表示 (おすすめ)", defaultValue: false },
      ],
    },
  ],
}