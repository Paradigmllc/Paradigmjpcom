/**
 * blocks/Testimonials.ts — Customer quote cards block (admin-editable)
 *
 * 役割: HomeClient TestimonialsSection の「お客様の声」を Pages collection
 *       内で編集可能にする。3 quote glass cards を再現。
 */

import type { Block } from "payload"

export const TestimonialsBlock: Block = {
  slug: "testimonials",
  labels: { singular: "お客様の声 (Testimonials)", plural: "お客様の声" },
  fields: [
    { name: "kicker", type: "text", label: "キッカー", defaultValue: "Testimonials" },
    { name: "title", type: "text", label: "見出し", localized: true },
    {
      name: "items",
      type: "array",
      label: "お客様の声",
      labels: { singular: "声", plural: "声" },
      minRows: 1,
      fields: [
        { name: "name", type: "text", label: "お客様名 (例: 飲食店オーナー)", localized: true, required: true },
        { name: "location", type: "text", label: "所在地・業種", localized: true },
        { name: "text", type: "textarea", label: "コメント", localized: true, required: true },
        { name: "avatar", type: "upload", relationTo: "media", label: "顔写真 (任意)" },
        { name: "rating", type: "number", label: "評価 (1-5・任意)", min: 1, max: 5 },
      ],
    },
  ],
}
