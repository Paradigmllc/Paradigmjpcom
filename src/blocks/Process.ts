/**
 * blocks/Process.ts — Step-by-step process block (admin-editable)
 *
 * 役割: HomeClient ProcessSection の「Listen / Design / Build / Grow」4 ステップ
 *       を Pages collection 内で編集可能にする。
 */

import type { Block } from "payload"

export const ProcessBlock: Block = {
  slug: "process",
  labels: { singular: "プロセス (Process)", plural: "プロセス" },
  fields: [
    { name: "kicker", type: "text", label: "キッカー", defaultValue: "Process" },
    { name: "title", type: "text", label: "見出し", localized: true },
    { name: "subtitle", type: "textarea", label: "リード文", localized: true },
    {
      name: "steps",
      type: "array",
      label: "ステップ",
      labels: { singular: "ステップ", plural: "ステップ" },
      minRows: 2,
      maxRows: 6,
      fields: [
        { name: "title", type: "text", label: "ステップ名 (例: Listen / Design)", required: true, localized: true },
        { name: "description", type: "textarea", label: "説明", required: true, localized: true },
        { name: "icon", type: "text", label: "アイコン名 (lucide-react · 任意)", admin: { description: "例: Headphones / PenTool / Code2 / TrendingUp" } },
      ],
    },
  ],
}
