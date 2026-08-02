type GraphqlError = { message: string }

type ProductSetResult = {
  productSet: {
    product: {
      id: string
      handle: string
      variants: { nodes: Array<{ id: string; inventoryItem: { id: string } }> }
    } | null
    userErrors: GraphqlError[]
  }
}

type ShopifyAccessToken = {
  token: string
  expiresAt: number
}

let cachedAccessToken: ShopifyAccessToken | null = null

const REQUIRED_SHOPIFY_SCOPES = [
  "read_products",
  "write_products",
  "read_inventory",
  "write_inventory",
  "read_locations",
] as const

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} が設定されていません`)
  return value
}

export function isShopifyAdminConfigured(): boolean {
  const commonReady = ["SHOPIFY_STORE_DOMAIN", "SHOPIFY_API_VERSION"]
    .every((name) => Boolean(process.env[name]?.trim()))
  const legacyTokenReady = Boolean(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim())
  const clientCredentialsReady = ["SHOPIFY_CLIENT_ID", "SHOPIFY_CLIENT_SECRET"]
    .every((name) => Boolean(process.env[name]?.trim()))
  return commonReady && (legacyTokenReady || clientCredentialsReady)
}

async function shopifyAccessToken(domain: string): Promise<string> {
  const legacyToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim()
  if (legacyToken) return legacyToken
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 5 * 60 * 1_000) {
    return cachedAccessToken.token
  }

  const response = await fetch(`https://${domain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: requiredEnv("SHOPIFY_CLIENT_ID"),
      client_secret: requiredEnv("SHOPIFY_CLIENT_SECRET"),
    }),
    signal: AbortSignal.timeout(15_000),
  })
  const payload = (await response.json()) as unknown
  if (!response.ok) throw new Error(`Shopifyアクセストークンの取得に失敗しました (HTTP ${response.status})`)
  if (!payload || typeof payload !== "object") throw new Error("Shopifyアクセストークンの応答が不正です")
  const token = "access_token" in payload && typeof payload.access_token === "string" ? payload.access_token : null
  const expiresIn = "expires_in" in payload ? Number(payload.expires_in) : 0
  const grantedScopes = "scope" in payload && typeof payload.scope === "string"
    ? new Set(payload.scope.split(",").map((scope) => scope.trim()).filter(Boolean))
    : new Set<string>()
  if (!token || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    throw new Error("Shopifyアクセストークンまたは有効期限が応答にありません")
  }
  const missingScopes = REQUIRED_SHOPIFY_SCOPES.filter((scope) => !grantedScopes.has(scope))
  if (missingScopes.length > 0) throw new Error(`Shopify API権限が不足しています: ${missingScopes.join(", ")}`)
  cachedAccessToken = { token, expiresAt: Date.now() + expiresIn * 1_000 }
  return token
}

async function shopifyGraphql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const domain = requiredEnv("SHOPIFY_STORE_DOMAIN").replace(/^https?:\/\//, "").replace(/\/$/, "")
  const version = requiredEnv("SHOPIFY_API_VERSION")
  const accessToken = await shopifyAccessToken(domain)
  const response = await fetch(`https://${domain}/admin/api/${version}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(30_000),
  })
  const payload = (await response.json()) as { data?: T; errors?: GraphqlError[] }
  if (!response.ok) throw new Error(`Shopify Admin APIが失敗しました (HTTP ${response.status})`)
  if (payload.errors?.length) throw new Error(payload.errors.map((error) => error.message).join(" / "))
  if (!payload.data) throw new Error("Shopify Admin APIの応答にdataがありません")
  return payload.data
}

export async function getShopifyLocationId(): Promise<string> {
  const configured = process.env.SHOPIFY_LOCATION_ID?.trim()
  if (configured) return configured
  const data = await shopifyGraphql<{ locations: { nodes: Array<{ id: string }> } }>(`
    query SericiaPrimaryLocation { locations(first: 1, query: "active:true") { nodes { id } } }
  `)
  const id = data.locations.nodes[0]?.id
  if (!id) throw new Error("Shopifyの有効な在庫ロケーションが見つかりません")
  return id
}

export async function ensureShopifyCollection(handle: string, title: string): Promise<string> {
  const existing = await shopifyGraphql<{ collections: { nodes: Array<{ id: string }> } }>(`
    query SericiaCollection($query: String!) { collections(first: 1, query: $query) { nodes { id } } }
  `, { query: `handle:${handle}` })
  const existingId = existing.collections.nodes[0]?.id
  if (existingId) return existingId
  const created = await shopifyGraphql<{ collectionCreate: { collection: { id: string } | null; userErrors: GraphqlError[] } }>(`
    mutation SericiaCollectionCreate($input: CollectionInput!) {
      collectionCreate(input: $input) { collection { id } userErrors { message } }
    }
  `, { input: { title, handle } })
  if (created.collectionCreate.userErrors.length) {
    throw new Error(created.collectionCreate.userErrors.map((error) => error.message).join(" / "))
  }
  if (!created.collectionCreate.collection) throw new Error(`${title}コレクションを作成できませんでした`)
  return created.collectionCreate.collection.id
}

export async function upsertShopifyProduct(input: Record<string, unknown>, handle: string) {
  const data = await shopifyGraphql<ProductSetResult>(`
    mutation SericiaBaseProductSet($input: ProductSetInput!, $identifier: ProductSetIdentifiers) {
      productSet(synchronous: true, input: $input, identifier: $identifier) {
        product {
          id
          handle
          variants(first: 100) { nodes { id inventoryItem { id } } }
        }
        userErrors { message }
      }
    }
  `, { input, identifier: { handle } })
  if (data.productSet.userErrors.length) {
    throw new Error(data.productSet.userErrors.map((error) => error.message).join(" / "))
  }
  if (!data.productSet.product) throw new Error("Shopify商品を作成できませんでした")
  return data.productSet.product
}
