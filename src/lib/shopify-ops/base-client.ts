import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"
import { z } from "zod"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { getServiceSalesSupabase } from "@/lib/supabase"
import type { BaseItem } from "./base-sync"
import { isRetryableHttpStatus, RetryableExternalError, retryableHttpError, withExternalRetry } from "./external-retry"

const BASE_API = "https://api.thebase.in/1"
const TOKEN_REFRESH_WINDOW_MS = 5 * 60 * 1_000

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_in: z.coerce.number().int().positive(),
})

const baseUserSchema = z.object({
  user: z.object({
    shop_id: z.string(),
    shop_name: z.string(),
    shop_url: z.string(),
  }),
})

const baseVariationSchema = z.object({
  variation_id: z.coerce.number().int().positive(),
  variation: z.string(),
  variation_stock: z.coerce.number().int().min(0),
  variation_identifier: z.string().nullable().optional().transform((value) => value ?? null),
  barcode: z.string().nullable().optional().transform((value) => value ?? null),
})

const baseItemSchema = z.object({
  item_id: z.coerce.number().int().positive(),
  title: z.string(),
  detail: z.string().default(""),
  price: z.coerce.number().min(0),
  proper_price: z.coerce.number().min(0).nullable().optional().transform((value) => value ?? null),
  item_tax_type: z.union([z.literal(1), z.literal(2)]).default(1),
  stock: z.coerce.number().int().min(0),
  visible: z.union([z.literal(0), z.literal(1)]),
  identifier: z.string().nullable().optional().transform((value) => value ?? null),
  modified: z.coerce.number().int().min(0),
  variations: z.array(baseVariationSchema).default([]),
}).loose()

const itemsResponseSchema = z.object({ items: z.array(baseItemSchema) })

const baseApiErrorSchema = z.object({
  error: z.string(),
  error_description: z.string().optional(),
})

type OAuthRow = {
  access_token_ciphertext: string
  refresh_token_ciphertext: string
  expires_at: string
}

function requireDatabase() {
  const database = getServiceSalesSupabase()
  if (!database) throw new Error("BASE同期用データベースが設定されていません")
  return database
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} が設定されていません`)
  return value
}

function encryptionKey(): Buffer {
  const raw = requiredEnv("BASE_TOKEN_ENCRYPTION_KEY")
  if (raw.length < 32) throw new Error("BASE_TOKEN_ENCRYPTION_KEY は32文字以上で設定してください")
  return createHash("sha256").update(raw).digest()
}

function encrypt(value: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".")
}

function decrypt(value: string): string {
  const parts = value.split(".")
  if (parts.length !== 3) throw new Error("BASE OAuthトークンの暗号形式が不正です")
  const [ivRaw, tagRaw, encryptedRaw] = parts
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivRaw, "base64url"))
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"))
  return Buffer.concat([decipher.update(Buffer.from(encryptedRaw, "base64url")), decipher.final()]).toString("utf8")
}

function oauthConfig() {
  return {
    clientId: requiredEnv("BASE_CLIENT_ID"),
    clientSecret: requiredEnv("BASE_CLIENT_SECRET"),
    redirectUri: requiredEnv("BASE_OAUTH_REDIRECT_URI"),
  }
}

export function isBaseAppConfigured(): boolean {
  return ["BASE_CLIENT_ID", "BASE_CLIENT_SECRET", "BASE_OAUTH_REDIRECT_URI", "BASE_TOKEN_ENCRYPTION_KEY"]
    .every((name) => Boolean(process.env[name]?.trim()))
}

export function createBaseAuthorizeUrl(state: string): string {
  const config = oauthConfig()
  const url = new URL(`${BASE_API}/oauth/authorize`)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("client_id", config.clientId)
  url.searchParams.set("redirect_uri", config.redirectUri)
  url.searchParams.set("scope", "read_users read_items")
  url.searchParams.set("state", state)
  return url.toString()
}

async function tokenRequest(parameters: URLSearchParams) {
  const response = await fetch(`${BASE_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: parameters,
    signal: AbortSignal.timeout(15_000),
  })
  const payload = (await response.json()) as unknown
  if (!response.ok) throw new Error(`BASE OAuthが失敗しました (HTTP ${response.status})`)
  return tokenResponseSchema.parse(payload)
}

