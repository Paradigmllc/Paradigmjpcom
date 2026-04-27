import { buildConfig } from "payload"
import { postgresAdapter } from "@payloadcms/db-postgres"
import {
  lexicalEditor,
  FixedToolbarFeature,
  HeadingFeature,
  LinkFeature,
  UploadFeature,
  BlockquoteFeature,
  InlineCodeFeature,
  HorizontalRuleFeature,
} from "@payloadcms/richtext-lexical"
// Admin UI 多言語（@payloadcms/translations から import）
import { ja } from "@payloadcms/translations/languages/ja"
import { en } from "@payloadcms/translations/languages/en"
import { ko } from "@payloadcms/translations/languages/ko"
import { zh } from "@payloadcms/translations/languages/zh"
import { de } from "@payloadcms/translations/languages/de"
import { fr } from "@payloadcms/translations/languages/fr"
import { es } from "@payloadcms/translations/languages/es"
import { pt } from "@payloadcms/translations/languages/pt"
import { ru } from "@payloadcms/translations/languages/ru"
import { ar } from "@payloadcms/translations/languages/ar"
import { vi } from "@payloadcms/translations/languages/vi"
import { id } from "@payloadcms/translations/languages/id"
import path from "path"
import { fileURLToPath } from "url"
import sharp from "sharp"

import { Users } from "./src/collections/Users"
import { Posts } from "./src/collections/Posts"
import { Services } from "./src/collections/Services"
import { FAQs } from "./src/collections/FAQs"
import { Works } from "./src/collections/Works"
import { Pricing } from "./src/collections/Pricing"
import { Leads } from "./src/collections/Leads"
import { Media } from "./src/collections/Media"
import { AuditLogs } from "./src/collections/AuditLogs"
import { Settings } from "./src/globals/Settings"

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const SERVER_URL =
  process.env.PAYLOAD_PUBLIC_SERVER_URL || "https://paradigmjp.com"

export default buildConfig({
  serverURL: SERVER_URL,
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: "— Paradigm CMS",
      icons: [{ rel: "icon", type: "image/png", url: "/favicon.ico" }],
    },
    components: {
      graphics: {
        Logo: "/src/components/admin/Logo#default",
        Icon: "/src/components/admin/Icon#default",
      },
      views: {
        dashboard: {
          Component: "/src/components/admin/Dashboard#default",
        },
      },
    },
    livePreview: {
      url: ({ data, collectionConfig }) => {
        const slug = (data as { slug?: string } | undefined)?.slug
        const id = (data as { id?: string | number } | undefined)?.id
        const col = collectionConfig?.slug
        if (col === "posts" && slug) return `${SERVER_URL}/ja/blog/${slug}?draft=true`
        if (col === "services" && slug) return `${SERVER_URL}/ja/services/${slug}?draft=true`
        if (col === "works" && slug) return `${SERVER_URL}/ja/works/${slug}?draft=true`
        if (col === "pricing" && id) return `${SERVER_URL}/ja/pricing?highlight=${id}&draft=true`
        if (col === "faqs" && id) return `${SERVER_URL}/ja/faq?highlight=${id}&draft=true`
        return `${SERVER_URL}/ja?draft=true`
      },
      collections: ["posts", "services", "works", "pricing", "faqs"],
      breakpoints: [
        { label: "Mobile", name: "mobile", width: 375, height: 667 },
        { label: "Tablet", name: "tablet", width: 768, height: 1024 },
        { label: "Desktop", name: "desktop", width: 1440, height: 900 },
      ],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  // P17 2026-04-27: admin UI も 12 言語対応
  i18n: {
    fallbackLanguage: "ja",
    supportedLanguages: { ja, en, ko, zh, de, fr, es, pt, ru, ar, vi, id },
  },
  collections: [Users, Posts, Services, FAQs, Works, Pricing, Leads, Media, AuditLogs],
  globals: [Settings],
  editor: lexicalEditor({
    features: ({ defaultFeatures }) => [
      ...defaultFeatures,
      FixedToolbarFeature(),
      HeadingFeature({ enabledHeadingSizes: ["h1", "h2", "h3", "h4"] }),
      LinkFeature({
        enabledCollections: ["posts", "services", "works"],
        fields: ({ defaultFields }) => [
          ...defaultFields,
          {
            name: "rel",
            type: "select",
            label: "rel属性",
            options: ["noopener", "noreferrer", "nofollow", "sponsored"],
            hasMany: true,
            admin: { description: "外部リンクの場合は noopener + noreferrer 推奨" },
          },
        ],
      }),
      UploadFeature({ collections: { media: { fields: [] } } }),
      BlockquoteFeature(),
      InlineCodeFeature(),
      HorizontalRuleFeature(),
    ],
  }),
  secret: process.env.PAYLOAD_SECRET || "fallback-secret-change-in-production",
  typescript: {
    outputFile: path.resolve(dirname, "src/payload-types.ts"),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || "",
    },
    push: true,
  }),
  sharp,
  // P17 2026-04-27: コンテンツ多言語化も 12 言語対応
  // 既存 Posts/Services/Works/FAQs/Pricing/Settings の `localized: true` 列が自動で 12 言語分の JSONB 値を持つ
  // fallback: true で空翻訳は ja に自動フォールバック（next-intl と整合）
  localization: {
    locales: [
      { label: "日本語", code: "ja" },
      { label: "English", code: "en" },
      { label: "한국어", code: "ko" },
      { label: "中文", code: "zh" },
      { label: "Deutsch", code: "de" },
      { label: "Français", code: "fr" },
      { label: "Español", code: "es" },
      { label: "Português", code: "pt" },
      { label: "Русский", code: "ru" },
      { label: "العربية", code: "ar", rtl: true },
      { label: "Tiếng Việt", code: "vi" },
      { label: "Bahasa Indonesia", code: "id" },
    ],
    defaultLocale: "ja",
    fallback: true,
  },
  upload: {
    limits: {
      fileSize: 10_000_000, // 10MB
    },
  },
})
