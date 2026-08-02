import { createHash, randomUUID } from "node:crypto"
import { z } from "zod"
import { getAllBlogPosts, getBlogPostBySlug } from "@/lib/blog-cms"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { getServiceSalesSupabase } from "@/lib/supabase"

export const CONTENT_LOCALES = ["ja", "en"] as const
export type ContentLocale = (typeof CONTENT_LOCALES)[number]

export const CONTENT_ACCESS_MODELS = ["free", "x402"] as const
export type ContentAccessModel = (typeof CONTENT_ACCESS_MODELS)[number]

const contentProductSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(3).max(120),
  locale: z.enum(CONTENT_LOCALES),
  title: z.string().min(1).max(240),
  summary: z.string().min(1).max(1_000),
  content_type: z.string().min(1).max(80),
  access_model: z.enum(CONTENT_ACCESS_MODELS),
  price_usdc: z.coerce.number().min(0),
  network: z.string().min(1).max(100),
  preview: z.record(z.string(), z.unknown()),
  payload: z.record(z.string(), z.unknown()).optional(),
  source_url: z.string().url().nullable(),
  license: z.string().min(1).max(200),
  version: z.coerce.number().int().positive(),
  published_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
})

export interface ContentCatalogItem {
  slug: string
  locale: ContentLocale
  title: string
  summary: string
  contentType: string
  accessModel: ContentAccessModel
  price: { amount: string; currency: "USDC" } | null
  network: string | null
  preview: Record<string, unknown>
  sourceUrl: string | null
  license: string
  version: number
  publishedAt: string
  updatedAt: string
  endpoint: string
}

export interface PremiumContentProduct extends ContentCatalogItem {
  id: string
  payload: Record<string, unknown>
}

export interface PublicArticleContent extends ContentCatalogItem {
  content: string
  category: string
  tags: string[]
  readTime: string
}

export type ContentAccessOutcome =
  | "served"
  | "payment_required"
  | "paid"
  | "not_found"
  | "unavailable"
  | "error"

export interface ContentAccessEventInput {
  requestId?: string
  productId?: string | null
  productSlug?: string | null
  locale: ContentLocale
  accessChannel: "catalog" | "public_api" | "x402"
  outcome: ContentAccessOutcome
  httpStatus: number
  priceUsdc?: number | null
  network?: string | null
  paymentReference?: string | null
  clientIp?: string | null
  userAgent?: string | null
  metadata?: Record<string, unknown>
}

export class ContentCommerceError extends Error {
  constructor(
    message: string,
    public readonly code: "CONTENT_DATABASE_UNAVAILABLE" | "CONTENT_DATABASE_ERROR" | "CONTENT_DATA_INVALID",
  ) {
    super(message)
    this.name = "ContentCommerceError"
  }
}

export function normalizeContentLocale(value: string | null | undefined): ContentLocale {
  return value === "ja" ? "ja" : "en"
}

export function isSafeContentSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 120
}

function formatUsdc(value: number): string {
  return value.toFixed(6).replace(/(?:\.0+|(?<=[0-9])0+)$/, "").replace(/\.$/, "")
}

function toCatalogItem(row: z.infer<typeof contentProductSchema>): ContentCatalogItem {
  const paid = row.access_model === "x402"
  return {
    slug: row.slug,
    locale: row.locale,
    title: row.title,
    summary: row.summary,
    contentType: row.content_type,
    accessModel: row.access_model,
    price: paid ? { amount: formatUsdc(row.price_usdc), currency: "USDC" } : null,
    network: paid ? row.network : null,
    preview: row.preview,
    sourceUrl: row.source_url,
    license: row.license,
    version: row.version,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    endpoint: paid
      ? `/api/v1/content/premium/${row.slug}?locale=${row.locale}`
      : `/api/v1/content/public/${row.slug}?locale=${row.locale}`,
  }
}

function parseProductRows(rows: unknown[]): Array<z.infer<typeof contentProductSchema>> {
  return rows.map((row) => {
    const parsed = contentProductSchema.safeParse(row)
    if (!parsed.success) {
      throw new ContentCommerceError(
        `Content product failed validation: ${parsed.error.issues[0]?.message ?? "unknown issue"}`,
        "CONTENT_DATA_INVALID",
      )
    }
    return parsed.data
  })
}

function contentDatabase() {
  const database = getServiceSalesSupabase()
  if (!database) {
    throw new ContentCommerceError(
      "Content commerce database is not configured.",
      "CONTENT_DATABASE_UNAVAILABLE",
    )
  }
  return database
}

export async function listPremiumProducts(locale: ContentLocale): Promise<ContentCatalogItem[]> {
  const database = contentDatabase()
  const { data, error } = await database
    .from(DB_TABLES.CONTENT_PRODUCTS)
    .select("id,slug,locale,title,summary,content_type,access_model,price_usdc,network,preview,source_url,license,version,published_at,updated_at")
    .eq("locale", locale)
    .eq("is_active", true)
    .order("published_at", { ascending: false })

  if (error) {
    throw new ContentCommerceError(error.message, "CONTENT_DATABASE_ERROR")
  }

  return parseProductRows((data ?? []) as unknown[]).map(toCatalogItem)
}

