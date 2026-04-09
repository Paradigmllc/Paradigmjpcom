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
  ],
}
