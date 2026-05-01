/**
 * blocks/Stats.ts — KPI numbers grid block (admin-editable)
 *
 * 役割: HomeClient StatsHeroicSection の「200+ / 98% / 3x / 15min」を Pages
 *       collection 内で編集可能にする。Block array に追加するだけで使える。
 */

import type { Block } from "payload"

export const StatsBlock: Block = {
  slug: "stats",
  labels: { singular: "数値ハイライト (Stats)", plural: "数値ハイライト" },
  fields: [
    { name: "kicker", type: "text", label: "キッカー (上の小見出し)", localized: true },
    { name: "title", type: "text", label: "見出し", localized: true },
    { name: "subtitle", type: "textarea", label: "リード文", localized: true },
    {
      name: "stats",
      type: "array",
      label: "数値カード",
      labels: { singular: "カード", plural: "カード" },
      minRows: 1,
      maxRows: 8,
      fields: [
        { name: "value", type: "text", label: "数値 (例: 200, 98%, 3x)", required: true, localized: true },
        { name: "label", type: "text", label: "ラベル", required: true, localized: true },
        { name: "sublabel", type: "text", label: "補足 (任意)", localized: true },
      ],
    },
    {
      name: "background",
      type: "select",
      label: "背景",
      defaultValue: "default",
      options: [
        { label: "デフォルト", value: "default" },
        { label: "サーフェス", value: "surface" },
        { label: "ダーク", value: "dark" },
      ],
    },
  ],
}
