import type { Block } from "payload"

/**
 * FAQBlock — FAQ アコーディオン
 *
 * 役割: よくある質問の集約・SEO 用 FAQPage JSON-LD の source
 * Note: page-renderer 側で JSON-LD を自動生成 (s5 SEO 鉄則)
 */
export const FAQBlock: Block = {
  slug: "faq",
  imageURL: "/blocks-preview/faq.svg",
  interfaceName: "FAQBlockType",
  labels: { singular: "FAQ", plural: "FAQs" },
  fields: [
    { name: "title", type: "text", localized: true, label: "セクション見出し" },
    { name: "subtitle", type: "textarea", localized: true },
    {
      name: "items",
      type: "array",
      minRows: 1,
      label: "質問・回答",
      fields: [
        { name: "question", type: "text", required: true, localized: true },
        { name: "answer", type: "richText", required: true, localized: true },
      ],
    },
  ],
}
