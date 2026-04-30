import type { Block } from "payload"

/**
 * SectionBlock — 見出し + 説明テキストのシンプル節
 *
 * 役割: ページの構造的区切り (h2 ヘッダー + intro)
 * 使い所: 「サービスとは」「特徴」等の章立て
 */
export const SectionBlock: Block = {
  slug: "section",
  imageURL: "/blocks-preview/section.svg",
  interfaceName: "SectionBlockType",
  labels: { singular: "Section", plural: "Sections" },
  fields: [
    { name: "kicker", type: "text", localized: true, label: "上部小見出し (例: \"FEATURES\")" },
    { name: "title", type: "text", required: true, localized: true, label: "見出し" },
    { name: "subtitle", type: "textarea", localized: true, label: "説明文" },
    {
      name: "alignment",
      type: "select",
      defaultValue: "center",
      options: [
        { label: "Center", value: "center" },
        { label: "Left", value: "left" },
      ],
    },
    {
      name: "background",
      type: "select",
      defaultValue: "default",
      options: [
        { label: "Default", value: "default" },
        { label: "Surface (薄グレー)", value: "surface" },
        { label: "Accent Soft", value: "accent-soft" },
      ],
    },
  ],
}