export async function getPremiumProduct(
  slug: string,
  locale: ContentLocale,
): Promise<PremiumContentProduct | null> {
  const database = contentDatabase()
  const { data, error } = await database
    .from(DB_TABLES.CONTENT_PRODUCTS)
    .select("id,slug,locale,title,summary,content_type,access_model,price_usdc,network,preview,payload,source_url,license,version,published_at,updated_at")
    .eq("slug", slug)
    .eq("locale", locale)
    .eq("is_active", true)
    .maybeSingle()

  if (error) {
    throw new ContentCommerceError(error.message, "CONTENT_DATABASE_ERROR")
  }
  if (!data) return null

  const row = parseProductRows([data as unknown])[0]
  if (!row?.payload) {
    throw new ContentCommerceError("Premium content payload is missing.", "CONTENT_DATA_INVALID")
  }
  return { id: row.id, ...toCatalogItem(row), payload: row.payload }
}

export async function listPublicArticles(locale: ContentLocale): Promise<ContentCatalogItem[]> {
  const posts = await getAllBlogPosts(locale)
  return posts.map((post) => ({
    slug: post.slug,
    locale,
    title: post.title,
    summary: post.excerpt,
    contentType: "article",
    accessModel: "free",
    price: null,
    network: null,
    preview: { category: post.category, tags: post.tags, readTime: post.readTime },
    sourceUrl: `https://paradigmjp.com/${locale}/blog/${post.slug}`,
    license: "Paradigm API Terms",
    version: 1,
    publishedAt: post.date ? new Date(`${post.date}T00:00:00.000Z`).toISOString() : new Date(0).toISOString(),
    updatedAt: post.date ? new Date(`${post.date}T00:00:00.000Z`).toISOString() : new Date(0).toISOString(),
    endpoint: `/api/v1/content/public/${post.slug}?locale=${locale}`,
  }))
}

export async function getPublicArticle(
  slug: string,
  locale: ContentLocale,
): Promise<PublicArticleContent | null> {
  const post = await getBlogPostBySlug(slug, locale)
  if (!post) return null
  return {
    slug: post.slug,
    locale,
    title: post.title,
    summary: post.excerpt,
    contentType: "article",
    accessModel: "free",
    price: null,
    network: null,
    preview: { category: post.category, tags: post.tags, readTime: post.readTime },
    sourceUrl: `https://paradigmjp.com/${locale}/blog/${post.slug}`,
    license: "Paradigm API Terms",
    version: 1,
    publishedAt: post.date ? new Date(`${post.date}T00:00:00.000Z`).toISOString() : new Date(0).toISOString(),
    updatedAt: post.date ? new Date(`${post.date}T00:00:00.000Z`).toISOString() : new Date(0).toISOString(),
    endpoint: `/api/v1/content/public/${post.slug}?locale=${locale}`,
    content: post.content,
    category: post.category,
    tags: post.tags,
    readTime: post.readTime,
  }
}

function hashClientIp(clientIp: string | null | undefined): string | null {
  if (!clientIp) return null
  const salt = process.env.CONTENT_ACCESS_HASH_SALT?.trim()
  if (!salt) {
    if (process.env.NODE_ENV === "production") {
      console.error("[content-commerce] CONTENT_ACCESS_HASH_SALT is required to retain privacy-safe client correlation")
    }
    return null
  }
  return createHash("sha256").update(`${salt}:${clientIp}`).digest("hex")
}

export function hashPaymentReference(value: string | null | undefined): string | null {
  if (!value) return null
  return createHash("sha256").update(value).digest("hex")
}

export async function recordContentAccess(input: ContentAccessEventInput): Promise<boolean> {
  const database = getServiceSalesSupabase()
  if (!database) {
    console.error("[content-commerce] access event was not persisted because Supabase is unavailable")
    return false
  }

  try {
    const { error } = await database.from(DB_TABLES.CONTENT_ACCESS_EVENTS).insert({
      request_id: input.requestId ?? randomUUID(),
      product_id: input.productId ?? null,
      product_slug: input.productSlug ?? null,
      locale: input.locale,
      access_channel: input.accessChannel,
      outcome: input.outcome,
      http_status: input.httpStatus,
      price_usdc: input.priceUsdc ?? null,
      network: input.network ?? null,
      payment_reference: input.paymentReference ?? null,
      client_ip_hash: hashClientIp(input.clientIp),
      user_agent: input.userAgent?.slice(0, 300) ?? null,
      metadata: input.metadata ?? {},
    })

    if (error) {
      console.error("[content-commerce] access event insert failed:", error.message)
      return false
    }
    return true
  } catch (error) {
    console.error("[content-commerce] access event insert threw:", error)
    return false
  }
}
