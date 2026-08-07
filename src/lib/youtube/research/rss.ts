/**
 * lib/youtube/research/rss.ts — Google News RSS からの需要観測
 *
 * なぜ必要か: Hacker News は英語のみ、Reddit は OAuth 必須になった。
 * 日本語形式(manim解説 / ニュース)が今日動く以上、無認証で日本語を取れる
 * ソースが1つは要る。Google News RSS は認証不要で locale 指定ができる。
 *
 * 制約: RSS には点数もコメント数も無い。したがって「勢い」では測れず、
 * 「同じ話題を何社が報じたか(coverage)」と「新しさ」で評価する。
 * その配点は rank.ts 側で吸収する。
 */

import type { ResearchFetchResult, ResearchQuery, ResearchSignal } from "./types"

const GOOGLE_NEWS_BASE = "https://news.google.com/rss/search"
const GOOGLE_NEWS_TOP = "https://news.google.com/rss"

/**
 * 検索の代わりに主要ニュース一覧を取るための予約語。
 *
 * 検索フィードは単発記事が多く description に関連見出しが入らないが、
 * 主要ニュース一覧はクラスタ化された項目が返るため、同一事象に対する
 * 複数媒体の見出しが取れる。事実材料が欲しい場合はこちらを使う。
 */
export const TOP_STORIES_TERM = "*"

/** locale から Google News のパラメータを決める。 */
export function googleNewsParams(locale: string): { hl: string; gl: string; ceid: string } {
  if (locale.startsWith("ja")) return { hl: "ja", gl: "JP", ceid: "JP:ja" }
  return { hl: "en-US", gl: "US", ceid: "US:en" }
}

/** XMLエンティティを戻す。依存を増やさないため必要最小限だけ扱う。 */
export function decodeXmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
}

export interface RssItem {
  title: string
  link: string
  pubDate: string | null
  source: string | null
  /** description に載っている、同一事象を扱う他媒体の見出し。 */
  relatedHeadlines: RelatedHeadline[]
}

export interface RelatedHeadline {
  title: string
  source: string | null
  /** その見出しの記事URL。主張ごとに正しい媒体を引用させるために必須。 */
  url: string | null
}

/**
 * Google News の description から関連見出しを取り出す。
 *
 * description に記事本文は入っていない。入っているのは
 * <ol><li><a>見出し</a>&nbsp;&nbsp;<font>媒体名</font></li>... という関連記事の一覧。
 * 本文が取れない以上、同一事象に対する複数媒体の独立した見出しが
 * 台本層に渡せる唯一の実質的な材料になる。複数媒体が共通して書いている点が
 * 事実として確度が高い、という判断材料に使う。
 */
export function parseRelatedHeadlines(descriptionHtml: string): RelatedHeadline[] {
  const html = decodeXmlEntities(descriptionHtml)
  const pattern =
    /<li>\s*<a\b[^>]*?href="([^"]*)"[^>]*>([\s\S]*?)<\/a>(?:[\s\S]*?<font\b[^>]*>([\s\S]*?)<\/font>)?\s*<\/li>/g
  const headlines: RelatedHeadline[] = []
  const seen = new Set<string>()

  let match: RegExpExecArray | null
  while ((match = pattern.exec(html)) !== null) {
    const title = decodeXmlEntities(match[2].replace(/<[^>]+>/g, "")).trim()
    if (!title || seen.has(title)) continue
    seen.add(title)
    headlines.push({
      title,
      source: match[3] ? decodeXmlEntities(match[3].replace(/<[^>]+>/g, "")).trim() : null,
      url: match[1] ? decodeXmlEntities(match[1]).trim() : null,
    })
  }

  return headlines
}

/**
 * RSS の <item> を取り出す。
 * XMLパーサを足さないのは、Google News の出力が定型で、
 * ここで必要なのが4フィールドだけだから。
 */
export function parseRssItems(xml: string): RssItem[] {
  const items: RssItem[] = []
  const itemPattern = /<item>([\s\S]*?)<\/item>/g

  const pick = (block: string, tag: string): string | null => {
    const cdata = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`).exec(block)
    if (cdata) return cdata[1].trim()
    const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`).exec(block)
    return plain ? decodeXmlEntities(plain[1].trim()) : null
  }

  let match: RegExpExecArray | null
  while ((match = itemPattern.exec(xml)) !== null) {
    const block = match[1]
    const title = pick(block, "title")
    const link = pick(block, "link")
    if (!title || !link) continue
    const description = pick(block, "description")
    items.push({
      title,
      link,
      pubDate: pick(block, "pubDate"),
      source: pick(block, "source"),
      relatedHeadlines: description ? parseRelatedHeadlines(description) : [],
    })
  }

  return items
}

export interface RssFetchOptions {
  fetchImpl?: typeof fetch
  now?: () => number
  timeoutMs?: number
}

export async function fetchRssSignals(
  query: ResearchQuery,
  options: RssFetchOptions = {},
): Promise<ResearchFetchResult> {
  const fetchImpl = options.fetchImpl ?? fetch
  const now = options.now ?? (() => Date.now())
  const timeoutMs = options.timeoutMs ?? 20_000
  const { hl, gl, ceid } = googleNewsParams(query.locale)
  const cutoff = now() - query.withinHours * 3_600_000

  const signals: ResearchSignal[] = []
  const errors: string[] = []
  const seen = new Set<string>()

  for (const term of query.terms) {
    const localeParams = `hl=${hl}&gl=${gl}&ceid=${encodeURIComponent(ceid)}`
    const url =
      term === TOP_STORIES_TERM
        ? `${GOOGLE_NEWS_TOP}?${localeParams}`
        : `${GOOGLE_NEWS_BASE}?q=${encodeURIComponent(term)}&${localeParams}`

    try {
      const response = await fetchImpl(url, {
        headers: { Accept: "application/rss+xml, application/xml" },
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!response.ok) {
        errors.push(`"${term}": HTTP ${response.status}`)
        continue
      }

      const xml = await response.text()
      for (const item of parseRssItems(xml).slice(0, query.limit)) {
        if (seen.has(item.link)) continue

        const published = item.pubDate ? Date.parse(item.pubDate) : NaN
        if (!Number.isNaN(published) && published < cutoff) continue
        seen.add(item.link)

        signals.push({
          sourceId: "rss",
          externalId: item.link,
          title: item.title,
          url: item.link,
          publishedAt: Number.isNaN(published) ? null : new Date(published).toISOString(),
          // RSS には反応量が無い。0 を入れ、評価は coverage と新しさに委ねる。
          metrics: { score: 0, comments: 0, velocityPerHour: null },
          // 配信元名(item.source)は題材語ではないので keywords に混ぜない。
          keywords: [term],
          relatedHeadlines: item.relatedHeadlines,
        })
      }
    } catch (error) {
      errors.push(`"${term}": ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return {
    // 0件は失敗ではない(検索語が刺さらなかっただけ)。エラーの有無で判定する。
    ok: errors.length === 0,
    sourceId: "rss",
    signals,
    quotaSpent: 0,
    error: errors.length > 0 ? errors.join(" / ") : undefined,
  }
}
