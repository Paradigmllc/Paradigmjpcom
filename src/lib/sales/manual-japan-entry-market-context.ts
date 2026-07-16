import { buildJapanEntryProjection, type JapanEntryProjection } from "./japan-entry-projection"
import { buildMarketVisibilityIndex, type MarketVisibilityIndex } from "./market-visibility"
import { queryCloudflareRadar } from "./sources/cloudflare-radar"
import { queryCommonCrawl } from "./sources/commoncrawl"
import { analyzeSitemap } from "./sources/sitemap"
import { queryTrancoRank } from "./sources/tranco"
import type { ManualCompanyProfile } from "./manual-japan-entry-types"

const SOURCE_TIMEOUT_MS = 12_000

async function bounded<T>(name: string, task: Promise<T>): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      task,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => {
          console.warn(`[manual-work] ${name} visibility source timed out`)
          resolve(null)
        }, SOURCE_TIMEOUT_MS)
      }),
    ])
  } catch (error) {
    console.error(`[manual-work] ${name} visibility source failed:`, error)
    return null
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export interface ManualMarketProjectionResult {
  visibility: MarketVisibilityIndex
  projection: JapanEntryProjection | null
  fallbackReason: string | null
}

export async function collectManualMarketProjection(input: {
  domain: string
  profile: ManualCompanyProfile
}): Promise<ManualMarketProjectionResult> {
  const [tranco, cloudflareRadar, commonCrawl, sitemap] = await Promise.all([
    bounded("tranco", queryTrancoRank(input.domain)),
    bounded("cloudflare-radar", queryCloudflareRadar(input.domain)),
    bounded("common-crawl", queryCommonCrawl(input.domain)),
    bounded("sitemap", analyzeSitemap(input.domain)),
  ])
  const visibility = buildMarketVisibilityIndex({
    domain: input.domain,
    targetCountry: input.profile.countryCode,
    tranco,
    cloudflareRadar,
    commonCrawl,
    sitemap,
  })
  if (visibility.band === "not-observed") {
    return {
      visibility,
      projection: null,
      fallbackReason: "推定値に必要な公開rank bandを確認できないため、推定なし文面へ切り替えました。",
    }
  }
  try {
    return {
      visibility,
      projection: buildJapanEntryProjection({
        companyName: input.profile.companyName,
        domain: input.domain,
        targetCountry: input.profile.countryCode,
        visibility,
        businessModel: input.profile.businessModel,
      }),
      fallbackReason: null,
    }
  } catch (error) {
    console.error("[manual-work] public-signal projection failed:", error)
    return {
      visibility,
      projection: null,
      fallbackReason: "公開シグナルから保守的な推定範囲を作れないため、推定なし文面へ切り替えました。",
    }
  }
}
