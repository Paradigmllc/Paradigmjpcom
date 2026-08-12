// Render a LinkedIn carousel HTML deck to PDF (1080x1350 per page).
// Usage: node docs/knowledge/linkedin/render-carousel.mjs <deck.html>
import { chromium } from "playwright"
import { resolve, dirname, basename } from "node:path"
import { existsSync } from "node:fs"

const input = process.argv[2]
if (!input) {
  console.error("usage: node render-carousel.mjs <deck.html>")
  process.exit(1)
}
const htmlPath = resolve(input)
if (!existsSync(htmlPath)) {
  console.error(`not found: ${htmlPath}`)
  process.exit(1)
}
const pdfPath = resolve(dirname(htmlPath), basename(htmlPath).replace(/\.html$/, ".pdf"))

// ponytail: PLAYWRIGHT_CHROMIUM_PATH lets us reuse an already-downloaded build
// when the version pinned by this playwright release isn't installed yet.
const exe = process.env.PLAYWRIGHT_CHROMIUM_PATH
const browser = await chromium.launch(exe ? { executablePath: exe } : {})
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } })
await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" })
// Google Fonts load async; wait for them so the PDF doesn't fall back to system faces.
await page.evaluate(() => document.fonts.ready)
await page.pdf({
  path: pdfPath,
  width: "1080px",
  height: "1350px",
  printBackground: true,
  pageRanges: "1-",
})
await browser.close()
console.log(pdfPath)
