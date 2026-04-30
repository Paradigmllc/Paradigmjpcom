import type { Block } from "payload"

/**
 * CardGridBlock — 機能・特徴・実績などのカード並び
 *
 * 役割: 並列情報を視覚的に整列して見せる
 * Variant: bento (非対称) / equal (均等) / list (縦リスト)
 */
export const CardGridBlock: Block = {
  slug: "card-grid",
  imageURL: "/blocks-preview/card-grid.svg",
  interfaceName: "CardGridBlockType",
  labels: { singular: "Card Grid", plural: "Card Grids" },
  fields: [
    { name: "title", type: "text", localized: true, label: "セクション見出し (オプション)" },
    {
      name: "variant",
      type: "select",
      defaultValue: "equal",
      options: [
        { label: "Bento (非対称)", value: "bento" },
        { label: "Equal (均等)", value: "equal" },
        { label: "List (縦)", value: "list" },
      ],
    },
    {
      name: "columns",
      type: "select",
      defaultValue: "3",
      options: [
        { label: "2 columns", value: "2" },
        { label: "3 columns", value: "3" },
        { label: "4 columns", value: "4" },
      ],
    },
    {
      name: "cards",
      type: "array",
      minRows: 1,
      label: "カード",
      fields: [
        { name: "icon", type: "text", label: "アイコン (lucide-react名 or emoji)" },
        { name: "title", type: "text", required: true, localized: true },
        { name: "description", type: "textarea", localized: true },
        { name: "href", type: "text", label: "リンク先 (オプション)" },
        { name: "image", type: "upload", relationTo: "media" },
        { name: "highlighted", type: "checkbox", label: "強調表示" },
      ],
    },
  ],
}
