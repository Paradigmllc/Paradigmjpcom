import type { Block } from "payload"

export const ComparisonBlock: Block = {
  slug: "comparison",
  labels: { singular: "比較テーブル", plural: "比較テーブル" },
  fields: [
    { name: "kicker", type: "text", label: "キッカー" },
    { name: "title", type: "text", label: "見出し" },
    { name: "subtitle", type: "textarea", label: "リード文" },
    { name: "leftLabel", type: "text", label: "左列ラベル" },
    { name: "rightLabel", type: "text", label: "右列ラベル" },
    {
      name: "rows",
      type: "array",
      label: "比較行",
      labels: { singular: "行", plural: "行" },
      minRows: 1,
      maxRows: 20,
      fields: [
        { name: "item", type: "text", label: "項目名", required: true },
        { name: "leftValue", type: "text", label: "左の値" },
        { name: "rightValue", type: "text", label: "右の値" },
      ],
    },
  ],
}
