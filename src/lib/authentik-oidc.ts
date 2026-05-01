/**
 * lib/authentik-oidc.ts — Authentik OIDC integration for PayloadCMS Users
 *
 * 役割: 既存 Paradigm エコシステムの Authentik (authentik.appexx.me) を OIDC
 *       provider として使い、PayloadCMS Users の SSO 認証を実装する scaffold。
 *
 * セットアップ:
 *   1. Authentik admin (https://authentik.appexx.me) で OIDC Provider 作成:
 *      - Application slug: paradigm-cms
 *      - Redirect URI: https://paradigmjp.com/admin/oidc/callback
 *      - Authorization grant: code (Authorization Code Flow)
 *      - Sub mode: based on the Username (or email)
 *   2. Coolify env に追加:
 *      - AUTHENTIK_OIDC_ISSUER=https://authentik.appexx.me/application/o/paradigm-cms/
 *      - AUTHENTIK_OIDC_CLIENT_ID=<Authentik で発行>
 *      - AUTHENTIK_OIDC_CLIENT_SECRET=<Authentik で発行>
 *      - AUTHENTIK_OIDC_REDIRECT_URI=https://paradigmjp.com/admin/oidc/callback
 *   3. Users collection の `auth.strategies` に下記 strategy を追加 (P19 で完成)。
 *
 * 現状:
 *   この scaffold は config 取得 + JWKS 検証ヘルパーのみ提供する。
 *   実際の strategy 統合 (PayloadCMS auth.strategies) は P19 (Users.ts 拡張) で実装。
 */

interface AuthentikConfig {
  issuer: string
  clientId: string
  clientSecret: string
  redirectUri: string
}

export interface OidcUserClaims {
  sub: string
  email: string
  email_verified?: boolean
  name?: string
  preferred_username?: string
  groups?: string[]
}

/**
 * 環境変数から Authentik OIDC config を取得。未設定なら null (= OIDC 無効)。
 */
export function getAuthentikConfig(): AuthentikConfig | null {
  const issuer = process.env.AUTHENTIK_OIDC_ISSUER
  const clientId = process.env.AUTHENTIK_OIDC_CLIENT_ID
  const clientSecret = process.env.AUTHENTIK_OIDC_CLIENT_SECRET
  const redirectUri = process.env.AUTHENTIK_OIDC_REDIRECT_URI

  if (!issuer || !clientId || !clientSecret || !redirectUri) return null
  return { issuer, clientId, clientSecret, redirectUri }
}

/**
 * Authentik からの id_token (JWT) を検証 + claims を返す。
 *
 * 実装は P19: jose (npm) で JWKS fetch + verify + iss/aud/exp チェック。
 *   import { jwtVerify, createRemoteJWKSet } from "jose"
 *   const JWKS = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`))
 *   const { payload } = await jwtVerify(idToken, JWKS, { issuer, audience: clientId })
 */
export async function verifyAuthentikIdToken(
  _idToken: string,
): Promise<OidcUserClaims | null> {
  const config = getAuthentikConfig()
  if (!config) return null
  // P19 implementation pending — see comment above.
  console.warn("[authentik-oidc] verifyAuthentikIdToken is a P19 scaffold. Use scoped JWT verification with jose.")
  return null
}

/**
 * Authentik groups → PayloadCMS role マッピング。
 *   Authentik group "paradigm-admin"  → role "admin"
 *   Authentik group "paradigm-editor" → role "editor"
 *   それ以外                          → role "viewer"
 */
export function mapAuthentikGroupsToRole(groups: string[] | undefined): "admin" | "editor" | "viewer" {
  if (!groups || groups.length === 0) return "viewer"
  if (groups.includes("paradigm-admin")) return "admin"
  if (groups.includes("paradigm-editor")) return "editor"
  return "viewer"
}

/**
 * OIDC Authorization URL builder (admin が「Authentik でサインイン」ボタンを
 * 押した時のリダイレクト先)。state は CSRF 対策トークン。
 */
export function buildAuthentikAuthorizeUrl(state: string): string | null {
  const config = getAuthentikConfig()
  if (!config) return null
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid profile email groups",
    state,
  })
  return `${config.issuer}authorize?${params.toString()}`
}
