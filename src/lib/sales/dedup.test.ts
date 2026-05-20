/**
 * dedup.test.ts — 正規化キーの単体テスト
 */

import { describe, it, expect } from "vitest"
import { normalizeDomain, normalizeCompanyName } from "./dedup"

describe("normalizeDomain", () => {
  it("www / プロトコル / パス / 大小文字 / ポートを畳む", () => {
    expect(normalizeDomain("https://www.Example.com/contact?q=1")).toBe("example.com")
    expect(normalizeDomain("http://example.com")).toBe("example.com")
    expect(normalizeDomain("WWW.EXAMPLE.CO.JP")).toBe("example.co.jp")
    expect(normalizeDomain("example.com:8080")).toBe("example.com")
  })
  it("www有/無を同一化", () => {
    expect(normalizeDomain("www.x.com")).toBe(normalizeDomain("x.com"))
  })
  it("不正は null", () => {
    expect(normalizeDomain("notadomain")).toBe(null)
    expect(normalizeDomain("")).toBe(null)
    expect(normalizeDomain(null)).toBe(null)
  })
})

describe("normalizeCompanyName", () => {
  it("法人格・空白・全半角を畳んで同名異表記を一致させる", () => {
    const a = normalizeCompanyName("株式会社 ＡＢＣ商事")
    const b = normalizeCompanyName("ABC商事(株)")
    const c = normalizeCompanyName("ＡＢＣ商事")
    expect(a).toBe(b)
    expect(b).toBe(c)
  })
  it("英語法人格を除去", () => {
    expect(normalizeCompanyName("ABC Shoji Co., Ltd.")).toBe(normalizeCompanyName("abc shoji inc"))
  })
  it("空は null", () => {
    expect(normalizeCompanyName("")).toBe(null)
    expect(normalizeCompanyName("　")).toBe(null)
  })
})
