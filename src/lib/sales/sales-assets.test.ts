import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import { describe, expect, it } from "vitest"

const here = dirname(fileURLToPath(import.meta.url))
const salesAssetsSource = readFileSync(resolve(here, "sales-assets.ts"), "utf8")

const mojibakePattern = /繝|蜍|譛|縺|邯|荳|逶|螟|諡|蛻|蟇|髢|遯|鬚|蝟|繧|譁ｭ|險/

describe("sales asset renderer copy", () => {
  it("does not contain stale mojibake in customer-facing renderers", () => {
    expect(salesAssetsSource).not.toMatch(mojibakePattern)
  })

  it("keeps deck, demo, video, and delivery labels readable", () => {
    expect(salesAssetsSource).toContain("診断データから作成した、実行前提の提案資料")
    expect(salesAssetsSource).toContain("Astroデモサイト")
    expect(salesAssetsSource).toContain("動画ブリーフ")
    expect(salesAssetsSource).toContain("レビュー待ち")
  })
})
