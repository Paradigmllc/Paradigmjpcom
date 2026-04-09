import { buildConfig } from "payload"
import { postgresAdapter } from "@payloadcms/db-postgres"
import { lexicalEditor } from "@payloadcms/richtext-lexical"
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
import { Settings } from "./src/globals/Settings"

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL || "https://paradigmjp.com",
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: "— Paradigm CMS",
      icons: [{ rel: "icon", type: "image/png", url: "/favicon.ico" }],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Posts, Services, FAQs, Works, Pricing, Leads, Media],
  globals: [Settings],
  editor: lexicalEditor({}),
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
  localization: {
    locales: [
      { label: "日本語", code: "ja" },
      { label: "English", code: "en" },
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
