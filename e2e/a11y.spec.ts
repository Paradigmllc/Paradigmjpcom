/**
 * e2e/a11y.spec.ts — WCAG 2.2 AA automated accessibility verification
 *
 * 役割: 主要 public route で axe-core を実行し WCAG 2.2 AA 違反を検知。
 *       カラーコントラスト 4.5:1 / aria-label / heading hierarchy 等を自動チェック。
 *
 * 永久ルール (CC + 5-4):
 *   - WCAG 2.2 AA カラーコントラスト 4.5:1 以上
 *   - インタラクティブ要素に aria-label 必須
 *   - キーボード操作対応
 */

import { test, expect } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

const ROUTES = [
  "/ja",
  "/ja/about",
  "/ja/services",
  "/ja/contact",
  "/ja/faq",
  "/ja/pricing",
  "/ja/blog",
  "/ja/legal",
  "/en",
  "/en/contact",
]

for (const route of ROUTES) {
  test(`${route} has no critical/serious WCAG 2.2 AA violations`, async ({ page }) => {
    await page.goto(route)
    // Wait for fonts + JS hydration to settle so contrast checks reflect final paint.
    await page.waitForLoadState("networkidle")

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      // Decorative video / animation is intentionally non-meaningful (aria-hidden).
      // motion-reduce already handled at CSS layer.
      .disableRules(["region"]) // Region-violation flags are noisy on Aesop layouts; addressed via heading hierarchy.
      .analyze()

    const blocking = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    )
    if (blocking.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `[a11y] ${route} violations:`,
        blocking.map((v) => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          nodes: v.nodes.length,
        })),
      )
    }
    expect(blocking, JSON.stringify(blocking.map((v) => ({ id: v.id, help: v.help })), null, 2)).toEqual([])
  })
}
