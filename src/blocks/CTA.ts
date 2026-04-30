import type { Block } from "payload"

/**
 * CTABlock — Call-to-Action ブロック
 *
 * 役割: ページ末尾や中盤での主要 conversion ポイント
 */
export const CTABlock: Block = {
  slug: "cta",
  imageURL: "/blocks-preview/cta.svg",
  interfaceName: "CTABlockType",
  labels: { singular: "CTA", plural: "CTAs" },
  fields: [
    { name: "title", type: "text", required: true, localized: true },
    { name: "subtitle", type: "textarea", localized: true },
    {
      name: "primaryCta",
      type: "group",
      label: "メイン CTA",
      fields: [
        { name: "label", type: "text", required: true, localized: true },
        { name: "href", type: "text", required: true },
      ],
    },
    {
      name: "secondaryCta",
      type: "group",
      label: "サブ CTA",
      fields: [
        { name: "label", type: "text", localized: true },
        { name: "href", type: "text" },
      ],
    },
    {
      name: "background",
      type: "select",
      defaultValue: "gradient",
      options: [
        { label: "Gradient (purple→indigo)", value: "gradient" },
        { label: "Surface", value: "surface" },
        { label: "Accent", value: "accent" },
      ],
    },
  ],
}
