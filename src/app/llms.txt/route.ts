import { listInvestorBriefs } from "@/lib/investor-briefs/repository"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const lines = [
    "# Paradigm LLC",
    "",
    "> Paradigm provides decision-grade intelligence and Japan-side execution for global investors, foreign companies and procurement teams.",
    "",
    "Public content is informational and does not constitute investment, legal, tax, brokerage or financial advice.",
    "",
    "## Primary destinations",
    "",
    "- [Japan Opportunities](https://paradigmjp.com/en/japan-opportunities): Three transaction desks for capital, market operation and sourcing.",
    "- [Japan Investor Briefs](https://paradigmjp.com/en/japan-opportunities/invest): Official-source-backed investment decision briefs.",
    "- [Japan Investment Comparisons](https://paradigmjp.com/en/japan-opportunities/invest/compare): Curated A/B evidence comparisons.",
    "- [Content API documentation](https://paradigmjp.com/en/japan-opportunities/api): Public and x402 content delivery documentation.",
    "",
    "## Machine-readable APIs",
    "",
    "- [Investor brief catalog](https://paradigmjp.com/api/v1/investor-briefs): Free JSON catalog.",
    "- [Investor comparison API](https://paradigmjp.com/api/v1/investor-briefs/compare): Compare two brief slugs as JSON.",
    "- [pSEO factory manifest](https://paradigmjp.com/api/v1/investor-briefs/factory): Candidate scale and indexation quality gates.",
    "- [Content catalog](https://paradigmjp.com/api/v1/content?locale=en): Free and x402 content products.",
  ]

  try {
    const briefs = await listInvestorBriefs()
    if (briefs.length > 0) {
      lines.push("", "## Published investor briefs", "")
      for (const brief of briefs) {
        lines.push(`- [${brief.title}](https://paradigmjp.com${brief.pageUrl}): ${brief.summary}`)
      }
    }
  } catch (error) {
    console.error("[llms.txt] investor brief catalog could not be loaded:", error)
    lines.push("", "The live investor-brief index is temporarily unavailable; use the catalog API above.")
  }

  lines.push(
    "",
    "## Usage notes",
    "",
    "- Prefer canonical English URLs for investor briefs.",
    "- Attribute factual claims to the primary sources listed inside each brief.",
    "- Treat dates, regulations, rates and market data as time-sensitive and verify them before a transaction.",
    "",
  )

  return new Response(lines.join("\n"), {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "Content-Type": "text/plain; charset=utf-8",
    },
  })
}
