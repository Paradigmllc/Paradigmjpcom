import { buildConfig } from "payload"
import { postgresAdapter } from "@payloadcms/db-postgres"
import { resolveDatabaseUriOrThrow, shouldUseSsl } from "./src/lib/resolve-database-uri"
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
import { Pages } from "./src/collections/Pages"
import { TeamMembers } from "./src/collections/TeamMembers"
import { Testimonials } from "./src/collections/Testimonials"
import { Categories } from "./src/collections/Categories"
import { Settings } from "./src/globals/Settings"
import { Header } from "./src/globals/Header"
import { Footer } from "./src/globals/Footer"

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
        Logo: "./src/components/admin/Logo#default",
        Icon: "./src/components/admin/Icon#default",
      },
      // 2026-05-21: dashboard 上部にサイト概要パネル (件数 / リード / 監査 / 新規作成)。
      // 既定 dashboard は維持し、その上に概要を足す (beforeDashboard)。
      beforeDashboard: ["./src/components/admin/BeforeDashboard#default"],
    },
    livePreview: {
      // locale-aware: admin が編集中の locale を URL に反映 (Pages collection と整合)。
      url: ({ data, collectionConfig, locale }) => {
        const slug = (data as { slug?: string } | undefined)?.slug
        const id = (data as { id?: string | number } | undefined)?.id
        const col = collectionConfig?.slug
        const previewLocale =
          (typeof locale === "object" && locale && "code" in locale
            ? (locale as { code: string }).code
            : undefined) ??
          (typeof locale === "string" ? locale : undefined) ??
          "ja"
        if (col === "posts" && slug) return `${SERVER_URL}/${previewLocale}/blog/${slug}?draft=true`
        if (col === "services" && slug) return `${SERVER_URL}/${previewLocale}/services/${slug}?draft=true`
        if (col === "works" && slug) return `${SERVER_URL}/${previewLocale}/works/${slug}?draft=true`
        if (col === "pricing" && id) return `${SERVER_URL}/${previewLocale}/pricing?highlight=${id}&draft=true`
        if (col === "faqs" && id) return `${SERVER_URL}/${previewLocale}/faq?highlight=${id}&draft=true`
        return `${SERVER_URL}/${previewLocale}?draft=true`
      },
      collections: ["posts", "services", "works", "pricing", "faqs", "pages"],
      breakpoints: [
        { label: "Mobile", name: "mobile", width: 375, height: 667 },
        { label: "Tablet", name: "tablet", width: 768, height: 1024 },
        { label: "Desktop", name: "desktop", width: 1440, height: 900 },
      ],
    },
    importMap: {
      baseDir: process.cwd(),
    },
  },
  // P17 2026-04-27: admin UI も 12 言語対応
  i18n: {
    fallbackLanguage: "ja",
    supportedLanguages: { ja, en, ko, zh, de, fr, es, pt, ru, ar, vi, id },
  },
  collections: [
    Users,
    Posts,
    Services,
    FAQs,
    Works,
    Pricing,
    Leads,
    Media,
    AuditLogs,
    Pages,
    TeamMembers,
    Testimonials,
    Categories,
  ],
  globals: [Settings, Header, Footer],
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
  secret: (() => {
    const s = process.env.PAYLOAD_SECRET
    if (!s) {
      console.error("[payload] PAYLOAD_SECRET is not set — refusing to start")
      process.exit(1)
    }
    return s
  })(),
  onInit: async (payload) => {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.PAYLOAD_ADMIN_EMAIL
    const adminPassword = process.env.ADMIN_PASSWORD
    if (!adminEmail || !adminPassword) {
      console.warn("[payload] ADMIN_EMAIL/ADMIN_PASSWORD not set — skipping auto-seed")
      return
    }
    try {
      const { totalDocs } = await payload.find({ collection: "users", limit: 0 })
      if (totalDocs === 0) {
        console.log("[payload] no users found — auto-seeding admin user:", adminEmail)
        await payload.create({
          collection: "users",
          data: {
            email: adminEmail,
            password: adminPassword,
            name: "Admin",
            role: "admin",
          },
        })
        console.log("[payload] admin user seeded successfully")
        return
      }
      const existing = await payload.find({ collection: "users", where: { email: { equals: adminEmail } }, limit: 1 })
      if (existing.totalDocs > 0) {
        const user = existing.docs[0]
        if (user) {
          await payload.update({
            collection: "users",
            id: user.id as number,
            data: { password: adminPassword, role: "admin" },
          })
          console.log("[payload] admin user password synced:", adminEmail)
        }
      } else {
        console.log("[payload] admin email not found among existing users — seeding new admin:", adminEmail)
        await payload.create({
          collection: "users",
          data: {
            email: adminEmail,
            password: adminPassword,
            name: "Admin",
            role: "admin",
          },
        })
        console.log("[payload] admin user seeded successfully")
      }
    } catch (e) {
      console.error("[payload] auto-seed admin user failed:", e)
    }
  },
  typescript: {
    outputFile: path.resolve(dirname, "src/payload-types.ts"),
  },
  db: postgresAdapter({
    pool: {
      connectionString: (() => {
        const uri = resolveDatabaseUriOrThrow()
        if (!uri) {
          console.error("[payload] DATABASE_URI could not be resolved from environment — PayloadCMS will fail to start")
        } else {
          const masked = uri.replace(/:([^:@]+)@/, ":****@")
          console.log(`[payload] using database: ${masked}`)
        }
        return uri
      })(),
      ssl: shouldUseSsl(resolveDatabaseUriOrThrow()),
      max: 8,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 30000,
    },
    // 2026-05-20: 専用 schema "paradigm" に分離。旧 "payload" は別アプリ
    // (articles/guides/tools/homepage 等・owner=postgres) に占有され、paradigm の
    // posts/services/pricing/works/faqs/pages が作成できず動的コンテンツ未配信 +
    // build 時 EMAXCONNSESSION の根本原因だった。"paradigm" スキーマ
    // (owner=payload_user・migration_005 で作成済) に切替え push でテーブル生成。
    // 問題時は "payload" に 1 行 revert 可。
    schemaName: "paradigm",
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
