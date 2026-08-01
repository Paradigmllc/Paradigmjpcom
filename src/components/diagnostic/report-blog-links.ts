import type { BlogPost } from "@/lib/blog"
import {
  getAllBlogPosts,
  isPublicEnglishBlogPost,
  isPublicJapaneseBlogPost,
} from "@/lib/blog-cms"
import type { ReportBlogLinks } from "./report-constants"

const ISSUE_TOPICS = {
  speed_critical: ["core web vitals", "page speed", "pagespeed", "performance", "表示速度", "パフォーマンス"],
  ssl_expired: ["security", "ssl", "appi", "privacy", "セキュリティ", "プライバシー"],
  wp_outdated: ["wordpress", "migration", "headless", "移行", "脆弱性"],
  no_ogp: ["ogp", "social sharing", "sns", "ソーシャル"],
  no_sns: ["b2b", "external channel", "social media", "外部接点", "マーケティング"],
  copyright_old: ["freshness", "content freshness", "brand trust", "鮮度", "信頼"],
} as const

function matchScore(post: BlogPost, topics: readonly string[]): number {
  const searchable = [post.title, post.category, ...post.tags]
    .join("\n")
    .toLocaleLowerCase()
  return topics.reduce(
    (score, topic) => score + (searchable.includes(topic.toLocaleLowerCase()) ? 1 : 0),
    0,
  )
}

export function selectReportBlogLinks(
  posts: BlogPost[],
  locale: "ja" | "en",
): ReportBlogLinks {
  const selected: ReportBlogLinks = {}
  const usedSlugs = new Set<string>()

  for (const [issueKey, topics] of Object.entries(ISSUE_TOPICS)) {
    const match = posts
      .filter((post) => !usedSlugs.has(post.slug))
      .map((post) => ({ post, score: matchScore(post, topics) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || b.post.date.localeCompare(a.post.date))[0]

    if (!match) continue
    usedSlugs.add(match.post.slug)
    selected[issueKey] = {
      title: match.post.title,
      url: `/${locale}/blog/${encodeURIComponent(match.post.slug)}`,
    }
  }

  return selected
}

export async function getApprovedReportBlogLinks(locale: string): Promise<ReportBlogLinks> {
  if (locale !== "ja" && locale !== "en") return {}
  const publicPosts = await getAllBlogPosts(locale)
  const approvedPublicPosts = publicPosts.filter((post) =>
    locale === "ja"
      ? isPublicJapaneseBlogPost(post)
      : isPublicEnglishBlogPost(post),
  )
  return selectReportBlogLinks(approvedPublicPosts, locale)
}
