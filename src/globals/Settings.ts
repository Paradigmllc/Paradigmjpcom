import type { GlobalConfig } from "payload"

export const Settings: GlobalConfig = {
  slug: "settings",
  label: "サイト設定",
  admin: {
    description: "サイト全体の設定",
    group: "設定",
  },
  fields: [
    {
      name: "siteName",
      type: "text",
      label: "サイト名",
      localized: true,
      defaultValue: "Paradigm合同会社",
    },
    {
      name: "tagline",
      type: "text",
      label: "キャッチコピー",
      localized: true,
      defaultValue: "デジタルで事業を加速する",
    },
    {
      name: "description",
      type: "textarea",
      label: "サイト説明文（SEO）",
      localized: true,
    },
    {
      name: "contact",
      type: "group",
      label: "連絡先情報",
      fields: [
        {
          name: "email",
          type: "email",
          label: "メールアドレス",
        },
        {
          name: "phone",
          type: "text",
          label: "電話番号",
        },
        {
          name: "address",
          type: "textarea",
          label: "住所",
          localized: true,
        },
        {
          name: "businessHours",
          type: "text",
          label: "営業時間",
          localized: true,
        },
      ],
    },
    {
      name: "social",
      type: "group",
      label: "SNSリンク",
      fields: [
        {
          name: "twitter",
          type: "text",
          label: "X (Twitter) URL",
        },
        {
          name: "instagram",
          type: "text",
          label: "Instagram URL",
        },
        {
          name: "facebook",
          type: "text",
          label: "Facebook URL",
        },
        {
          name: "linkedin",
          type: "text",
          label: "LinkedIn URL",
        },
        {
          name: "line",
          type: "text",
          label: "LINE公式アカウントURL",
        },
      ],
    },
    {
      name: "maintenance",
      type: "group",
      label: "メンテナンス設定",
      fields: [
        {
          name: "maintenanceMode",
          type: "checkbox",
          label: "メンテナンスモード",
          defaultValue: false,
        },
        {
          name: "maintenanceMessage",
          type: "text",
          label: "メンテナンスメッセージ",
          localized: true,
        },
      ],
    },
    {
      name: "analytics",
      type: "group",
      label: "アナリティクス設定",
      fields: [
        {
          name: "umamiWebsiteId",
          type: "text",
          label: "Umami Website ID",
        },
        {
          name: "umamiWebsiteIdEn",
          type: "text",
          label: "Umami Website ID（英語版）",
        },
      ],
    },
    {
      name: "calendarUrl",
      type: "group",
      label: "予約カレンダー",
      fields: [
        {
          name: "ja",
          type: "text",
          label: "日本語予約URL",
        },
        {
          name: "en",
          type: "text",
          label: "English booking URL",
        },
      ],
    },
    // 2026-05-01: admin で色・フォント・角丸を直接編集可能にする theme group。
    // layout.tsx で themeTokensToCss() 経由で <style id="theme-overrides"> として注入。
    {
      name: "theme",
      type: "group",
      label: "デザインテーマ (色 / フォント / 角丸)",
      admin: {
        description:
          "色・フォント・角丸を admin から編集します。空のままならデフォルトを使用。色は #FAFAF7 / rgb(250, 250, 247) / 250 250 247 のいずれかの形式。",
      },
      fields: [
        {
          name: "colors",
          type: "group",
          label: "カラーパレット",
          fields: [
            { name: "paper", type: "text", label: "Paper (背景)", admin: { description: "デフォルト: #FAFAF7" } },
            { name: "paperDeep", type: "text", label: "Paper Deep (サーフェス)", admin: { description: "デフォルト: #F1F0EA" } },
            { name: "ink", type: "text", label: "Ink (主要テキスト・暗色背景)", admin: { description: "デフォルト: #1C1C2E" } },
            { name: "inkSoft", type: "text", label: "Ink Soft (副テキスト)" },
            { name: "inkMute", type: "text", label: "Ink Mute (薄テキスト)" },
            { name: "line", type: "text", label: "Line (罫線)" },
            {
              name: "accent",
              type: "text",
              label: "Accent (主要アクセント)",
              admin: { description: "デフォルト: #6366F1 (インディゴ)" },
            },
            {
              name: "tech",
              type: "text",
              label: "Tech (テクノロジーティール)",
              admin: { description: "デフォルト: #14B8A6" },
            },
            { name: "glow", type: "text", label: "Glow (ハイライト)" },
          ],
        },
        {
          name: "fonts",
          type: "group",
          label: "フォントスタック",
          fields: [
            {
              name: "display",
              type: "text",
              label: "Display フォント (見出し)",
              admin: { description: "例: 'Noto Sans JP', system-ui, sans-serif" },
            },
            {
              name: "body",
              type: "text",
              label: "Body フォント (本文)",
              admin: { description: "例: 'Noto Sans', 'Noto Sans JP', sans-serif" },
            },
          ],
        },
        {
          name: "radius",
          type: "group",
          label: "角丸",
          fields: [
            { name: "sm", type: "text", label: "Small (例: 8px)" },
            { name: "md", type: "text", label: "Default (例: 12px)" },
            { name: "lg", type: "text", label: "Large (例: 24px)" },
          ],
        },
      ],
    },
  ],
}
