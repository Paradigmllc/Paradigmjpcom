import {
  isRetryableHttpStatus,
  retryableHttpError,
  withExternalRetry,
} from "@/lib/shopify-ops/external-retry"
import type { PetMarketingConnectorStatus } from "./types"

export type PetMarketingPublishInput = {
  platform: "instagram" | "pinterest"
  hook: string
  caption: string
  mediaUrl: string
  destinationUrl: string
}

export type PetMarketingPublishResult = {
  externalPostId: string
  postUrl: string | null
}

function configured(name: string): string | null {
  const value = process.env[name]?.trim()
  return value ? value : null
}

export function getPetMarketingConnectorStatuses(): PetMarketingConnectorStatus[] {
  const instagramReady = Boolean(
    configured("PET_MOVIE_META_IG_USER_ID")
    && configured("PET_MOVIE_META_IG_ACCESS_TOKEN")
    && configured("PET_MOVIE_META_GRAPH_API_VERSION"),
  )
  const pinterestReady = Boolean(
    configured("PET_MOVIE_PINTEREST_ACCESS_TOKEN")
    && configured("PET_MOVIE_PINTEREST_BOARD_ID"),
  )
  return [
    {
      platform: "instagram",
      configured: instagramReady,
      directPublishingSupported: true,
      reason: instagramReady
        ? "Pet Life Movie Instagram Businessへ接続済み"
        : "Pet専用Instagram Business認証待ち。投稿案の生成と予約は継続します。",
    },
    {
      platform: "pinterest",
      configured: pinterestReady,
      directPublishingSupported: true,
      reason: pinterestReady
        ? "Pet Life Movie Pinterest Businessへ接続済み"
        : "Pet専用Pinterest Business認証待ち。Pin案の生成と予約は継続します。",
    },
    {
      platform: "tiktok",
      configured: Boolean(configured("PET_MOVIE_TIKTOK_ACCESS_TOKEN")),
      directPublishingSupported: false,
      reason: "公開アプリ審査とvideo.publish承認まではdraft-onlyです。",
    },
    {
      platform: "youtube",
      configured: Boolean(configured("PET_MOVIE_YOUTUBE_REFRESH_TOKEN")),
      directPublishingSupported: false,
      reason: "API監査完了までは公開動画を自動送信せず、Shorts原稿を生成します。",
    },
  ]
}

async function responseJson(response: Response): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await response.json()
    return body && typeof body === "object" && !Array.isArray(body)
      ? body as Record<string, unknown>
      : {}
  } catch (error) {
    console.error("[pet-marketing-publisher] response JSON parse failed", error)
    return {}
  }
}

async function checkedJson(service: string, response: Response): Promise<Record<string, unknown>> {
  if (isRetryableHttpStatus(response.status)) throw retryableHttpError(service, response)
  const body = await responseJson(response)
  if (!response.ok) {
    const rawError = body.error
    const message = rawError && typeof rawError === "object" && "message" in rawError
      ? String((rawError as { message?: unknown }).message)
      : `HTTP ${response.status}`
    throw new Error(`${service} publish failed: ${message.slice(0, 300)}`)
  }
  return body
}

async function instagramPermalink(
  version: string,
  externalPostId: string,
  token: string,
): Promise<string | null> {
  try {
    const url = new URL(`https://graph.facebook.com/${encodeURIComponent(version)}/${encodeURIComponent(externalPostId)}`)
    url.searchParams.set("fields", "permalink")
    url.searchParams.set("access_token", token)
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    const body = await responseJson(response)
    return response.ok && typeof body.permalink === "string" ? body.permalink : null
  } catch (error) {
    console.warn("[pet-marketing-publisher] Instagram permalink lookup failed", error)
    return null
  }
}

async function publishInstagram(input: PetMarketingPublishInput): Promise<PetMarketingPublishResult> {
  const userId = configured("PET_MOVIE_META_IG_USER_ID")
  const token = configured("PET_MOVIE_META_IG_ACCESS_TOKEN")
  const version = configured("PET_MOVIE_META_GRAPH_API_VERSION")
  if (!userId || !token || !version) throw new Error("Pet Life Movie Instagram Business is not configured")
  const endpoint = `https://graph.facebook.com/${encodeURIComponent(version)}/${encodeURIComponent(userId)}`
  const createBody = new URLSearchParams({
    image_url: input.mediaUrl,
    caption: input.caption,
    access_token: token,
  })
  const created = await withExternalRetry("Pet Instagram media create", async () => checkedJson(
    "Instagram",
    await fetch(`${endpoint}/media`, {
      method: "POST",
      body: createBody,
      signal: AbortSignal.timeout(20_000),
    }),
  ))
  const creationId = typeof created.id === "string" ? created.id : null
  if (!creationId) throw new Error("Instagram did not return a media container id")
  const published = await withExternalRetry("Pet Instagram media publish", async () => checkedJson(
    "Instagram",
    await fetch(`${endpoint}/media_publish`, {
      method: "POST",
      body: new URLSearchParams({ creation_id: creationId, access_token: token }),
      signal: AbortSignal.timeout(20_000),
    }),
  ))
  const externalPostId = typeof published.id === "string" ? published.id : null
  if (!externalPostId) throw new Error("Instagram did not return a published media id")
  return {
    externalPostId,
    postUrl: await instagramPermalink(version, externalPostId, token),
  }
}

async function publishPinterest(input: PetMarketingPublishInput): Promise<PetMarketingPublishResult> {
  const token = configured("PET_MOVIE_PINTEREST_ACCESS_TOKEN")
  const boardId = configured("PET_MOVIE_PINTEREST_BOARD_ID")
  if (!token || !boardId) throw new Error("Pet Life Movie Pinterest Business is not configured")
  const published = await withExternalRetry("Pet Pinterest pin create", async () => checkedJson(
    "Pinterest",
    await fetch("https://api.pinterest.com/v5/pins", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        board_id: boardId,
        title: input.hook.slice(0, 100),
        description: input.caption.slice(0, 500),
        link: input.destinationUrl,
        media_source: { source_type: "image_url", url: input.mediaUrl },
      }),
      signal: AbortSignal.timeout(20_000),
    }),
  ))
  const externalPostId = typeof published.id === "string" ? published.id : null
  if (!externalPostId) throw new Error("Pinterest did not return a Pin id")
  return {
    externalPostId,
    postUrl: `https://www.pinterest.com/pin/${externalPostId}/`,
  }
}

export async function publishPetMarketingPost(
  input: PetMarketingPublishInput,
): Promise<PetMarketingPublishResult> {
  return input.platform === "instagram" ? publishInstagram(input) : publishPinterest(input)
}

export function isDirectPetMarketingPlatform(
  platform: string,
): platform is "instagram" | "pinterest" {
  return platform === "instagram" || platform === "pinterest"
}
