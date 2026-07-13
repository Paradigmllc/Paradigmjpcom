export const JAPAN_ENTRY_MARKET_EVIDENCE = {
  population: {
    value: "123.05M",
    label: "people in Japan",
    detail: "Preliminary 2025 Population Census count as of October 1, 2025.",
    observedAt: "2025-10-01",
    sourceLabel: "Statistics Bureau of Japan",
    sourceUrl: "https://www.stat.go.jp/english/info/news/20260625.html",
  },
  ecommerce: {
    value: "¥26.1T",
    label: "2024 B2C e-commerce market",
    detail: "Japan's B2C e-commerce market grew 5.1% year over year in 2024.",
    observedAt: "2024",
    sourceLabel: "Ministry of Economy, Trade and Industry",
    sourceUrl: "https://www.meti.go.jp/english/press/2025/0826_003.html",
  },
  fx: {
    value: "¥158 / $1",
    label: "official July 2026 reference rate",
    detail: "A dated Bank of Japan reference—not a savings or future-rate guarantee.",
    observedAt: "2026-07",
    sourceLabel: "Bank of Japan",
    sourceUrl: "https://www.boj.or.jp/about/services/tame/tame_rate/kijun/kiju2607.htm",
  },
  commerceEnforcement: {
    label: "Commercial rules carry enforcement risk",
    detail:
      "For in-scope violations, Japan's consumer authority describes business-improvement instructions, suspension orders and penalties. Applicability must be assessed for each offer.",
    observedAt: "2026-07-13",
    sourceLabel: "Consumer Affairs Agency",
    sourceUrl: "https://www.no-trouble.caa.go.jp/foreignlanguage/english/",
  },
  privacyReview: {
    label: "Privacy requirements do not stand still",
    detail:
      "Japan's privacy regulator published its 2026 reform policy during the statutory triennial APPI review. Exact obligations depend on data flows and operating model.",
    observedAt: "2026-02",
    sourceLabel: "Personal Information Protection Commission",
    sourceUrl: "https://www.ppc.go.jp/en/topix/triennial_review_2026_02/",
  },
} as const
