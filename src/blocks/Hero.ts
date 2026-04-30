import type { Block } from "payload"

/**
 * HeroBlock — ページ最上部のヒーローセクション
 *
 * 役割: ファーストビューでサイト/ページの価値提案を伝える
 * 使い所: HomePage / ServicesPage / 各 LP のトップ
 * Variant: centered (中央揃え) / split-image (左テキスト右画像) / video-bg (背景動画)
 */
export const HeroBlock: Block = {
  slug: "hero",
  imageURL: "/blocks-preview/hero.svg",
  interfaceName: "HeroBlockType",
  labels: { singular: "Hero", plural: "Heroes" },
  fields: [
    {
      name: "variant",
      type: "select",
      defaultValue: "centered",
      options: [
        { label: "Centered", value: "centered" },
        { label: "Split (text+image)", value: "split-image" },
        { label: "Video Background", value: "video-bg" },
      ],
    },
    { name: "badge", type: "text", localized: true, label: "バッジテキスト (オプション)" },
    { name: "title", type: "text", required: true, localized: true, label: "メインタイトル" },
    { name: "subtitle", type: "textarea", localized: true, label: "サブタイトル" },
    {
      name: "primaryCta",
      type: "group",
      label: "メイン CTA",
      fields: [
        { name: "label", type: "text", localized: true },
        { name: "href", type: "text" },
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
    { name: "image", type: "upload", relationTo: "media", label: "画像 (split-image / video-bg variant 用)" },
    { name: "videoUrl", type: "text", label: "動画 URL (video-bg variant)" },
    { name: "stats", type: "array", label: "統計バー (オプション)", fields: [
      { name: "value", type: "text", required: true },
      { name: "label", type: "text", localized: true },
    ]},
  ],
}
