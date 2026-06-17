import { buildConfig } from "payload"
import { postgresAdapter } from "@payloadcms/db-postgres"
import { resolveDatabaseUriOrThrow, shouldUseSsl, checkDatabaseReachable, logDbConnectionInfo } from "./src/lib/resolve-database-uri"
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
      const msg = "[payload] PAYLOAD_SECRET is not set"
      console.error(msg)
      // Only crash in production; allow dev/build to proceed (payload will fail gracefully at request time)
      if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
        throw new Error(msg)
      }
      console.warn("[payload] PAYLOAD_SECRET missing — PayloadCMS will fail at request time")
      return "dev-unsafe-secret"
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
        console.info("[payload] no users found — auto-seeding admin user")
        await payload.create({
          collection: "users",
          data: {
            email: adminEmail,
            password: adminPassword,
            name: "Admin",
            role: "admin",
          },
        })
        console.info("[payload] admin user seeded successfully")
        return
      }
      // Existing users present — NEVER overwrite passwords or roles
      const existing = await payload.find({ collection: "users", where: { email: { equals: adminEmail } }, limit: 1 })
      if (existing.totalDocs === 0) {
        console.info("[payload] admin email not found among existing users — seeding new admin")
        await payload.create({
          collection: "users",
          data: {
            email: adminEmail,
            password: adminPassword,
            name: "Admin",
            role: "admin",
          },
        })
        console.info("[payload] admin user seeded successfully")
      } else {
        console.info("[payload] admin user already exists — preserving existing credentials")
      }
    } catch (e) {
      console.error("[payload] auto-seed admin user failed:", e)
    }
  },
  typescript: {
    outputFile: path.resolve(dirname, "src/payload-types.ts"),
  },
  db: postgresAdapter({
    pool: (() => {
      const uri = resolveDatabaseUriOrThrow()
      if (!uri) {
        console.error("[payload] DATABASE_URI could not be resolved — PayloadCMS will fail to start")
      }
      const masked = uri ? uri.replace(/:([^:@]+)@/, ":****@") : "(empty)"
      const isPooler = uri.includes("pooler.supabase.com")
      const isTransactionMode = uri.includes(":6543")
      console.log(`[payload] database: ${masked} | pooler=${isPooler} | mode=${isTransactionMode ? "transaction" : "session/direct"}`)

      // Append PostgreSQL safety options to connection string.
      // For Transaction mode pooler (port 6543), also include search_path since SET doesn't persist.
      let connString = uri
      if (!connString.includes("options=")) {
        const sep = connString.includes("?") ? "&" : "?"
        const safetyOpts = "statement_timeout%3D30000"
        const lockOpts = "lock_timeout%3D10000"
        const idleOpts = "idle_in_transaction_session_timeout%3D20000"
        if (isTransactionMode) {
          connString = `${connString}${sep}options=-c%20${safetyOpts}%20-c%20search_path%3Dparadigm%20-c%20${lockOpts}%20-c%20${idleOpts}`
        } else {
          connString = `${connString}${sep}options=-c%20${safetyOpts}%20-c%20${lockOpts}%20-c%20${idleOpts}`
        }
        console.log(`[payload] safety options appended to connection string`)
      }

      const poolConfig: Record<string, unknown> = {
        connectionString: connString,
        max: 2,
        idleTimeoutMillis: 20000,
        connectionTimeoutMillis: 10000,
        application_name: "paradigm_payload",
      }

      if (isPooler) {
        poolConfig.ssl = { rejectUnauthorized: false }
      } else {
        poolConfig.ssl = shouldUseSsl(uri)
      }

      return poolConfig
    })(),
    schemaName: "paradigm",
    push: true, // TEMP: 初回スキーマ作成後に false に戻す
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