async function baseGet<T>(path: string, accessToken: string, schema: z.ZodType<T>, query?: URLSearchParams): Promise<T> {
  const url = new URL(`${BASE_API}${path}`)
  if (query) query.forEach((value, key) => url.searchParams.set(key, value))
  return withExternalRetry(`BASE API ${path}`, async () => {
    let response: Response
    try {
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(20_000),
      })
    } catch (error) {
      throw new RetryableExternalError(`BASE API ${path}との通信に失敗しました: ${error instanceof Error ? error.message : String(error)}`)
    }
    if (!response.ok) {
      if (isRetryableHttpStatus(response.status)) throw retryableHttpError(`BASE API ${path}`, response)
      throw new Error(`BASE API ${path} が失敗しました (HTTP ${response.status})`)
    }
    const payload = (await response.json()) as unknown
    const apiError = baseApiErrorSchema.safeParse(payload)
    if (apiError.success) {
      throw new Error(`BASE API ${path}: ${apiError.data.error_description ?? apiError.data.error}`)
    }
    return schema.parse(payload)
  })
}

async function persistTokens(tokens: z.infer<typeof tokenResponseSchema>, user?: z.infer<typeof baseUserSchema>["user"]): Promise<void> {
  const database = requireDatabase()
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1_000).toISOString()
  const row: Record<string, unknown> = {
    id: "primary",
    access_token_ciphertext: encrypt(tokens.access_token),
    refresh_token_ciphertext: encrypt(tokens.refresh_token),
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }
  if (user) {
    row.base_shop_id = user.shop_id
    row.base_shop_name = user.shop_name
    row.base_shop_url = user.shop_url
  }
  const { error } = await database.from(DB_TABLES.SHOPIFY_BASE_OAUTH).upsert(row, { onConflict: "id" })
  if (error) throw new Error(`BASE OAuth情報の保存に失敗しました: ${error.message}`)
}

export async function exchangeBaseAuthorizationCode(code: string): Promise<void> {
  const config = oauthConfig()
  const tokens = await tokenRequest(new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUri,
  }))
  const profile = await baseGet("/users/me", tokens.access_token, baseUserSchema)
  await persistTokens(tokens, profile.user)
}

async function readOAuthRow(): Promise<OAuthRow | null> {
  const database = requireDatabase()
  const { data, error } = await database
    .from(DB_TABLES.SHOPIFY_BASE_OAUTH)
    .select("access_token_ciphertext, refresh_token_ciphertext, expires_at")
    .eq("id", "primary")
    .maybeSingle()
  if (error) throw new Error(`BASE OAuth情報の取得に失敗しました: ${error.message}`)
  return data as OAuthRow | null
}

export async function isBaseShopConnected(): Promise<boolean> {
  if (!isBaseAppConfigured()) return false
  return Boolean(await readOAuthRow())
}

async function validAccessToken(): Promise<string> {
  const row = await readOAuthRow()
  if (!row) throw new Error("BASEショップが未接続です")
  if (new Date(row.expires_at).getTime() > Date.now() + TOKEN_REFRESH_WINDOW_MS) {
    return decrypt(row.access_token_ciphertext)
  }
  const config = oauthConfig()
  const tokens = await tokenRequest(new URLSearchParams({
    grant_type: "refresh_token",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: decrypt(row.refresh_token_ciphertext),
    redirect_uri: config.redirectUri,
  }))
  await persistTokens(tokens)
  return tokens.access_token
}

export async function fetchAllBaseItems(): Promise<BaseItem[]> {
  const accessToken = await validAccessToken()
  const items: BaseItem[] = []
  for (let offset = 0; ; offset += 100) {
    const payload = await baseGet("/items", accessToken, itemsResponseSchema, new URLSearchParams({
      order: "modified",
      sort: "asc",
      limit: "100",
      offset: String(offset),
      max_image_no: "20",
      image_size: "origin",
    }))
    items.push(...(payload.items as BaseItem[]))
    if (payload.items.length < 100) break
    if (items.length >= 10_000) throw new Error("BASE商品件数が安全上限を超えました")
  }
  return items
}
