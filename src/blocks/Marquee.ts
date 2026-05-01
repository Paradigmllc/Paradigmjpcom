/**
 * blocks/Marquee.ts — Trust bar / scrolling phrases block (admin-editable)
 *
 * 役割: HomeClient MarqueeSection の双方向 trust 帯 (会社ロゴや
 *       実績フレーズの自動スクロール) を Pages collection で編集可能にする。
 */

import type { Block } from "payload"

export const MarqueeBlock: Block = {
  slug: "marquee",
  labels: { singular: "マーキー (Marquee)", plural: "マーキー" },
  fields: [
    {
      name: "items",
      type: "array",
      label: "スクロール項目",
      labels: { singular: "項目", plural: "項目" },
      minRows: 3,
      fields: [
        { name: "text", type: "text", label: "テキスト", required: true, localized: true },
      ],
    },
    {
      name: "direction",
      type: "select",
      label: "スクロール方向",
      defaultValue: "left",
      options: [
        { label: "左方向", value: "left" },
        { label: "右方向", value: "right" },
      ],
    },
    {
      name: "speed",
      type: "select",
      label: "速度",
      defaultValue: "normal",
      options: [
        { label: "ゆっくり", value: "slow" },
        { label: "通常", value: "normal" },
        { label: "速い", value: "fast" },
      ],
    },
  ],
}
