// Local-only E2E: real planning API, never submits a production run.
import assert from "node:assert/strict"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import { chromium } from "@playwright/test"

const base = process.env.EDITORIAL_QA_BASE_URL ?? "http://127.0.0.1:8788"
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Local QA only")
const output = process.env.EDITORIAL_QA_OUTPUT
if (!output) throw new Error("EDITORIAL_QA_OUTPUT is required")
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: "chrome" })
const chapters = [{ id: "opening", title: "導入", shots: [{
  title: "最初の場面", kind: "text_motion", duration_seconds: 5,
  visual_direction: "伝えたい内容を三つの要素に分けて順番に表示",
  headline: "映像・構成・音声", visual_points: ["構成", "映像", "音声"],
}] }]
try {
  for (const [name, viewport] of Object.entries({ desktop: { width: 1440, height: 1000 }, mobile: { width: 390, height: 844 } })) {
    const page = await browser.newPage({ viewport })
    const exceptions = []
    page.on("pageerror", error => exceptions.push(error.message))
    await page.goto(`${base}/console/`)
    await page.getByPlaceholder("API key（未設定環境では空欄）").fill("editorial-local-test")
    await page.getByRole("button", { name: "接続する", exact: true }).click()
    await page.getByRole("button", { name: "02 新しい動画", exact: true }).click()
    for (const [selector, value] of Object.entries({
      "#project-name": "editorial-e2e-local", "#objective": "章台本と音声同期の構造を確認する内部検証",
      "#audience": "動画の制作と品質検証を担当する人", "#duration": "5", "#languages": "ja",
      "#approver-name": "内部検証担当", "#approver-email": "producer@example.com",
      "#editorial-chapters": JSON.stringify(chapters),
    })) await page.locator(selector).fill(value)
    await page.getByRole("button", { name: "課金せず章台本を検証" }).click()
    await page.waitForFunction(() => document.querySelector("#editorial-plan-result")?.textContent.includes("1章 / 1ショット / 5秒"))
    assert.deepEqual(exceptions, [])
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "No horizontal page overflow")
    await page.locator("#editorial-plan-result").scrollIntoViewIfNeeded()
    await page.screenshot({ path: path.join(output, `editorial-${name}-valid.png`) })
    await page.locator("#duration").fill("6")
    await page.getByRole("button", { name: "課金せず章台本を検証" }).click()
    await page.waitForFunction(() => document.querySelector("#editorial-plan-result")?.textContent.includes("合計尺"))
    await page.locator("#editorial-chapters").fill("{")
    await page.getByRole("button", { name: "課金せず章台本を検証" }).click()
    await page.waitForFunction(() => document.querySelector("#editorial-plan-result")?.textContent.includes("JSON形式"))
    assert.equal(await page.locator("#check-editorial-plan").isDisabled(), false)
    await page.screenshot({ path: path.join(output, `editorial-${name}-error.png`) })
    await page.close()
    process.stdout.write(`${name}: planning, duration rejection, JSON error and responsive layout passed\n`)
  }
} finally {
  await browser.close()
}
