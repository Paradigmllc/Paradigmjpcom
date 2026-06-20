/**
 * Centralized bilingual copy for diagnostic report content sections.
 *
 * Rationale (A-CONTENT / i18n): visible report copy must not be hardcoded as
 * inline `lang === "ja" ? ... : ...` ternaries scattered across JSX. This module
 * is the single source of truth for ja/en section strings and the first step
 * toward DB/CMS-driven content. Non-ja locales fall back to English, matching
 * the report's existing behavior.
 */

export type SectionLang = "ja" | "en"

export function pickSectionLang(lang: string): SectionLang {
  return lang === "ja" ? "ja" : "en"
}

type Bilingual = Record<SectionLang, string>

function bi(ja: string, en: string): Bilingual {
  return { ja, en }
}

// ─── Website diagnostic sections (report-website-sections.tsx) ───
export const WEBSITE_SECTION_COPY = {
  diagnosticFindings: bi("御社サイトの診断結果", "Your Site Diagnostic Findings"),
  analyzingScreenshot: bi("スクリーンショット解析中...", "Analyzing screenshot..."),
  collectingData: bi("診断データを収集中です", "Collecting diagnostic data"),
  beforeAfterHeading: bi("Before → After", "Before → After"),
  current: bi("現在", "CURRENT"),
  afterTargetDemo: bi("改善後（目標値・弊社デモ）", "AFTER (Target · Our Demo)"),
  improvedDemoSite: bi("改善後デモサイト", "Improved demo site"),
  improvedDemoPreview: bi("改善後デモサイト（プレビュー）", "Improved demo preview"),
  openNewTab: bi("別タブで開く", "Open in new tab"),
  previewComingSoon: bi("改善イメージ準備中", "Preview coming soon"),
  viewAstroDemo: bi("Astro改善デモサイトを見る", "View Astro Demo Site"),
  ogpConfigured: bi("整備済", "Configured"),
  mobileSpeedDiff: bi("モバイル表示速度の差", "Mobile Speed Difference"),
  now: bi("現在", "Now"),
  withAstroOptimization: bi("Astro + 画像最適化で", "With Astro + optimization"),
  afterTarget: bi("改善後（目標）", "After (Target)"),
} as const

type CopyMap<T extends Record<string, Bilingual>> = Record<keyof T, string>

function resolve<T extends Record<string, Bilingual>>(map: T, lang: string): CopyMap<T> {
  const l = pickSectionLang(lang)
  const out = {} as CopyMap<T>
  for (const key in map) {
    out[key] = map[key][l]
  }
  return out
}

/** Resolve website-section copy for the given report language. */
export function websiteCopy(lang: string): CopyMap<typeof WEBSITE_SECTION_COPY> {
  return resolve(WEBSITE_SECTION_COPY, lang)
}
