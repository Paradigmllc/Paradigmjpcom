import { isRetryableHttpStatus, retryableHttpError, withExternalRetry } from "./external-retry"
import type { SocialConnectorStatus } from "./types"

export type SocialPublishInput = {
  platform: "instagram" | "pinterest"
  caption: string
  mediaUrl: string
  destinationUrl: string
}

export type SocialPublishResult = { externalPostId: string; postUrl: string | null }

function configured(name: string): string | null {
  const value = process.env[name]?.trim()
  return value ? value : null
}

export function getSocialConnectorStatuses(): SocialConnectorStatus[] {
  const instagramReady = Boolean(configured("META_IG_USER_ID") && configured("META_IG_ACCESS_TOKEN") && configured("META_GRAPH_API_VERSION"))
  const pinterestReady = Boolean(configured("PINTEREST_ACCESS_TOKEN") && configured("PINTEREST_BOARD_ID"))
  return [
    {
      platform: "instagram",
      configured: instagramReady,
      directPublishingSupported: true,
      reason: instagramReady ? "画像投稿API接続済み" : "Instagram Business接続待ち（下書き生成は継続）",
    },
    {
      platform: "pinterest",
      configured: pinterestReady,
      directPublishingSupported: true,
      reason: pinterestReady ? "Pin作成API接続済み" : "Pinterest Business接続待ち（下書き生成は継続）",
    },
    {
      platform: "tiktok",
      configured: Boolean(configured("TIKTOK_ACCESS_TOKEN")),
      directPublishingSupported: false,
      reason: "公開アプリ審査とvideo.publish承認後に有効化",
    },
    {
      platform: "youtube",
      configured: Boolean(configured("YOUTUBE_REFRESH_TOKEN")),
      directPublishingSupported: false,
      reason: "動画素材とYouTube API監査完了後に有効化",
    },
  ]
}

async function responseJson(response: Response): Promise<Record<string, unknown>> {
  const body = await response.json().catch((error: unknown) => {
    console.error("[social-publisher] response JSON parse failed:", error)
    return {}
  })
  return body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {}
}

async function checkedJson(service: string, response: Response): Promise<Record<string, unknown>> {
  if (isRetryableHttpStatus(response.status)) throw retryableHttpError(service, response)
  const body = await responseJson(response)
  if (!response.ok) {
    const rawError = body.error
    const message = rawError && typeof rawError === "object" && "message" in rawError
      ? String((rawError as { message?: unknown }).message)
      : `HTTP ${response.status}`
    throw new Error(`${service}への投稿に失敗しました: ${message.slice(0, 300)}`)
  }
  return body
}

async function publishInstagram(input: SocialPublishInput): Promise<SocialPublishResult> {
  const userId = configured("META_IG_USER_ID")
  const token = configured("META_IG_ACCESS_TOKEN")
  const version = configured("META_GRAPH_API_VERSION")
  if (!userId || !token || !version) throw new Error("Instagram Business接続が未設定です")
  const endpoint = `https://graph.facebook.com/${encodeURIComponent(version)}/${encodeURIComponent(userId)}`
  const createBody = new URLSearchParams({ image_url: input.mediaUrl, caption: input.caption, access_token: token })
  const created = await withExternalRetry("Instagram media create", async () => checkedJson(
    "Instagram",
    await fetch(`${endpoint}/media`, { method: "POST", body: createBody, signal: AbortSignal.timeout(20_000) }),
  ))
  const creationId = typeof created.id === "string" ? created.id : null
  if (!creationId) throw new Error("InstagramメディアコンテナIDを取得できませんでした")
  const publishBody = new URLSearchParams({ creation_id: creationId, access_token: token })
  const published = await withExternalRetry("Instagram media publish", async () => checkedJson(
    "Instagram",
    await fetch(`${endpoint}/media_publish`, { method: "POST", body: publishBody, signal: AbortSignal.timeout(20_000) }),
  ))
  const externalPostId = typeof published.id === "string" ? published.id : null
  if (!externalPostId) throw new Error("Instagram投稿IDを取得できませんでした")
  return { externalPostId, postUrl: null }
}

async function publishPinterest(input: SocialPublishInput): Promise<SocialPublishResult> {
  const token = configured("PINTEREST_ACCESS_TOKEN")
  const boardId = configured("PINTEREST_BOARD_ID")
  if (!token || !boardId) throw new Error("Pinterest Business接続が未設定です")
  const body = {
    board_id: boardId,
    title: input.caption.slice(0, 100),
    description: input.caption.slice(0, 500),
    link: input.destinationUrl,
    media_source: { source_type: "image_url", url: input.mediaUrl },
  }
  const published = await withExternalRetry("Pinterest pin create", async () => checkedJson(
    "Pinterest",
    await fetch("https://api.pinterest.com/v5/pins", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    }),
  ))
  const externalPostId = typeof published.id === "string" ? published.id : null
  if (!externalPostId) throw new Error("Pinterest Pin IDを取得できませんでした")
  return { externalPostId, postUrl: `https://www.pinterest.com/pin/${externalPostId}/` }
}

export async function publishSocialPost(input: SocialPublishInput): Promise<SocialPublishResult> {
  return input.platform === "instagram" ? publishInstagram(input) : publishPinterest(input)
}
