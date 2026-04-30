import type { Block } from "payload"

/**
 * RichTextBlock — 自由記述ブロック (Lexical editor)
 *
 * 役割: Block で表現しきれない自由記述・見出し混在記事
 * 例: 「会社の歴史」「セキュリティポリシー詳細」「比較表」等
 */
export const RichTextBlock: Block = {
  slug: "rich-text",
  imageURL: "/blocks-preview/rich-text.svg",
  interfaceName: "RichTextBlockType",
  labels: { singular: "Rich Text", plural: "Rich Texts" },
  fields: [
    { name: "content", type: "richText", required: true, localized: true },
    {
      name: "maxWidth",
      type: "select",
      defaultValue: "prose",
      options: [
        { label: "Prose (~ 720px・記事用)", value: "prose" },
        { label: "Wide (~ 1080px)", value: "wide" },
        { label: "Full (制限なし)", value: "full" },
      ],
    },
  ],
}
