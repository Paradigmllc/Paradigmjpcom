import type { GlobalConfig } from "payload"
import { AVAILABLE_LOCALE_OPTIONS } from "../collections/_localeOptions"
import { isAdminField } from "../access/byRole"

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
    // 2026-05-21: 管理画面拡張 — SEO 既定値。各 page.tsx が個別指定しない場合の fallback。
    {
      name: "seo",
      type: "group",
      label: "SEO 既定値",
      admin: {
        description: "各ページが個別指定しない場合に使われる既定の SEO 値。",
      },
      fields: [
        { name: "defaultMetaTitle", type: "text", label: "既定メタタイトル", localized: true },
        { name: "defaultMetaDescription", type: "textarea", label: "既定メタディスクリプション", localized: true },
        { name: "keywords", type: "text", label: "キーワード (カンマ区切り)", localized: true },
        { name: "defaultOgImage", type: "upload", relationTo: "media", label: "既定 OG 画像 (1200×630px)" },
        { name: "favicon", type: "upload", relationTo: "media", label: "Favicon (任意・未設定時 /favicon.svg)" },
        { name: "twitterHandle", type: "text", label: "X (Twitter) @ハンドル", admin: { description: "例: @paradigm_jp" } },
      ],
    },
    // 2026-05-21: 解析・トラッキング ID。空なら読み込まない (V ルール: 空文字 fallback 禁止 → 未設定=無効)。
    {
      name: "tracking",
      type: "group",
      label: "解析・トラッキング",
      admin: {
        description: "GTM / GA4 / Meta Pixel の ID。空欄なら読み込みません。Umami は別 (umamiByLocale)。",
      },
      fields: [
        { name: "gtmId", type: "text", label: "Google Tag Manager ID", admin: { description: "例: GTM-XXXXXXX" } },
        { name: "ga4Id", type: "text", label: "GA4 測定 ID", admin: { description: "例: G-XXXXXXXXXX" } },
        { name: "metaPixelId", type: "text", label: "Meta Pixel ID" },
        {
          name: "headScripts",
          type: "code",
          label: "<head> カスタムスクリプト",
          access: { update: isAdminField, read: isAdminField },
          admin: {
            language: "html",
            description: "⚠️ admin のみ編集可。信頼できるコードのみ。<head> 末尾に挿入されます (XSS リスク)。",
          },
        },
        {
          name: "bodyScripts",
          type: "code",
          label: "<body> 末尾カスタムスクリプト",
          access: { update: isAdminField, read: isAdminField },
          admin: {
            language: "html",
            description: "⚠️ admin のみ編集可。信頼できるコードのみ。<body> 末尾に挿入されます (XSS リスク)。",
          },
        },
      ],
    },
    // 2026-05-21: お知らせバー (上部帯)。enabled=true で全ページ最上部に表示。
    {
      name: "announcement",
      type: "group",
      label: "お知らせバー (上部帯)",
      admin: { description: "サイト最上部の告知バー。表示する場合は enabled を ON。" },
      fields: [
        { name: "enabled", type: "checkbox", label: "表示する", defaultValue: false },
        { name: "message", type: "text", label: "メッセージ", localized: true },
        { name: "linkLabel", type: "text", label: "リンクテキスト (任意)", localized: true },
        { name: "linkHref", type: "text", label: "リンク先 (任意)" },
        {
          name: "variant",
          type: "select",
          label: "配色",
          defaultValue: "ink",
          options: [
            { label: "Ink (濃色)", value: "ink" },
            { label: "Accent (アクセント)", value: "accent" },
            { label: "Tech (ティール)", value: "tech" },
          ],
        },
      ],
    },
    // 2026-05-21: 会社情報 (法的表記・特商法・構造化データ用)。
    {
      name: "company",
      type: "group",
      label: "会社情報 (法的表記・特商法)",
      admin: { description: "特定商取引法・フッター・構造化データで使う会社の正式情報。" },
      fields: [
        { name: "legalName", type: "text", label: "正式名称", defaultValue: "Paradigm合同会社" },
        { name: "representativeName", type: "text", label: "代表者名" },
        { name: "registrationNumber", type: "text", label: "法人番号 / 登記番号" },
        { name: "foundedYear", type: "text", label: "設立年" },
        { name: "postalCode", type: "text", label: "郵便番号" },
        { name: "address", type: "textarea", label: "所在地", localized: true },
      ],
    },
    // 2026-05-12: 12-locale 対応のため array 形式に移行。
    // 旧 `analytics.umamiWebsiteId(En)` / `calendarUrl.ja(en)` は legacy として残す
    // (data loss 防止・admin が手動で新 array へ移行後 P19 で drop 予定)。
    {
      name: "umamiByLocale",
      type: "array",
      label: "Umami Website ID (locale 別・12 locale 対応)",
      admin: {
        description: "locale 別の Umami site ID。lookup は当該 locale → ja → null の順で fallback。",
      },
      fields: [
        {
          name: "locale",
          type: "select",
          required: true,
          options: AVAILABLE_LOCALE_OPTIONS,
          admin: { width: "30%" },
        },
        {
          name: "websiteId",
          type: "text",
          required: true,
          admin: { width: "70%", description: "Umami が払い出す UUID" },
        },
      ],
    },
    {
      name: "calendarByLocale",
      type: "array",
      label: "予約カレンダー URL (locale 別・12 locale 対応)",
      admin: {
        description: "locale 別の Cal.com URL。lookup は当該 locale → ja → default の順で fallback。",
      },
      fields: [
        {
          name: "locale",
          type: "select",
          required: true,
          options: AVAILABLE_LOCALE_OPTIONS,
          admin: { width: "30%" },
        },
        {
          name: "url",
          type: "text",
          required: true,
          admin: { width: "70%", description: "例: https://cal.com/paradigm/intro-en" },
        },
      ],
    },
    {
      name: "analytics",
      type: "group",
      label: "[legacy] アナリティクス設定 (旧 2-locale 形式・新規は umamiByLocale を使用)",
      admin: {
        description: "非推奨: umamiByLocale (array) を使用してください。後方互換のため残存。",
      },
      fields: [
        {
          name: "umamiWebsiteId",
          type: "text",
          label: "[legacy] Umami Website ID (ja)",
        },
        {
          name: "umamiWebsiteIdEn",
          type: "text",
          label: "[legacy] Umami Website ID (en)",
        },
      ],
    },
    {
      name: "calendarUrl",
      type: "group",
      label: "[legacy] 予約カレンダー (旧 2-locale 形式・新規は calendarByLocale を使用)",
      admin: {
        description: "非推奨: calendarByLocale (array) を使用してください。後方互換のため残存。",
      },
      fields: [
        {
          name: "ja",
          type: "text",
          label: "[legacy] 日本語予約URL",
        },
        {
          name: "en",
          type: "text",
          label: "[legacy] English booking URL",
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
